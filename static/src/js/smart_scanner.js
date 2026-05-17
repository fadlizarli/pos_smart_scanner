/** @odoo-module **/
import { onMounted, onWillUnmount } from "@odoo/owl";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { AbstractAwaitablePopup } from "@point_of_sale/app/popup/abstract_awaitable_popup";
import { patch } from "@web/core/utils/patch";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { ActionpadWidget } from "@point_of_sale/app/screens/product_screen/action_pad/action_pad";

class SmartScannerPopup extends AbstractAwaitablePopup {
    static template = "pos_smart_scanner.SmartScannerPopup";
    static defaultProps = { confirmText: "Ok", cancelText: "Tutup", title: "Scan" };

    setup() {
        super.setup();
        this.pos = usePos();
        this.active = true;
        this.stream = null;
        this.animFrame = null;
        this.detector = null;
        this._zxingReader = null;
        this.isProcessing = false;
        this.torchOn = false;
        this._canvas = document.createElement("canvas");
        this._ctx = this._canvas.getContext("2d");
        onMounted(() => this._init());
        onWillUnmount(() => this._cleanup());
    }

    _status(msg, color) {
        const el = document.getElementById("ss_status");
        if (el) { el.innerText = msg; el.style.backgroundColor = color; }
    }

    _loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
            const s = document.createElement("script");
            s.src = src;
            s.onload = resolve;
            s.onerror = () => reject(new Error("Gagal memuat library"));
            document.head.appendChild(s);
        });
    }

    async _init() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            const video = document.getElementById("ss_video");
            video.srcObject = this.stream;
            await video.play();
            this._status("Siap. Arahkan barcode ke garis merah.", "#e0e0e0");
            if ("BarcodeDetector" in window) {
                this.detector = new BarcodeDetector({
                    formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a"]
                });
                this._scanNative();
            } else {
                this._scanZxing();
            }
        } catch (e) {
            this._status("Tidak dapat akses kamera: " + e.message, "#f44336");
        }
    }

    async _scanNative() {
        if (!this.active) return;
        if (!this.isProcessing) {
            const video = document.getElementById("ss_video");
            if (video && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
                try {
                    const vw = video.videoWidth;
                    const vh = video.videoHeight;
                    const cropH = Math.floor(vh * 0.30);
                    const cropY = Math.floor(vh * 0.35);
                    this._canvas.width = vw;
                    this._canvas.height = cropH;
                    this._ctx.drawImage(video, 0, cropY, vw, cropH, 0, 0, vw, cropH);
                    const barcodes = await this.detector.detect(this._canvas);
                    if (barcodes.length > 0) {
                        await this._onDetected(barcodes[0].rawValue);
                        return;
                    }
                } catch (e) {}
            }
        }
        this.animFrame = requestAnimationFrame(() => this._scanNative());
    }

    async _scanZxing() {
        try {
            this._status("Memuat ZXing...", "#e0e0e0");
            await this._loadScript(
                "<https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/dist/zxing-browser.min.umd.js>"
            );
            if (!window.ZXing) throw new Error("ZXing tidak tersedia");
            this._zxingReader = new window.ZXing.MultiFormatReader();
            this._status("Siap (ZXing). Arahkan barcode ke garis merah.", "#e0e0e0");
            this._zxingScanLoop();
        } catch (e) {
            this._status("Gagal memuat ZXing: " + e.message, "#f44336");
        }
    }

    _zxingScanLoop() {
        if (!this.active) return;
        if (!this.isProcessing) {
            const video = document.getElementById("ss_video");
            if (video && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
                const vw = video.videoWidth;
                const vh = video.videoHeight;
                const cropH = Math.floor(vh * 0.30);
                const cropY = Math.floor(vh * 0.35);
                this._canvas.width = vw;
                this._canvas.height = cropH;
                this._ctx.drawImage(video, 0, cropY, vw, cropH, 0, 0, vw, cropH);
                try {
                    const lum = new window.ZXing.HTMLCanvasElementLuminanceSource(this._canvas);
                    const bitmap = new window.ZXing.BinaryBitmap(new window.ZXing.HybridBinarizer(lum));
                    const result = this._zxingReader.decode(bitmap);
                    if (result) { this._onDetected(result.getText()); return; }
                } catch (e) {}
            }
        }
        this.animFrame = requestAnimationFrame(() => this._zxingScanLoop());
    }

    async _onDetected(code) {
        if (this.isProcessing || !this.active) return;
        if (!code || code.length < 5) return;
        this.isProcessing = true;
        navigator.vibrate?.(100);
        this._status("Mencari: " + code, "#81c784");
        const video = document.getElementById("ss_video");
        if (video) video.pause();
        try {
            await this._processBarcode(code);
        } catch (e) {
            this._status("Error: " + e.message, "#f44336");
            await new Promise(r => setTimeout(r, 2000));
            this._resetScanner();
        }
    }

    async _processBarcode(code) {
        code = String(code).trim();
        const attempts = [...new Set([code, "0" + code, code.replace(/^0+/, "")])];
        let product = null;
        for (const c of attempts) {
            product = this.pos.db.get_product_by_barcode(c);
            if (product) break;
        }
        if (product) {
            this._status("✓ " + product.display_name, "#4caf50");
            this.pos.get_order().add_product(product);
            await new Promise(r => setTimeout(r, 800));
            this.confirm(code);
        } else {
            this._status("✗ Tidak ditemukan: " + code, "#f44336");
            await new Promise(r => setTimeout(r, 2000));
            this._resetScanner();
        }
    }

    _resetScanner() {
        this.isProcessing = false;
        this._status("Siap. Arahkan barcode berikutnya.", "#e0e0e0");
        const video = document.getElementById("ss_video");
        if (video) video.play();
        if (this.detector) this._scanNative();
        else if (this._zxingReader) this._zxingScanLoop();
    }

    async toggleTorch() {
        const track = this.stream?.getVideoTracks()[0];
        if (!track) return;
        this.torchOn = !this.torchOn;
        try {
            await track.applyConstraints({ advanced: [{ torch: this.torchOn }] });
        } catch (e) {}
    }

    _cleanup() {
        this.active = false;
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        if (this._zxingReader) { try { this._zxingReader.reset(); } catch (e) {} }
        this.stream?.getTracks().forEach(t => t.stop());
    }
}

patch(ProductScreen.prototype, {
    async onClickCameraScan() {
        await this.env.services.popup.add(SmartScannerPopup);
    }
});

patch(ActionpadWidget.prototype, {
    async onClickCameraScan() {
        await this.env.services.popup.add(SmartScannerPopup);
    }
});

export { SmartScannerPopup };
