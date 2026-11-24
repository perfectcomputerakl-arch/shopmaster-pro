# Feature checklist (ShopMaster Pro vs reference billing app)

## Done
- Home dashboard, bottom tabs (Home, Bills, Products, Parties, More)
- Invoice / Quotation / Purchase creation (GST, discount, other charges, bank, UPI QR, signature, notes, terms, payment status)
- 6 PDF templates, amount in words, HSN summary, PDF download / print / share
- Products & Services (categories, HSN/SAC, low-stock alert, image, barcode), stock updates on bill/purchase
- Customers (with dues), Vendors, Expenses
- Delivery Challan, Credit Note (restocks and reduces dues), Sales Order (convert to invoice)
- Backup & Restore (single JSON), Free / Pro plan with watermark

## Not built yet
### Documents
Pro Forma, Sales Debit Note, Purchase Order, Purchase Return / Debit Note, Indirect Income, E-way Bill, E-Invoice, POS Billing, Packing List, Online Orders
### Billing options
Custom fields, dispatch/shipping address, reference no., export/SEZ and multi-currency invoices, TDS, attachments, bulk invoicing via Excel, recurring invoices
### Products
Cess, "not for sale", max discount, opening purchase price / stock value, multiple price lists, combos, free quantity, batches & expiry, serial numbers, product grouping, multiple warehouses, barcode scanner
### Parties
Party ledger / statement, "You gave / You got" payments, pending-invoices view, WhatsApp / call / share buttons, import from phone contacts, party grouping
### Money & reports
Payments module, bank reconciliation, GSTR-1 / GSTR-2B, 40+ reports, insights, reminders, coupons
### Settings & business
Document settings, preferences, invoice template gallery, multiple bank accounts, signature / stamp image, saved notes & terms, app theme, app lock, users & roles, user activity, multiple businesses
### Integrations
Payment gateways (Razorpay, Cashfree, PayU), online store, Shopify, Shiprocket, APIs / webhooks, downloads, desktop version

## Advertisement Manager (new in this package)
- Manage own promotional banner images, title, destination URL, and optional start/end dates.
- Enable/pause/delete banners from the Advertisements page (also available under More).
- The first active banner is displayed on the Dashboard; local impression and click counters are recorded.
- This is a local-device banner manager. It is not yet a cloud-synced multi-admin campaign manager.
- Google AdMob SDK is not integrated in this web package. Android AdMob App ID, Ad Unit ID, consent flow, and native SDK integration are still required before serving live AdMob ads.
