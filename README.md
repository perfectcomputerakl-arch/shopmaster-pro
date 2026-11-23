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
