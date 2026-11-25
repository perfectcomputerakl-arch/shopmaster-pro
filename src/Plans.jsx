import React, { useEffect, useState } from 'react';
import { Crown, Check, X as XIcon } from 'lucide-react';
import { COMPARE, TRIAL_DAYS, SUPPORT_WHATSAPP, daysLeft, isLifetime, isProActive } from './plans.js';
import { payOnline, fetchPlans, isCloudPro, cloudLifetime, cloudDaysLeft } from './cloud.js';

export default function Plans({ plan, isPro, shopName, onTrial, onActivate, session, sub, onBuy, onCloudTrial, onLogin }) {
  const [code, setCode] = useState('');
  const [plans, setPlans] = useState([]), [busy, setBusy] = useState(''), [plansErr, setPlansErr] = useState('');
  useEffect(() => {
    if (!payOnline || !session) return;
    fetchPlans().then(setPlans).catch(e => setPlansErr(e.message));
  }, [session?.user?.id]);

  const cell = v => (v === true ? <Check size={16} color="#059669" /> : v === false ? <XIcon size={16} color="#b91c1c" /> : <span>{v}</span>);
  const wa = SUPPORT_WHATSAPP && `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(`Hi, mujhe ShopMaster Pro plan chahiye (${shopName || 'my shop'})`)}`;

  const localPro = isProActive(plan), cloudPro = isCloudPro(sub);
  let detail = 'Free plan mein PDF bills par watermark aata hai';
  if (localPro) detail = isLifetime(plan) ? 'Valid forever' : `${daysLeft(plan)} din baaki (till ${new Date(plan.until).toLocaleDateString('en-IN')})`;
  else if (cloudPro) detail = cloudLifetime(sub) ? 'Valid forever (account)' : `${cloudDaysLeft(sub)} din baaki (account)`;

  const trialUsed = session ? !!sub?.trial_used : plan.trialUsed;
  const buy = async key => { setBusy(key); try { await onBuy(key); } finally { setBusy(''); } };

  return (
    <>
      <div className={`plan-card ${isPro ? 'pro' : ''}`}>
        <Crown size={26} />
        <div>
          <b>Current Plan: {isPro ? 'PRO' : 'FREE'}</b>
          <small>{detail}</small>
        </div>
      </div>

      <section className="menu-card">
        <h4>Free vs Pro</h4>
        <table className="plan-table">
          <thead><tr><th></th><th>Free</th><th>Pro</th></tr></thead>
          <tbody>{COMPARE.map(([f, a, b]) => <tr key={f}><td>{f}</td><td>{cell(a)}</td><td>{cell(b)}</td></tr>)}</tbody>
        </table>
      </section>

      {!isPro && !trialUsed && <button className="primary plan-btn" onClick={session ? onCloudTrial : onTrial}>Try Pro free for {TRIAL_DAYS} days</button>}

      {payOnline && (
        <section className="menu-card">
          <h4>Online kharidein (UPI / Card / NetBanking)</h4>
          {!session && <button className="primary plan-btn" onClick={onLogin}>Login karke kharidein</button>}
          {session && plansErr && <p style={{ color: '#b91c1c' }}>{plansErr}</p>}
          {session && plans.map(p => (
            <button key={p.key} className="outline plan-btn" disabled={!!busy} onClick={() => buy(p.key)}>
              {busy === p.key ? 'Ruko…' : `${p.label} — ₹${p.amount}`}
            </button>
          ))}
          {session && !plans.length && !plansErr && <p className="muted">Plans load ho rahe hain…</p>}
        </section>
      )}

      {wa && <a className="outline plan-btn" href={wa} target="_blank" rel="noreferrer">Buy Pro on WhatsApp</a>}

      <section className="menu-card">
        <h4>Have an activation code?</h4>
        <div className="cb-two" style={{ gridTemplateColumns: '1fr auto', gap: 8 }}>
          <input className="code-input" value={code} onChange={e => setCode(e.target.value)} placeholder="Enter code" />
          <button className="primary" onClick={async () => { await onActivate(code); setCode(''); }}>Activate</button>
        </div>
      </section>
    </>
  );
}
