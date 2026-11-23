# SHOPMASTER PRO (web)

Vite + React. Data is stored in browser localStorage.

## Run
npm install
npm run dev

## Features
- Home dashboard (sales, purchases, receivables) and bottom tabs: Home, Bills, Products, Parties, More
- Create Invoice / Quotation (customer, products, GST, bank, signature, notes, terms, payment) with PDF download/print/share
- Create Purchase (vendor, products, stock increases automatically)
- Delivery Challan (no stock change), Credit Note / sales return (stock comes back, customer dues reduce), Sales Order (convert to invoice)
- Products and Services with categories, HSN/SAC, low-stock alert, image, barcode
- Customers (with dues) and Vendors
- Expenses
- Backup & Restore (single JSON file)
- Free / Pro plan: Free adds a watermark to PDFs and has 3 templates; Pro removes the watermark and unlocks all 6 templates

## Plans
See `src/plans.js` to set activation codes (`PRO_CODES`), trial days and a WhatsApp number for the Buy button. This is a soft lock stored in the browser; use a server for real payments.

## Not built yet
See `docs/FEATURES.md`.

## Android APK (GitHub Actions)
1. Is poore folder ko GitHub repo mein upload/push karein (branch `main`).
2. Repo > **Actions** > **Build Android APK** (push par apne aap chalta hai, ya **Run workflow** dabayein).
3. Build khatam hone par (~5-8 min) run kholein > neeche **Artifacts** > `ShopMaster-Pro-APK` download karein.
4. Zip kholein, `app-debug.apk` phone mein install karein (Unknown sources allow karein).

APK mein PDF button dabane par Android ka Share/Save sheet khulta hai (Drive, WhatsApp, Files, etc.).
