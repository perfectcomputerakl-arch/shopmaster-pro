# SHOPMASTER PRO

Vite + React shop management app.

## Features
- Product inventory with image, SKU, category, brand, purchase/selling price and stock.
- Customer records.
- Invoice creation with optional manually enabled GST and selectable PDF layouts (Classic, Modern, Minimal).
- Quotation creation (does not deduct stock).
- Saved document actions: PDF download, print, and device share where supported by the browser.
- Shop logo shown in the dashboard/profile area and included in generated PDFs.
- Other Expenses tab with date, category, amount and notes.
- Data is stored in browser localStorage.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Note: PDF share uses the Web Share API when supported; otherwise it downloads the PDF. Print opens a PDF preview in a new browser tab, so pop-ups must be allowed.
