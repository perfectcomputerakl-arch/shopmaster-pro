# Optional server services

## PaddleOCR
`cd services/ocr-api && python -m venv .venv && pip install -r requirements.txt && uvicorn main:app --host 127.0.0.1 --port 8090`

The local browser OCR currently uses Tesseract.js for photos and PDF pages. PaddleOCR is provided as a self-hosted backend option for better table/document extraction; the UI does not call it until an authenticated deployment URL is configured. Add authentication, TLS, rate limits and private network controls before public deployment. This backend accepts image files only; render PDF pages to images first.

## Razorpay
`cd services/payment-api && npm install && RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... RAZORPAY_WEBHOOK_SECRET=... node server.js`

Do not put any Razorpay secret or Supabase service-role key in Vite variables. The included API is a starter: the Supabase subscription update, webhook event idempotency, user ownership checks and production webhook reconciliation must be implemented and tested before accepting live payments.
