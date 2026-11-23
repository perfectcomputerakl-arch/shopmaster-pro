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
export function activateCode(p, raw) {
  const code = String(raw || '').trim().toUpperCase();
  if (!code) return { ok: false, msg: 'Code likhein' };
  const hit = PRO_CODES.find(c => String(c.code).toUpperCase() === code);
  if (!hit) return { ok: false, msg: 'Code galat hai' };
  if (p.usedCodes.includes(code)) return { ok: false, msg: 'Ye code pehle use ho chuka hai' };
  const base = isProActive(p) && !isLifetime(p) ? new Date(p.until) : new Date();
  const until = hit.days == null ? '9999-12-31T00:00:00.000Z' : addDays(base, hit.days);
  return { ok: true, plan: { ...p, plan: 'pro', until, usedCodes: [...p.usedCodes, code] } };
}
