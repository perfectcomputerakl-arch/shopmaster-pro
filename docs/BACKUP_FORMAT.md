# Backup JSON format

Web app backup file top-level keys:

- `businessProfile` (object): id, shopName, ownerName, phone, email, address, gstin, state, pinCode, logo, termsAndConditions, bankDetails, upiId, signatureText
- `appSettings` (object): id, defaultInvoiceTemplate, defaultQuotationTemplate, defaultGstEnabled, defaultGstMode, thermalWidth, invoicePrefix, quotationPrefix, purchasePrefix
- `categories` (list): id, name, description, createdAt
- `products` (list): (empty in sample)
- `customers` (list): (empty in sample)
- `suppliers` (list): (empty in sample)
- `invoices` (list): id, docType, number, date, dueDate, customerId, customerName, customerPhone, customerEmail, customerAddress, customerGstin, gstEnabled, gstMode, subtotal, taxAmount, cgstAmount, sgstAmount, igstAmount, discount, otherCharges, grandTotal, paidAmount, balanceAmount, paymentMode, status, template, notes, terms, affectsStock, createdAt
- `invoiceItems` (list): id, productId, name, sku, description, image, qty, unit, rate, discount, gstPercent, customGst, taxAmount, total, invoiceId
- `quotations` (list): (empty in sample)
- `quotationItems` (list): (empty in sample)
- `purchases` (list): (empty in sample)
- `purchaseItems` (list): (empty in sample)
- `expenses` (list): (empty in sample)
- `payments` (list): (empty in sample)
- `stockTransactions` (list): (empty in sample)
- `customerLedger` (list): (empty in sample)
- `supplierLedger` (list): (empty in sample)
- `ads` (list): promotional banners (id, title, image, url, enabled, start, end, impressions, clicks)
