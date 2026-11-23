import { PUBLIC_KEY } from './proKey.js';
// Plan (Free / Pro) logic. Stored on this device only (separate from the backup file).
// NOTE: this is a soft lock in the browser. For real paid subscriptions use a server to verify payments/codes.
const KEY = 'shopmaster-pro-plan';

export const TRIAL_DAYS = 7;
export const PRO_TEMPLATES = ['boxed', 'clean', 'compact'];
// WhatsApp number (country code + number, digits only) for "Buy Pro" button. Leave '' to hide the button.
export const SUPPORT_WHATSAPP = '';
// Activation codes you sell. days: null = lifetime. Anyone who can read this file can see the codes,
// so keep the repository private or move code checking to a server.
export const PRO_CODES = [];
// e.g. [{ code: 'MDOT-0001-ABCD', days: 30 }, { code: 'MDOT-0002-WXYZ', days: null }]

export const COMPARE = [
  ['Invoice, quotation & purchase billing', true, true],
  ['Products, customers, vendors, expenses', true, true],
  ['Backup & Restore (JSON)', true, true],
  ['UPI QR on invoice', true, true],
  ['Invoice templates', '3 basic', 'All 6'],
  ['Watermark on PDF bills', 'Yes', 'No watermark']
];

const blank = () => ({ plan: 'free', until: null, trialUsed: false, usedCodes: [] });
export function loadPlan() {
  try { const p = JSON.parse(localStorage.getItem(KEY)); if (p && typeof p === 'object') return { ...blank(), ...p }; } catch { /* ignore */ }
  return blank();
}
export function savePlan(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ } }
export const isProActive = p => p.plan === 'pro' && !!p.until && new Date(p.until).getTime() >= Date.now();
export const isLifetime = p => !!p.until && new Date(p.until).getUTCFullYear() >= 9000;
export const daysLeft = p => (isProActive(p) ? Math.ceil((new Date(p.until).getTime() - Date.now()) / 86400000) : 0);
const addDays = (from, d) => new Date(from.getTime() + d * 86400000).toISOString();

export function startTrial(p) {
  if (p.trialUsed) return { ok: false, msg: 'Free trial pehle hi use ho chuka hai' };
  if (isProActive(p)) return { ok: false, msg: 'Pro plan pehle se active hai' };
  return { ok: true, plan: { ...p, plan: 'pro', until: addDays(new Date(), TRIAL_DAYS), trialUsed: true } };
}
const unb64u = t => Uint8Array.from(atob(t.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

// Signed code format: SMP-<payload>.<signature>  (made by admin/admin.html, verified with PUBLIC_KEY)
async function readSigned(text) {
  if (!PUBLIC_KEY) return { err: 'Is app mein signed codes setup nahi hain' };
  try {
    const [payload, sig] = text.slice(4).split('.');
    const key = await crypto.subtle.importKey('jwk', PUBLIC_KEY, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, unb64u(sig), new TextEncoder().encode(payload));
    if (!ok) return { err: 'Code galat hai' };
    const d = JSON.parse(new TextDecoder().decode(unb64u(payload)));
    return { id: String(d.i), days: Number(d.d) > 0 ? Number(d.d) : null };
  } catch { return { err: 'Code galat hai' }; }
}

export async function activateCode(p, raw) {
  const text = String(raw || '').replace(/\s+/g, '');
  if (!text) return { ok: false, msg: 'Code likhein' };
  let id, days;
  if (text.startsWith('SMP-')) {
    const r = await readSigned(text);
    if (r.err) return { ok: false, msg: r.err };
    id = r.id; days = r.days;
  } else {
    const code = text.toUpperCase();
    const hit = PRO_CODES.find(c => String(c.code).toUpperCase() === code);
    if (!hit) return { ok: false, msg: 'Code galat hai' };
    id = code; days = hit.days;
  }
  if (p.usedCodes.includes(id)) return { ok: false, msg: 'Ye code pehle use ho chuka hai' };
  const base = isProActive(p) && !isLifetime(p) ? new Date(p.until) : new Date();
  const until = days == null || (isProActive(p) && isLifetime(p)) ? '9999-12-31T00:00:00.000Z' : addDays(base, days);
  return { ok: true, plan: { ...p, plan: 'pro', until, usedCodes: [...p.usedCodes, id] } };
}
