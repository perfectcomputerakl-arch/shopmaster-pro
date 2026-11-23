import React, { useState } from 'react';
import { Crown, Check, X as XIcon } from 'lucide-react';
import { COMPARE, TRIAL_DAYS, SUPPORT_WHATSAPP, daysLeft, isLifetime } from './plans.js';

export default function Plans({ plan, isPro, shopName, onTrial, onActivate }) {
  const [code, setCode] = useState('');
  const cell = v => (v === true ? <Check size={16} color="#059669" /> : v === false ? <XIcon size={16} color="#b91c1c" /> : <span>{v}</span>);
  const wa = SUPPORT_WHATSAPP && `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Hi, mujhe ShopMaster Pro plan chahiye (${shopName || 'my shop'})`)}`;
  return (
    <>
      <div className={`plan-card ${isPro ? 'pro' : ''}`}>
        <Crown size={26} />
        <div>
          <b>Current Plan: {isPro ? 'PRO' : 'FREE'}</b>
          <small>{isPro ? (isLifetime(plan) ? 'Valid forever' : `${daysLeft(plan)} din baaki (till ${new Date(plan.until).toLocaleDateString('en-IN')})`) : 'Free plan mein PDF bills par watermark aata hai'}</small>
        </div>
      </div>

      <section className="menu-card">
        <h4>Free vs Pro</h4>
        <table className="plan-table">
          <thead><tr><th></th><th>Free</th><th>Pro</th></tr></thead>
          <tbody>{COMPARE.map(([f, a, b]) => <tr key={f}><td>{f}</td><td>{cell(a)}</td><td>{cell(b)}</td></tr>)}</tbody>
        </table>
      </section>

      {!isPro && !plan.trialUsed && <button className="primary plan-btn" onClick={onTrial}>Try Pro free for {TRIAL_DAYS} days</button>}
      {wa && <a className="outline plan-btn" href={wa} target="_blank" rel="noreferrer">Buy Pro on WhatsApp</a>}

      <section className="menu-card">
        <h4>Have an activation code?</h4>
        <div className="cb-two" style={{ gridTemplateColumns: '1fr auto', gap: 8 }}>
          <input className="code-input" value={code} onChange={e => setCode(e.target.value)} placeholder="Enter code" />
          <button className="primary" onClick={() => { onActivate(code); setCode(''); }}>Activate</button>
        </div>
      </section>
    </>
  );
}
