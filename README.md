# SHOPMASTER PRO

A responsive business-management starter app for independent shops.

## Included in this first working version
- Dashboard with sales, invoice, customer and product counts
- Product and stock list (editable)
- Customer directory (editable)
- Shop profile with logo upload and business details
- Quick draft invoice creation and branded PDF download
- Payment status tracking
- Mobile-responsive layout
- Browser local storage persistence

## Run locally
1. Install Node.js 20 or newer.
2. Extract this ZIP and open the project folder in a terminal.
3. Run `npm install`
4. Run `npm run dev`
5. Open the local address shown by Vite.

## Build
Run `npm run build`. The production files are created in `dist/`.

## Important scope note
This is the initial UI/prototype milestone. Data is currently stored in the browser on the device. It is **not yet a multi-user cloud SaaS**: users on different devices do not share data, and there is no login, cloud database, role system, subscription billing, GST-compliant invoice validation, or automated backups yet. Do not use it as the sole accounting record system.

## Planned next milestone
Connect a secure Cloudflare Worker + D1 backend with tenant-isolated shop accounts, authentication, product/customer/invoice APIs, stock ledger, and backups. Then add a proper invoice editor with multiple line items, discounts, round-off, CGST/SGST/IGST, payment entries, purchase bills, supplier records, expenses, reports, and subscription plans.

## Suggested GitHub repository
`shopmaster-pro`
