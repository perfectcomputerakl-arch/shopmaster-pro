# Implementation status — handoff build

## Included in this package
- Original React + Vite app, Android native wrapper, supplied Shop Master Pro logo, billing/PDF/backup and existing local customer/product pickers retained from the supplied project.
- Inventory Import: CSV/TSV, XLSX/XLS workbook parsing, multiple image selection with local Tesseract.js English OCR, PDF page rendering + local Tesseract OCR, editable preview, duplicate matching and add/replace/skip stock modes.
- Existing browser speech-recognition voice fill retained in bill screen. It can recognize spoken text and match product names; recognition support depends on browser/device and language model. Always review before saving.
- Supabase client initializer and environment configuration; SQL schema for profiles, subscription records, banners, purchase drafts, customers, products, documents and RLS ownership policies.
- Local promotional banner manager retained.
- Optional PaddleOCR FastAPI service and Razorpay server starter under `services/`.

## Not production-complete — do not enable live commerce yet
- Supabase Auth screens and reliable local-to-cloud sync are not yet wired into the app UI.
- Subscription enforcement, admin provisioning, trial abuse controls and Razorpay-to-Supabase activation/webhook reconciliation need implementation and security testing. Payment server intentionally marks subscription sync as pending.
- PaddleOCR service is supplied as a self-hosted backend starter; browser import currently uses Tesseract.js. PaddleOCR is not automatically deployed or connected to the UI.
- OCR extraction is best-effort English text extraction, not guaranteed invoice/table understanding. Hindi/English mixed OCR and robust line-item mapping need review. OCR output must be checked before import.
- Google AdMob native SDK and live ad account/unit integration are not included. Existing in-app promotional banners are separate from AdMob.

## Configuration
- `.env.local` contains the Supabase project URL and publishable key supplied by the owner. Publishable keys are intended for client use only with RLS. Never add Supabase secret/service-role or Razorpay secret keys to Vite variables.
- Run `supabase/schema.sql` in the Supabase SQL Editor before using cloud tables.
- OCR and payment backend setup instructions are in `services/README.md`.

## Verification
- Dependency installation was attempted in the build environment but timed out. Therefore no successful Vite production build or Android build is claimed. Install dependencies and run `npm run build` before deployment. Test import using sample data and verify existing billing, PDF and backup flows before replacing a live app.
