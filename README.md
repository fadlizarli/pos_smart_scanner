# POS Smart Scanner
# # POS Smart Scanner

Modul Odoo 17 untuk scanner barcode cepat di Point of Sale, menggunakan **BarcodeDetector API** (Android Chrome) dengan fallback **Quagga2** (iPhone/browser lain).

---

## Fitur

- **Deteksi instan** – BarcodeDetector API memanfaatkan hardware acceleration di Android Chrome
- **Scan area terbatas** – hanya membaca barcode dalam kotak merah, bukan seluruh layar
- **Fallback Quagga2** – otomatis beralih ke Quagga2 jika BarcodeDetector tidak tersedia (iPhone)
- **Laser line UI** – tampilan kotak scan dengan garis merah animasi seperti scanner profesional
- **Auto torch** – tombol senter untuk kondisi cahaya kurang
- **Vibrate feedback** – getaran singkat saat barcode terdeteksi
- **Tombol Scan Barcode** – tombol penuh di atas numpad (mobile) dan di control bar (desktop)

---

## Format Barcode yang Didukung

- EAN-13 *(default onderdil motor)*
- EAN-8
- Code 128
- Code 39
- UPC-A

---

## Cara Kerja

```
Kamera ──► crop 30% tengah frame ──► BarcodeDetector ──► cari produk ──► tambah ke order
                (35% – 65%)              atau Quagga2
```

Hanya area tengah frame (yang ada di dalam kotak merah) yang di-scan, sehingga tidak terbaca barcode di luar kotak.

---

## Instalasi

### Requirement

- Odoo 17
- Module `point_of_sale`
- Android Chrome (untuk BarcodeDetector) atau browser dengan Quagga2

### Langkah

```bash
# Copy ke folder custom addons
cp -r pos_smart_scanner/ /opt/odoo/custom-addons/

# Restart Odoo
sudo systemctl restart odoo
```

Lalu di Odoo:
1. Aktifkan **Developer Mode** (Settings → Activate Developer Mode)
2. Buka **Apps** → cari `POS Smart Scanner`
3. Klik **Install**

---

## Struktur File

```
pos_smart_scanner/
├── __manifest__.py
├── __init__.py
└── static/src/
    ├── js/
    │   └── smart_scanner.js      # Logic scanner + BarcodeDetector + Quagga2
    ├── xml/
    │   └── smart_scanner.xml     # Template OWL popup + tombol di ProductScreen
    └── css/
        └── smart_scanner.css     # UI overlay, kotak scan, laser line, tombol
```

---

## Kompatibilitas

| Platform | Browser | Engine |
|---|---|---|
| Android | Chrome | BarcodeDetector API ✅ |
| iPhone | Safari / Chrome | Quagga2 ✅ |
| Desktop | Chrome / Firefox | BarcodeDetector / Quagga2 ✅ |

---

## Dependensi

- `point_of_sale` (bawaan Odoo 17)
- Quagga2 – opsional, load dari CDN jika diperlukan untuk fallback iPhone

---

## Lisensi

LGPL-3

