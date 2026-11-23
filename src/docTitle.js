export const isPaymentDoc = inv => (inv.kind || 'invoice') === 'invoice';
export function docTitle(inv) {
  const k = inv.kind || 'invoice';
  return { quotation: 'QUOTATION', challan: 'DELIVERY CHALLAN', creditnote: 'CREDIT NOTE', salesorder: 'SALES ORDER' }[k] || (inv.taxEnabled ? 'TAX INVOICE' : 'INVOICE');
}
