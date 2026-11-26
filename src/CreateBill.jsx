import React, { useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, Plus, Minus, Search, X, User, Package, Trash2, ChevronRight, Landmark, PenLine, StickyNote, ScrollText, Mic, MicOff } from 'lucide-react';

const uid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const num = v => Number(v) || 0;
const MODES = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'];

// Voice typing language. 'en-IN' = English (India) so speech is typed in English letters, not Devanagari.
const VOICE_LANG = 'en-IN';

function nextNumber(list, prefix) {
  let max = 0;
  list.forEach(i => { const m = String(i.number || '').match(new RegExp('^' + prefix + '-(\\d+)$')); if (m) max = Math.max(max, Number(m[1])); });
  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
}

export default function CreateBill({ data, kind, today, onCancel, onSave, isPro, addCustomer, addVendor, addProduct, saveProfile, notify }) {
  const isPurchase = kind === 'purchase', isChallan = kind === 'challan', hasPay = kind === 'invoice' || kind === 'purchase';
  const TITLE = { quotation: 'Quotation', challan: 'Delivery Challan', creditnote: 'Credit Note', salesorder: 'Sales Order', purchase: 'Purchase', invoice: 'Invoice' }[kind] || 'Invoice';
  const P = isPurchase ? 'Vendor' : 'Customer';
  const parties = isPurchase ? (data.extra?.suppliers || []) : data.customers;
  const addParty = isPurchase ? addVendor : addCustomer;
  const bp = data.extra?.businessProfile || {}, st = data.extra?.appSettings || {};
  const docs = isPurchase ? (data.extra?.purchases || []) : data.invoices.filter(i => (i.kind || 'invoice') === kind);
  const [number, setNumber] = useState(nextNumber(docs, { quotation: st.quotationPrefix || 'QTN', challan: st.challanPrefix || 'DC', creditnote: st.creditNotePrefix || 'CN', salesorder: st.salesOrderPrefix || 'SO', purchase: st.purchasePrefix || 'PUR' }[kind] || st.invoicePrefix || 'INV'));
  const [date, setDate] = useState(today);
  const [dueDate, setDueDate] = useState(today);
  const [supInv, setSupInv] = useState('');
  const [supInvDate, setSupInvDate] = useState(today);
  const [customer, setCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [gstOn, setGstOn] = useState(isChallan ? false : (st.defaultGstEnabled ?? false));
  const [gstMode, setGstMode] = useState(st.defaultGstMode || 'CGST_SGST');
  const [discount, setDiscount] = useState('');
  const [other, setOther] = useState('');
  const [mode, setMode] = useState('Cash');
  const [bankDetails, setBankDetails] = useState(bp.bankDetails || '');
  const [upiId, setUpiId] = useState(bp.upiId || '');
  const [signature, setSignature] = useState(bp.signatureText || 'Authorized Signatory');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState(bp.termsAndConditions || '');
  const [template, setTemplate] = useState(String(kind === 'quotation' ? st.defaultQuotationTemplate || 'Modern' : st.defaultInvoiceTemplate || 'Modern').toLowerCase());
  const [paidFull, setPaidFull] = useState(false);
  const [paidPart, setPaidPart] = useState('');
  const [sheet, setSheet] = useState(null);
  const [q, setQ] = useState('');
  const [newC, setNewC] = useState(null);
  const [custom, setCustom] = useState(null);
  const [saveDefault, setSaveDefault] = useState(true);
  const [voiceText,setVoiceText]=useState('');
  const [listening,setListening]=useState(false);

  const calc = useMemo(() => {
    let subtotal = 0, tax = 0;
    items.forEach(it => { const base = num(it.qty) * num(it.price) - num(it.discount); subtotal += base; if (gstOn) tax += base * num(it.gst) / 100; });
    const total = Math.max(0, subtotal + tax - num(discount) + num(other));
    return { subtotal, tax, total };
  }, [items, gstOn, discount, other]);

  const dueOf = n => isPurchase ? (data.extra?.purchases || []).filter(p => p.vendorName === n && p.status !== 'Paid').reduce((t, p) => t + num(p.balanceAmount), 0) : Math.max(0, data.invoices.filter(i => (i.kind || 'invoice') === 'invoice' && i.customer === n && i.status !== 'Paid').reduce((t, i) => t + num(i.total) - num(i.paidAmount), 0) - data.invoices.filter(i => i.kind === 'creditnote' && i.customer === n).reduce((t, i) => t + num(i.total), 0));
  const patch = (key, p) => setItems(list => list.map(x => (x.key === key ? { ...x, ...p } : x)));
  const qtyOf = pid => items.find(x => x.productId === pid)?.qty || 0;
  const setProductQty = (p, delta) => {
    const cur = items.find(x => x.productId === p.id);
    if (!cur) { if (delta > 0) setItems(l => [...l, { key: uid(), productId: p.id, name: p.name, sku: p.sku || '', qty: 1, hsn: p.hsn || '', unit: p.unit || 'pcs', price: isPurchase ? num(p.purchase) : num(p.price), gst: p.gst === '' || p.gst == null ? 18 : num(p.gst), discount: 0, image: '' }]); return; }
    const nq = num(cur.qty) + delta;
    setItems(l => (nq <= 0 ? l.filter(x => x.key !== cur.key) : l.map(x => (x.key === cur.key ? { ...x, qty: nq } : x))));
  };
  const addCustom = () => {
    if (!custom.name.trim() || num(custom.price) <= 0) { notify('Item ka naam aur rate bharein'); return; }
    let productId = '';
    if (custom.save) { productId = uid(); addProduct({ id: productId, name: custom.name.trim(), sku: '', category: '', brand: '', description: '', hsn: custom.hsn || '', price: isPurchase ? 0 : num(custom.price), purchase: isPurchase ? num(custom.price) : '', stock: '', gst: String(num(custom.gst)), unit: custom.unit || 'pcs', barcode: '', image: '' }); }
    setItems(l => [...l, { key: uid(), productId, name: custom.name.trim(), sku: '', qty: num(custom.qty) || 1, hsn: custom.hsn || '', unit: custom.unit || 'pcs', price: num(custom.price), gst: num(custom.gst), discount: 0, image: '' }]);
    setCustom(null);
  };
  const saveNewCustomer = () => {
    if (!newC.name.trim()) { notify('Customer ka naam bharein'); return; }
    const c = { id: uid(), name: newC.name.trim(), phone: newC.phone, email: '', address: newC.address, gstin: newC.gstin, city: '', state: '' };
    addParty(c); setCustomer(c); setNewC(null); setSheet(null);
  };

  const create = () => {
    if (!items.length) { notify('Kam se kam ek product ya item chunen'); return; }
    if (!number.trim()) { notify('Document number bharein'); return; }
    const tax = gstOn ? calc.tax : 0;
    const paid = !hasPay ? 0 : paidFull ? calc.total : Math.min(calc.total, num(paidPart));
    const status = !hasPay ? { quotation: 'Quotation', challan: 'Challan', creditnote: 'Credit Note', salesorder: 'Open' }[kind] : paid >= calc.total && calc.total > 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';
    if (saveDefault) saveProfile({ bankDetails, upiId, signatureText: signature, termsAndConditions: terms });
    const party = customer && !customer.id ? { ...customer, id: uid() } : customer;
    if (party && !customer?.id) addParty(party);
    onSave({
      id: uid(), kind, number: number.trim(), date, dueDate,
      customerId: party?.id || '', customer: party?.name || (isPurchase ? 'Unknown Vendor' : 'Walk-in Customer'), supplierInvoiceNo: supInv, supplierInvoiceDate: supInvDate, phone: party?.phone || '', email: party?.email || '',
      address: party?.address || '', gstin: party?.gstin || '',
      items: items.map(({ key, image, ...it }) => ({ ...it, qty: num(it.qty), price: num(it.price), gst: num(it.gst), discount: num(it.discount) })),
      subtotal: calc.subtotal, tax, discount: num(discount), otherCharges: num(other), total: calc.total,
      paidAmount: paid, status, paymentMode: mode, bankDetails, upiId, signature, notes, terms,
      placeOfSupply: party?.state || bp.state || '', taxEnabled: gstOn, gstMode, taxRate: num(items[0]?.gst), template
    });
  };

  const applyVoice = (spoken) => {
    const text=String(spoken||'').trim(); if(!text)return; setVoiceText(text); const lower=text.toLowerCase();
    const phone=(text.match(/(?:\+?91[\s-]?)?[6-9]\d{9}/)||[])[0]||'';
    let foundCustomer=parties.find(c=>c.name&&lower.includes(c.name.toLowerCase()));
    if(foundCustomer)setCustomer(foundCustomer); else { const cleaned=text.replace(phone,'').replace(/\b(customer|mobile|phone|number|bill|invoice|please|add|create)\b/gi,' ').trim(); const name=cleaned.split(/[,;] /)[0].trim(); if(name&&name.length>2&&!/\d{5,}/.test(name))setCustomer({id:'',name,phone,email:'',address:'',gstin:''}); }
    let matched=0; data.products.forEach(p=>{if(!p.name||!lower.includes(p.name.toLowerCase()))return;const escaped=p.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const m=text.match(new RegExp('(?:'+escaped+')\\s*(?:quantity|qty)?\\s*(?:is|of|:)?\\s*(\\d+(?:\\.\\d+)?)','i'))||text.match(new RegExp('(\\d+(?:\\.\\d+)?)\\s*(?:piece|pieces|pcs|unit)?\\s*(?:of)?\\s*'+escaped,'i'));const qty=m?Number(m[1]):1;setItems(list=>{const old=list.find(x=>x.productId===p.id);if(old)return list.map(x=>x.productId===p.id?{...x,qty:num(x.qty)+qty}:{...x});return [...list,{key:uid(),productId:p.id,name:p.name,sku:p.sku||'',qty,hsn:p.hsn||'',unit:p.unit||'pcs',price:isPurchase?num(p.purchase):num(p.price),gst:p.gst==null?18:num(p.gst),discount:0,image:''}]});matched++});
    notify(matched?`Voice se ${matched} product add hua. Bill check karein.`:'Voice text mil gaya. Customer/product ko manually verify ya select karein.');
  };
  const startVoice=async()=>{
    if(listening)return;
    // Android APK: WebView has no SpeechRecognition, so use the native speech plugin (Google voice dialog).
    if(Capacitor.isNativePlatform()){
      try{
        const {SpeechRecognition}=await import('@capacitor-community/speech-recognition');
        const {available}=await SpeechRecognition.available();
        if(!available){notify('Is phone me speech service nahi mili. Google app / Speech Services update karein.');return}
        let perm=await SpeechRecognition.checkPermissions();
        if(perm.speechRecognition!=='granted')perm=await SpeechRecognition.requestPermissions();
        if(perm.speechRecognition!=='granted'){notify('Microphone permission allow karein');return}
        setListening(true);
        const r=await SpeechRecognition.start({language:VOICE_LANG,maxResults:1,prompt:'Customer, mobile, product aur quantity boliye',partialResults:false,popup:true});
        if(r?.matches?.[0])applyVoice(r.matches[0]);else notify('Kuch sunai nahi diya, dobara try karein');
      }catch(e){notify('Voice input nahi mila. Microphone permission check karein.')}
      finally{setListening(false)}
      return;
    }
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){notify('Is browser mein voice typing support nahi hai. Android Chrome mein try karein.');return}
    const rec=new SR();rec.lang=VOICE_LANG;rec.interimResults=false;rec.maxAlternatives=1;setListening(true);
    rec.onresult=e=>applyVoice(e.results[0][0].transcript);
    rec.onerror=()=>notify('Voice input nahi mila. Microphone permission check karein.');
    rec.onend=()=>setListening(false);rec.start();
  };

  const prods = data.products.filter(p => `${p.name} ${p.sku} ${p.category} ${p.barcode || ''}`.toLowerCase().includes(q.toLowerCase()));
  // Barcode scanner (USB/Bluetooth) types the code + Enter: exact barcode/SKU match adds the item automatically.
  const scanEnter = e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const code = q.trim().toLowerCase();
    if (!code) return;
    const hit = data.products.find(p => (p.barcode && String(p.barcode).trim().toLowerCase() === code) || (p.sku && String(p.sku).trim().toLowerCase() === code));
    if (hit) { setProductQty(hit, 1); setQ(''); notify(hit.name + ' add hua'); }
    else if (prods.length === 1) { setProductQty(prods[0], 1); setQ(''); }
    else notify('Is barcode ka product nahi mila');
  };
  const custs = parties.filter(c => `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase()));
  const row = (Icon, label, value, onClick) => (
    <button className="cb-row" onClick={onClick}><Icon size={19} /><div><small>{label}</small><b>{value || '—'}</b></div><ChevronRight size={18} /></button>
  );
  const close = () => { setSheet(null); setQ(''); setNewC(null); setCustom(null); };

  return (
    <div className="cb-screen">
      <header className="cb-head"><button className="icon-btn" onClick={onCancel}><ArrowLeft /></button><h2>Create {TITLE}</h2><button className="secondary" onClick={startVoice}><Mic size={16}/> {listening?'Listening…':'Voice Fill'}</button></header>
      <section className="cb-card"><small className="muted">Voice example: ‘Rahul 9876543210, Dell Latitude 7490 two pieces’</small>{voiceText&&<p><b>Heard:</b> {voiceText}</p>}<button className="cb-add" onClick={startVoice}>{listening?<MicOff size={18}/>:<Mic size={18}/>} {listening?'Listening…':'Speak customer, mobile, product and quantity'}</button></section>
      <div className="cb-body">
        <section className="cb-card">
          <div className="cb-two"><label>{TITLE} No.<input value={number} onChange={e => setNumber(e.target.value)} /></label><label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label></div>
          {isPurchase && <div className="cb-two"><label>Supplier Invoice No.<input value={supInv} onChange={e => setSupInv(e.target.value)} /></label><label>Supplier Invoice Date<input type="date" value={supInvDate} onChange={e => setSupInvDate(e.target.value)} /></label></div>}
          {hasPay && <label>Due Date<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></label>}
        </section>

        <section className="cb-card">
          <h4>{P}</h4>
          {customer ? (
            <div className="cb-selected"><div><b>{customer.name}</b><small>{customer.phone}</small></div><button className="text-btn" onClick={() => setSheet('customer')}>Change</button><button className="icon-btn" onClick={() => setCustomer(null)}><X size={16} /></button></div>
          ) : <button className="cb-add" onClick={() => setSheet('customer')}><Plus size={18} /> Select {P}</button>}
          {!customer && !isPurchase && <small className="muted">Bina customer chune bill "Walk-in Customer" ke naam se banega.</small>}
        </section>

        <section className="cb-card">
          <h4>Products</h4>
          {items.map(it => (
            <div className="cb-item" key={it.key}>
              <div className="cb-item-top"><b>{it.name}</b><button className="danger-icon" onClick={() => setItems(l => l.filter(x => x.key !== it.key))}><Trash2 size={15} /></button></div>
              <div className="cb-grid4">
                <label>Qty<input type="number" min="0" value={it.qty} onChange={e => patch(it.key, { qty: e.target.value })} /></label>
                <label>Rate<input type="number" min="0" value={it.price} onChange={e => patch(it.key, { price: e.target.value })} /></label>
                <label>Disc ₹<input type="number" min="0" value={it.discount} onChange={e => patch(it.key, { discount: e.target.value })} /></label>
                <label>GST %<input type="number" min="0" disabled={!gstOn} value={gstOn ? it.gst : 0} onChange={e => patch(it.key, { gst: e.target.value })} /></label>
              </div>
              <small className="muted">Amount: {money((num(it.qty) * num(it.price) - num(it.discount)) * (1 + (gstOn ? num(it.gst) : 0) / 100))}</small>
            </div>
          ))}
          <button className="cb-add" onClick={() => setSheet('product')}><Plus size={18} /> {items.length ? 'Add More Products' : 'Select Products'}</button>
        </section>

        <section className="cb-card" style={isChallan ? { display: "none" } : undefined}>
          <h4>Tax</h4>
          <div className="cb-seg"><button className={gstOn ? 'on' : ''} onClick={() => setGstOn(true)}>With GST</button><button className={!gstOn ? 'on' : ''} onClick={() => setGstOn(false)}>Without GST</button></div>
          {gstOn && <div className="cb-seg"><button className={gstMode === 'CGST_SGST' ? 'on' : ''} onClick={() => setGstMode('CGST_SGST')}>CGST + SGST</button><button className={gstMode === 'IGST' ? 'on' : ''} onClick={() => setGstMode('IGST')}>IGST</button></div>}
          <div className="cb-two"><label>Discount ₹<input type="number" min="0" value={discount} onChange={e => setDiscount(e.target.value)} /></label><label>Other Charges ₹<input type="number" min="0" value={other} onChange={e => setOther(e.target.value)} /></label></div>
        </section>

        <section className="cb-card">
          <h4>More</h4>
          {row(Landmark, 'Bank / Payment', `${mode}${bankDetails ? ' · bank details added' : ''}`, () => setSheet('bank'))}
          {row(PenLine, 'Signature', signature, () => setSheet('signature'))}
          {row(StickyNote, 'Notes', notes, () => setSheet('notes'))}
          {row(ScrollText, 'Terms & Conditions', terms ? terms.split('\n')[0].slice(0, 40) : '', () => setSheet('terms'))}
          {!isPurchase && <label>PDF Template<select value={template} onChange={e => setTemplate(e.target.value)}><option value="modern">Modern</option><option value="classic">Classic</option><option value="minimal">Minimal</option><option value="boxed" disabled={!isPro}>Boxed GST (full borders){isPro ? '' : ' - Pro'}</option><option value="clean" disabled={!isPro}>Clean GST (open layout){isPro ? '' : ' - Pro'}</option><option value="compact" disabled={!isPro}>Compact (services){isPro ? '' : ' - Pro'}</option></select>{!isPro && <small className="muted">Free plan: 3 basic templates and watermark on PDF. Pro mein sab templates, no watermark.</small>}</label>}
        </section>

        {hasPay && (
          <section className="cb-card">
            <h4>{isPurchase ? 'Payment to vendor' : 'Payment'}</h4>
            <label className="cb-check"><input type="checkbox" checked={paidFull} onChange={e => setPaidFull(e.target.checked)} /> {isPurchase ? 'Mark as fully paid' : 'Mark as fully paid'} ({mode})</label>
            {!paidFull && <label>{isPurchase ? 'Amount paid now (optional)' : 'Amount received now (optional)'}<input type="number" min="0" value={paidPart} onChange={e => setPaidPart(e.target.value)} /></label>}
          </section>
        )}
      </div>

      <footer className="cb-foot">
        <div><small>Total{gstOn ? ` (tax ${money(calc.tax)})` : ''}</small><b>{money(calc.total)}</b></div>
        <button className="primary" onClick={create}>Create {TITLE}</button>
      </footer>

      {sheet && (
        <div className="cb-sheet-wrap" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
          <div className="cb-sheet">
            <header><button className="icon-btn" onClick={close}><X /></button><h3>{{ customer: 'Select ' + P, product: 'Select Products', bank: 'Bank / Payment', signature: 'Signature', notes: 'Notes', terms: 'Terms & Conditions' }[sheet]}</h3></header>

            {sheet === 'customer' && !newC && <>
              <div className="search-box"><Search size={17} /><input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search customer" /></div>
              <button className="cb-add" onClick={() => setNewC({ name: '', phone: '', address: '', gstin: '' })}><User size={18} /> Add {P}</button>
              {custs.map(c => <button className="cb-pick" key={c.id} onClick={() => { setCustomer(c); close(); }}><div><b>{c.name}</b><small>{c.phone}</small></div>{dueOf(c.name) > 0 && <strong className="due">{money(dueOf(c.name))}</strong>}</button>)}
              {!custs.length && <p className="muted">Koi {P.toLowerCase()} nahi mila.</p>}
            </>}
            {sheet === 'customer' && newC && <>
              {[['name', 'Name *'], ['phone', 'Phone'], ['address', 'Address'], ['gstin', 'GSTIN']].map(([k, l]) => <label key={k}>{l}<input value={newC[k]} onChange={e => setNewC({ ...newC, [k]: e.target.value })} /></label>)}
              <button className="primary" onClick={saveNewCustomer}>Save {P}</button>
            </>}

            {sheet === 'product' && !custom && <>
              <div className="search-box"><Search size={17} /><input autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={scanEnter} placeholder="Search products / scan barcode" /></div>
              <button className="cb-add" onClick={() => setCustom({ name: '', price: '', qty: 1, unit: 'pcs', gst: 18, hsn: '', save: false })}><Package size={18} /> Add Product / Service</button>
              {prods.map(p => (
                <div className="cb-pick" key={p.id}><div><b>{p.name}</b><small>{money(isPurchase ? p.purchase : p.price)}{p.stock !== '' && p.stock != null ? ` · Stock ${p.stock}` : ''}</small></div>
                  <div className="cb-stepper"><button onClick={() => setProductQty(p, -1)}><Minus size={16} /></button><span>{qtyOf(p.id)}</span><button onClick={() => setProductQty(p, 1)}><Plus size={16} /></button></div></div>
              ))}
              {!prods.length && <p className="muted">Koi product nahi mila. Upar se naya item jodein.</p>}
              <button className="primary" onClick={close}>Done ({items.length})</button>
            </>}
            {sheet === 'product' && custom && <>
              <label>Name *<input value={custom.name} onChange={e => setCustom({ ...custom, name: e.target.value })} /></label>
              <div className="cb-two"><label>Rate ₹ *<input type="number" value={custom.price} onChange={e => setCustom({ ...custom, price: e.target.value })} /></label><label>Qty<input type="number" value={custom.qty} onChange={e => setCustom({ ...custom, qty: e.target.value })} /></label></div>
              <div className="cb-two"><label>Unit<input value={custom.unit} onChange={e => setCustom({ ...custom, unit: e.target.value })} /></label><label>GST %<input type="number" value={custom.gst} onChange={e => setCustom({ ...custom, gst: e.target.value })} /></label></div>
              <label>HSN / SAC (optional)<input value={custom.hsn} onChange={e => setCustom({ ...custom, hsn: e.target.value })} /></label>
              <label className="cb-check"><input type="checkbox" checked={custom.save} onChange={e => setCustom({ ...custom, save: e.target.checked })} /> Products list mein bhi save karein</label>
              <button className="primary" onClick={addCustom}>Add Item</button>
            </>}

            {sheet === 'bank' && <>
              <label>Payment Mode<select value={mode} onChange={e => setMode(e.target.value)}>{MODES.map(m => <option key={m}>{m}</option>)}</select></label>
              <label>Bank Details<textarea rows="4" value={bankDetails} onChange={e => setBankDetails(e.target.value)} placeholder="Bank name, A/C no., IFSC" /></label>
              <label>UPI ID<input value={upiId} onChange={e => setUpiId(e.target.value)} /></label>
              <button className="primary" onClick={close}>Save</button>
            </>}
            {sheet === 'signature' && <><label>Signature text<input value={signature} onChange={e => setSignature(e.target.value)} /></label><button className="primary" onClick={close}>Save</button></>}
            {sheet === 'notes' && <><label>Notes<textarea rows="5" value={notes} onChange={e => setNotes(e.target.value)} /></label><button className="primary" onClick={close}>Save</button></>}
            {sheet === 'terms' && <><label>Terms & Conditions<textarea rows="9" value={terms} onChange={e => setTerms(e.target.value)} /></label><button className="primary" onClick={close}>Save</button></>}
            {['bank', 'signature', 'terms'].includes(sheet) && <label className="cb-check"><input type="checkbox" checked={saveDefault} onChange={e => setSaveDefault(e.target.checked)} /> Bill banne par default ke roop mein save karein</label>}
          </div>
        </div>
      )}
    </div>
  );
}
