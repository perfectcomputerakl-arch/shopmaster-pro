# Import & voice status (updated)

- CSV/TSV stock import: implemented (preview, match by SKU/name, merge/replace/skip).
- Excel .xlsx/.xls: implemented using SheetJS (local, in browser).
- PDF/photo OCR: implemented using Tesseract.js in the browser. Note: Tesseract downloads its English language data from a CDN on first use, so first run needs internet. Always review the preview before importing.
- Voice billing: browser SpeechRecognition (hi-IN) in Create Bill. Works in Chrome; usually NOT available inside the Android APK (WebView), and the APK has no mic permission configured.
- Supabase: schema + client file exist; login/sync/subscription are not wired into the UI yet.
