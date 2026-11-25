import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, Plus, X, Image as ImageIcon, Mic, MicOff } from 'lucide-react';

const uid = () => crypto.randomUUID();
const GST = [0, 0.25, 3, 5, 12, 18, 28];
const UNITS = ['pcs', 'nos', 'box', 'kg', 'g', 'ltr', 'ml', 'mtr', 'sqft', 'set', 'pair', 'dozen', 'hr', 'day', 'month'];

// Voice typing language. 'en-IN' = English (India) so speech is typed in English letters, not Devanagari.
const VOICE_LANG = 'en-IN';

function shrink(file, cb) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 600 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => cb(r.result);
    img.src = r.result;
  };
  r.readAsDataURL(file);
}

// Takes a spoken sentence and pulls out name / price / purchase / stock / gst / hsn.
// Example: "Dell Latitude 7490 price 25000 purchase 21000 stock 5 gst 18 hsn 8471"
function parseVoice(text) {
  let rest = ' ' + String(text || '').replace(/,(?=\d{3})/g, '') + ' ';
  const out = {};
  const NUM = '(?:is|of|at|:)?\\s*(?:rs\\.?|rupees|inr|₹)?\\s*(\\d+(?:\\.\\d+)?)';
  const take = (re, key, conv = Number) => {
    const m = rest.match(re);
    if (m) { out[key] = conv(m[1]); rest = rest.replace(m[0], ' '); }
  };
  take(new RegExp('\\b(?:purchase\\s*price|purchase|cost\\s*price|cost|buying\\s*price|buying)\\s*' + NUM, 'i'), 'purchase');
  take(new RegExp('\\b(?:opening\\s*stock|opening\\s*quantity|stock|quantity|qty)\\s*' + NUM, 'i'), 'stock');
  take(new RegExp('\\b(?:gst|tax)\\s*(?:rate)?\\s*' + NUM, 'i'), 'gst');
  take(new RegExp('\\b(?:hsn|sac)\\s*(?:code)?\\s*' + NUM, 'i'), 'hsn', String);
  take(new RegExp('\\b(?:selling\\s*price|price|rate|mrp)\\s*' + NUM, 'i'), 'price');
  const name = rest.replace(/\b(?:add|create|new|product|service|name)\b/gi, ' ').replace(/[,;]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (name) out.name = name;
  return out;
}

export default function ProductForm({ product, categories, onSave, onAddCategory, onCancel, notify }) {
  const edit = !!product;
  const [f, setF] = useState(product ? { type: 'Product', hsn: '', discount: '', lowStockAlert: '', ...product } : {
    id: uid(), type: 'Product', name: '', sku: '', category: '', brand: '', description: '', price: '', purchase: '', stock: '',
    gst: '18', unit: 'pcs', barcode: '', image: '', hsn: '', discount: '', lowStockAlert: ''
  });
  const [open, setOpen] = useState(() => new Set([
    ...(f.image ? ['image'] : []), ...(f.barcode ? ['barcode'] : []), ...(f.discount !== '' && f.discount != null ? ['discount'] : []),
    ...(f.lowStockAlert !== '' && f.lowStockAlert != null ? ['low'] : []), ...(f.stock !== '' && f.stock != null ? ['stock'] : [])
  ]));
  const [newCat, setNewCat] = useState(null);
  const [voiceText, setVoiceText] = useState('');
  const [listening, setListening] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const toggle = k => setOpen(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const svc = f.type === 'Service';
  const gstOptions = GST.includes(Number(f.gst)) ? GST : [...GST, Number(f.gst)];
  const chips = [['image', 'Image'], ['barcode', 'Barcode'], ['discount', 'Discount'], ...(svc ? [] : [['low', 'Low Stock Alert'], ['stock', 'Opening Quantity']])];

  const applyVoice = spoken => {
    const text = String(spoken || '').trim();
    if (!text) return;
    setVoiceText(text);
    const v = parseVoice(text);
    const patch = {};
    if (v.name) patch.name = v.name;
    if (v.price != null) patch.price = String(v.price);
    if (v.purchase != null) patch.purchase = String(v.purchase);
    if (v.gst != null) patch.gst = String(v.gst);
    if (v.hsn) patch.hsn = v.hsn;
    if (v.stock != null && !svc) { patch.stock = String(v.stock); setOpen(s => new Set([...s, 'stock'])); }
    if (!Object.keys(patch).length) { notify('Voice text mil gaya, par kuch samajh nahi aaya. Dobara boliye.'); return; }
    setF(x => ({ ...x, ...patch }));
    notify('Voice se details bhar di gayi. Check karke save karein.');
  };

  const startVoice = async () => {
    if (listening) return;
    // Android APK: WebView has no SpeechRecognition, so use the native speech plugin (Google voice dialog).
    if (Capacitor.isNativePlatform()) {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        const { available } = await SpeechRecognition.available();
        if (!available) { notify('Is phone me speech service nahi mili. Google app / Speech Services update karein.'); return; }
        let perm = await SpeechRecognition.checkPermissions();
        if (perm.speechRecognition !== 'granted') perm = await SpeechRecognition.requestPermissions();
        if (perm.speechRecognition !== 'granted') { notify('Microphone permission allow karein'); return; }
        setListening(true);
        const r = await SpeechRecognition.start({ language: VOICE_LANG, maxResults: 1, prompt: 'Product ka naam, price, stock boliye', partialResults: false, popup: true });
        if (r?.matches?.[0]) applyVoice(r.matches[0]); else notify('Kuch sunai nahi diya, dobara try karein');
      } catch (e) { notify('Voice input nahi mila. Microphone permission check karein.'); }
      finally { setListening(false); }
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { notify('Is browser mein voice typing support nahi hai. Android Chrome mein try karein.'); return; }
    const rec = new SR(); rec.lang = VOICE_LANG; rec.interimResults = false; rec.maxAlternatives = 1; setListening(true);
    rec.onresult = e => applyVoice(e.results[0][0].transcript);
    rec.onerror = () => notify('Voice input nahi mila. Microphone permission check karein.');
    rec.onend = () => setListening(false); rec.start();
  };

  const addCat = () => {
    const name = (newCat || '').trim();
    if (!name) { setNewCat(null); return; }
    onAddCategory(name); set('category', name); setNewCat(null);
  };
  const save = () => {
    if (!f.name.trim()) { notify(`${svc ? 'Service' : 'Product'} ka naam bharein`); return; }
    if (f.gst === '' || f.gst == null) { notify('Tax rate chunein'); return; }
    const n = v => (v === '' || v == null ? '' : Number(v));
    onSave({
      ...f, name: f.name.trim(), price: Number(f.price || 0), purchase: n(f.purchase), gst: String(f.gst),
      stock: svc ? '' : n(f.stock), discount: n(f.discount), lowStockAlert: svc ? '' : n(f.lowStockAlert),
      image: open.has('image') ? f.image : '', barcode: open.has('barcode') ? f.barcode : ''
    });
  };

  return (
    <div className="cb-screen">
      <header className="cb-head"><button className="icon-btn" onClick={onCancel}><ArrowLeft /></button><h2>{edit ? 'Edit' : 'Add'} {svc ? 'Service' : 'Product'}</h2><button className="secondary" onClick={startVoice}><Mic size={16} /> {listening ? 'Listening…' : 'Voice Fill'}</button></header>
      <div className="cb-body">
        <div className="cb-seg" style={{ marginBottom: 12 }}>
          <button className={!svc ? 'on' : ''} onClick={() => set('type', 'Product')}>Product</button>
          <button className={svc ? 'on' : ''} onClick={() => set('type', 'Service')}>Service</button>
        </div>

        <section className="cb-card">
          <small className="muted">Voice example: ‘Dell Latitude 7490 price 25000 purchase 21000 stock 5 gst 18’</small>
          {voiceText && <p><b>Heard:</b> {voiceText}</p>}
          <button className="cb-add" onClick={startVoice}>{listening ? <MicOff size={18} /> : <Mic size={18} />} {listening ? 'Listening…' : 'Speak name, price, stock and GST'}</button>
        </section>

        <section className="cb-card">
          <h4>Details</h4>
          <label>{svc ? 'Service' : 'Product'} Name *<input value={f.name} onChange={e => set('name', e.target.value)} /></label>
          <label>Selling Price ₹<input type="number" min="0" value={f.price} onChange={e => set('price', e.target.value)} /></label>
          <div className="cb-two">
            <label>Tax Rate % *<select value={String(f.gst)} onChange={e => set('gst', e.target.value)}>{gstOptions.map(g => <option key={g} value={String(g)}>{g}%</option>)}</select></label>
            <label>Unit<select value={f.unit} onChange={e => set('unit', e.target.value)}>{(UNITS.includes(f.unit) ? UNITS : [...UNITS, f.unit]).map(u => <option key={u}>{u}</option>)}</select></label>
          </div>
          {newCat === null ? (
            <label>Category
              <select value={f.category} onChange={e => (e.target.value === '__new' ? setNewCat('') : set('category', e.target.value))}>
                <option value="">None</option>
                {categories.map(c => <option key={c}>{c}</option>)}
                <option value="__new">+ Add new category</option>
              </select>
            </label>
          ) : (
            <label>New Category<div className="cb-two" style={{ gridTemplateColumns: '1fr auto' }}><input autoFocus value={newCat} onChange={e => setNewCat(e.target.value)} /><button className="primary" onClick={addCat}>Add</button></div></label>
          )}
        </section>

        <section className="cb-card">
          <h4>Optional</h4>
          <label>Purchase Price ₹<input type="number" min="0" value={f.purchase} onChange={e => set('purchase', e.target.value)} /></label>
          <label>HSN / SAC Code<input value={f.hsn} onChange={e => set('hsn', e.target.value)} /></label>
          <label>SKU / Product Code<input value={f.sku} onChange={e => set('sku', e.target.value)} /></label>
          <label>Description<textarea rows="3" value={f.description} onChange={e => set('description', e.target.value)} /></label>
        </section>

        <section className="cb-card">
          <h4>Add-ons</h4>
          <div className="chips">{chips.map(([k, l]) => <button key={k} className={`chip-btn ${open.has(k) ? 'on' : ''}`} onClick={() => toggle(k)}>{open.has(k) ? <X size={14} /> : <Plus size={14} />} {l}</button>)}</div>
          {open.has('image') && (
            <div className="img-pick">
              <div className="img-box">{f.image ? <img src={f.image} alt="" /> : <ImageIcon size={26} />}</div>
              <label className="secondary file-label">Choose image<input type="file" accept="image/*" onChange={e => shrink(e.target.files?.[0], v => set('image', v))} /></label>
              {f.image && <button className="text-btn" onClick={() => set('image', '')}>Remove</button>}
            </div>
          )}
          {open.has('barcode') && <label>Barcode / Model No.<input value={f.barcode} onChange={e => set('barcode', e.target.value)} /></label>}
          {open.has('discount') && <label>Default Discount %<input type="number" min="0" value={f.discount} onChange={e => set('discount', e.target.value)} /></label>}
          {!svc && open.has('low') && <label>Low Stock Alert at (qty)<input type="number" min="0" value={f.lowStockAlert} onChange={e => set('lowStockAlert', e.target.value)} /></label>}
          {!svc && open.has('stock') && <label>Opening Quantity<input type="number" value={f.stock} onChange={e => set('stock', e.target.value)} /></label>}
        </section>
      </div>
      <footer className="cb-foot"><span /><button className="primary" onClick={save}>{edit ? 'Save Changes' : `Add ${svc ? 'Service' : 'Product'}`}</button></footer>
    </div>
  );
}
