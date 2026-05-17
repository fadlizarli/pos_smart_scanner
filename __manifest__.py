{
    'name': 'POS Smart Scanner',
    'version': '17.0.1.0.0',
    'category': 'Point of Sale',
    'summary': 'Scanner barcode cepat - BarcodeDetector API + Quagga2 fallback',
    'depends': ['point_of_sale'],
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_smart_scanner/static/src/css/smart_scanner.css',
            'pos_smart_scanner/static/src/xml/smart_scanner.xml',
            'pos_smart_scanner/static/src/js/smart_scanner.js',
        ],
    },
    'installable': True,
    'auto_install': False,
    'license': 'LGPL-3',
}
