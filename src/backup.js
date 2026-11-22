// Backup / Restore helpers. File format = single JSON with these top-level keys:
// businessProfile, appSettings, categories, products, customers, suppliers, invoices, invoiceItems,
// quotations, quotationItems, purchases, purchaseItems, expenses, payments, stockTransactions,
// customerLedger, supplierLedger
const EXTRA_KEYS = ['categories','suppliers','purchases','purchaseItems','payments','stockTransactions','customerLedger','supplierLedger'];
const num = v => Number(v || 0);
const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function docToFile(i, isQuote) {
  const tax = num(i.tax);
  const paidAmt = i.paidAmount != null ? num(i.paidAmount) : (i.status === 'Paid' ? num(i.total) : 0);
  const igst = i.gstMode === 'IGST' ? tax : 0, cg = igst ? 0 : tax / 2;
  return {
    ...(i._orig || {}),
    id: i.id, docType: isQuote ? 'Quotation' : 'Tax Invoice', number: i.number, date: i.date, dueDate: i.dueDate || i.date,
    customerId: i.customerId || '', customerName: i.customer || '', customerPhone: i.phone || '',
    customerEmail: i.email || '', customerAddress: i.address || '', customerGstin: i.gstin || '',
    gstEnabled: !!i.taxEnabled, gstMode: i.gstMode || 'CGST_SGST', subtotal: num(i.subtotal), taxAmount: tax,
    cgstAmount: cg, sgstAmount: cg, igstAmount: igst, discount: num(i.discount), otherCharges: num(i.otherCharges),
    grandTotal: num(i.total), paidAmount: paidAmt, balanceAmount: num(i.total) - paidAmt,
    paymentMode: i.paymentMode || 'Cash', terms: i.terms ?? (i._orig?.terms ?? ''), status: i.status, template: cap(i.template || 'modern'), notes: i.notes || ''
  };
}
function itemsToFile(i, isQuote) {
  return (i.items || []).map((it, n) => {
    const base = num(it.qty) * num(it.price) - num(it.discount), t = base * num(it.gst) / 100;
    return {
      id: `${i.id}-${n}`, productId: it.productId || '', name: it.name, sku: it.sku || '', description: '',
      image: it.image || '', qty: num(it.qty), unit: it.unit || 'pcs', rate: num(it.price), discount: num(it.discount),
      gstPercent: num(it.gst), customGst: false, taxAmount: t, total: base + t,
      [isQuote ? 'quotationId' : 'invoiceId']: i.id
    };
  });
}

export function buildBackup(data) {
  const s = data.shop || {}, x = data.extra || {};
  const invs = (data.invoices || []).filter(i => (i.kind || 'invoice') === 'invoice');
  const quos = (data.invoices || []).filter(i => i.kind === 'quotation');
  const out = {
    businessProfile: {
      id: 'default', shopName: '', ownerName: '', phone: '', email: '', address: '', gstin: '', state: '',
      pinCode: '', logo: '', termsAndConditions: '', bankDetails: '', upiId: '', signatureText: 'Authorized Signatory',
      ...(x.businessProfile || {}),
      shopName: s.name || '', phone: s.phone || '', email: s.email || '', address: s.address || '',
      gstin: s.gstin || '', logo: s.logo || ''
    },
    appSettings: x.appSettings || {
      id: 'default', defaultInvoiceTemplate: 'Modern', defaultQuotationTemplate: 'Modern', defaultGstEnabled: true,
      defaultGstMode: 'CGST_SGST', thermalWidth: '80mm', invoicePrefix: 'INV', quotationPrefix: 'QTN', purchasePrefix: 'PUR'
    },
    categories: x.categories || [],
    products: data.products || [],
    customers: data.customers || [],
    suppliers: x.suppliers || [],
    invoices: invs.map(i => docToFile(i, false)),
    invoiceItems: invs.flatMap(i => itemsToFile(i, false)),
    quotations: quos.map(i => docToFile(i, true)),
    quotationItems: quos.flatMap(i => itemsToFile(i, true)),
    purchases: x.purchases || [],
    purchaseItems: x.purchaseItems || [],
    expenses: data.expenses || [],
    payments: x.payments || [],
    stockTransactions: x.stockTransactions || [],
    customerLedger: x.customerLedger || [],
    supplierLedger: x.supplierLedger || []
  };
  return out;
}

export function parseBackup(text) {
  let d;
  try { d = JSON.parse(text); } catch { throw new Error('File valid JSON nahi hai'); }
  const known = ['businessProfile', 'products', 'customers', 'invoices', 'expenses', 'categories'];
  if (!d || typeof d !== 'object' || !known.some(k => k in d)) throw new Error('Ye ShopMaster backup file nahi lagti');
  const arr = k => (Array.isArray(d[k]) ? d[k] : []);
  const bp = d.businessProfile || {};
  const catMap = Object.fromEntries(arr('categories').map(c => [c.id, c.name]));

  const toInv = (doc, items, isQuote, idKey) => {
    const its = items.filter(it => it[idKey] === doc.id).map(it => ({
      productId: it.productId || '', name: it.name || '', sku: it.sku || '', qty: num(it.qty),
      price: num(it.rate ?? it.price), discount: num(it.discount), gst: num(it.gstPercent ?? it.gst), unit: it.unit || 'pcs', image: it.image || ''
    }));
    return {
      id: doc.id, kind: isQuote ? 'quotation' : 'invoice', number: doc.number, date: doc.date,
      customerId: doc.customerId || '', customer: doc.customerName || 'Walk-in Customer', phone: doc.customerPhone || '',
      email: doc.customerEmail || '', address: doc.customerAddress || '', gstin: doc.customerGstin || '',
      items: its, subtotal: num(doc.subtotal), tax: num(doc.taxAmount), discount: num(doc.discount),
      total: num(doc.grandTotal), status: isQuote ? 'Quotation' : (doc.status || 'Unpaid'), notes: doc.notes || '',
      taxEnabled: !!doc.gstEnabled, gstMode: doc.gstMode || 'CGST_SGST', otherCharges: num(doc.otherCharges), paidAmount: num(doc.paidAmount), paymentMode: doc.paymentMode || 'Cash', terms: doc.terms || '', dueDate: doc.dueDate || doc.date, taxRate: its[0] ? its[0].gst : 0,
      template: String(doc.template || 'Modern').toLowerCase(), _orig: doc
    };
  };

  const extra = { businessProfile: bp, appSettings: d.appSettings || undefined };
  EXTRA_KEYS.forEach(k => { extra[k] = arr(k); });

  return {
    shop: { name: bp.shopName || '', phone: bp.phone || '', address: bp.address || '', gstin: bp.gstin || '', email: bp.email || '', logo: bp.logo || '' },
    products: arr('products').map(p => ({
      ...p, name: p.name || '', sku: p.sku || '',
      category: p.category ?? p.categoryName ?? catMap[p.categoryId] ?? p.categoryId ?? '',
      price: p.price ?? p.sellingPrice ?? p.salePrice ?? p.rate ?? 0,
      purchase: p.purchase ?? p.purchasePrice ?? p.costPrice ?? 0,
      stock: p.stock ?? p.currentStock ?? p.quantity ?? 0,
      gst: p.gst ?? p.gstPercent ?? 18, unit: p.unit || 'pcs', image: p.image || ''
    })),
    customers: arr('customers').map(c => ({ ...c, name: c.name || '', phone: c.phone || '', address: c.address || '' })),
    invoices: [
      ...arr('invoices').map(x => toInv(x, arr('invoiceItems'), false, 'invoiceId')),
      ...arr('quotations').map(x => toInv(x, arr('quotationItems'), true, 'quotationId'))
    ],
    expenses: arr('expenses').map(e => ({
      ...e, title: e.title ?? e.name ?? e.description ?? 'Expense', amount: num(e.amount),
      category: e.category || 'General', date: e.date || '', notes: e.notes || ''
    })),
    extra
  };
}
