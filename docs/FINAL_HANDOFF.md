# Shop Master Pro handoff

This package preserves the source project and adds practical import/OCR and backend starter components. It is not a certified production release.

1. Install frontend packages: `npm install`
2. Run locally: `npm run dev`
3. Verify production compile: `npm run build`
4. Run `supabase/schema.sql` in the Supabase SQL Editor. RLS is enabled on user-owned tables; subscriptions intentionally have no client write policy.
5. For local OCR, the app dynamically loads Tesseract.js and PDF.js when an image/PDF is selected. Excel parsing uses SheetJS. First use requires internet/package bundling at build time; runtime OCR itself runs in the browser.
6. Optional PaddleOCR server setup and Razorpay starter setup are in `services/README.md`.

Before production: wire Supabase Auth and sync UI, complete server-side subscription/payment activation and webhook idempotency, add OCR authentication/rate limits and table-aware extraction, and build/test AdMob with real Android ad unit IDs. Do not use real payments until those tasks are complete.
