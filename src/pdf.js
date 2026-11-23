import { jsPDF } from 'jspdf';
import { makeGstPDF } from './pdfGst.js';
import { docTitle } from './docTitle.js';

const rs = n => 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const COLORS = { classic: [30, 41, 59], modern: [29, 92, 255], minimal: [20, 130, 120] };

async function build(inv, shop, bp = {}) {
  const doc = new jsPDF();
  if (['boxed', 'clean', 'compact'].includes(inv.template)) return makeGstPDF(doc, inv, shop, bp);
  const color = COLORS[inv.template] || COLORS.modern;
  const isQuote = (inv.kind || 'invoice') !== 'invoice';
  const title = docTitle(inv);
  let y = 16;
  const ensure = h => { if (y + h > 280) { doc.addPage(); y = 18; } };

  if (inv.template === 'modern') { doc.setFillColor(...color); doc.rect(0, 0, 210, 30, 'F'); doc.setTextColor(255); } else { doc.setTextColor(...color); }
  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.text(title, 14, 19);
  doc.setTextColor(25, 35, 45);
  if (shop.logo) { try { doc.addImage(shop.logo, shop.logo.startsWith('data:image/png') ? 'PNG' : 'JPEG', 165, inv.template === 'modern' ? 34 : 8, 30, 24); } catch { /* ignore bad logo */ } }
  y = 40;
  doc.setFontSize(13); doc.text(shop.name || 'YOUR SHOP NAME', 14, y); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  const lines = doc.splitTextToSize([shop.address, shop.phone && `Phone: ${shop.phone}`, shop.email, shop.gstin && `GSTIN: ${shop.gstin}`].filter(Boolean).join('  |  '), 140);
  doc.text(lines, 14, y + 6); y += 6 + lines.length * 4.5 + 4;
  doc.setDrawColor(210); doc.line(14, y, 196, y); y += 7;

  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('Bill To', 14, y); doc.text('Details', 130, y); doc.setFont('helvetica', 'normal');
  const cust = [inv.customer, inv.phone && `Phone: ${inv.phone}`, inv.address, inv.gstin && `GSTIN: ${inv.gstin}`].filter(Boolean);
  doc.text(doc.splitTextToSize(cust.join('\n'), 100), 14, y + 6);
  doc.text([`No: ${inv.number}`, `Date: ${inv.date}`, !isQuote && inv.dueDate ? `Due: ${inv.dueDate}` : ''].filter(Boolean), 130, y + 6);
  y += 8 + Math.max(cust.length, 3) * 5 + 4;

  const cols = { n: 16, item: 24, qty: 108, rate: 124, disc: 148, gst: 164, amt: 194 };
  const header = () => { doc.setFillColor(...color); doc.rect(14, y - 5, 182, 8, 'F'); doc.setTextColor(255); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('#', cols.n, y); doc.text('Item', cols.item, y); doc.text('Qty', cols.qty, y); doc.text('Rate', cols.rate, y); doc.text('Disc', cols.disc, y); doc.text('GST', cols.gst, y); doc.text('Amount', cols.amt, y, { align: 'right' });
    doc.setTextColor(25, 35, 45); doc.setFont('helvetica', 'normal'); y += 8; };
  header();
  (inv.items || []).forEach((it, i) => {
    const base = Number(it.qty) * Number(it.price) - Number(it.discount || 0);
    const g = inv.taxEnabled ? Number(it.gst ?? inv.taxRate ?? 0) : 0;
    const name = doc.splitTextToSize(String(it.name || ''), 80);
    ensure(name.length * 4.5 + 4); if (y === 18) header();
    doc.text(String(i + 1), cols.n, y); doc.text(name, cols.item, y);
    doc.text(`${it.qty} ${it.unit || ''}`.trim(), cols.qty, y); doc.text(rs(it.price).replace('Rs. ', ''), cols.rate, y);
    doc.text(Number(it.discount || 0) ? rs(it.discount).replace('Rs. ', '') : '-', cols.disc, y); doc.text(inv.taxEnabled ? `${g}%` : '-', cols.gst, y);
    doc.text(rs(base * (1 + g / 100)).replace('Rs. ', ''), cols.amt, y, { align: 'right' });
    y += name.length * 4.5 + 2.5;
  });
  doc.line(14, y - 1, 196, y - 1); y += 6;

  const row = (label, val, bold) => { ensure(7); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(bold ? 12 : 10); doc.text(label, 130, y); doc.text(val, 194, y, { align: 'right' }); y += bold ? 8 : 6; };
  row('Subtotal', rs(inv.subtotal));
  if (Number(inv.discount)) row('Discount', '- ' + rs(inv.discount));
  if (inv.taxEnabled) {
    if (inv.gstMode === 'IGST') row('IGST', rs(inv.tax));
    else { row('CGST', rs(Number(inv.tax) / 2)); row('SGST', rs(Number(inv.tax) / 2)); }
  }
  if (Number(inv.otherCharges)) row('Other Charges', rs(inv.otherCharges));
  row('Grand Total', rs(inv.total), true);
  if (!isQuote && Number(inv.paidAmount)) { row('Paid', rs(inv.paidAmount)); row('Balance', rs(Number(inv.total) - Number(inv.paidAmount)), true); }

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); y += 2;
  const block = (label, text) => { if (!text) return; const t = doc.splitTextToSize(String(text), 180); ensure(t.length * 4.2 + 8); doc.setFont('helvetica', 'bold'); doc.text(label, 14, y); doc.setFont('helvetica', 'normal'); y += 4.5; doc.text(t, 14, y); y += t.length * 4.2 + 3; };
  const bank = inv.bankDetails ?? bp.bankDetails, upi = inv.upiId ?? bp.upiId;
  block('Payment', [inv.paymentMode && `Mode: ${inv.paymentMode}`, bank, upi && `UPI: ${upi}`].filter(Boolean).join('\n'));
  block('Notes', inv.notes);
  block('Terms & Conditions', inv.terms);
  ensure(24); y += 8; doc.line(140, y, 196, y); doc.text(inv.signature || bp.signatureText || 'Authorized Signatory', 168, y + 5, { align: 'center' });
  return doc;
}

export function addWatermark(doc, text = 'Created with ShopMaster Pro') {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.13 }));
    doc.setFont('helvetica', 'bold'); doc.setFontSize(34); doc.setTextColor(80, 80, 80);
    const w = doc.getTextWidth(text), a = 35 * Math.PI / 180;
    doc.text(text, 105 - (w / 2) * Math.cos(a), 150 + (w / 2) * Math.sin(a), { angle: 35 });
    doc.restoreGraphicsState();
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(110, 110, 110);
    doc.text('Created with ShopMaster Pro (Free plan)', 105, 295, { align: 'center' });
  }
  return doc;
}

export async function makeInvoicePDF(inv, shop, bp = {}, opts = {}) {
  const doc = await build(inv, shop, bp);
  if (opts.watermark) addWatermark(doc);
  return doc;
}
