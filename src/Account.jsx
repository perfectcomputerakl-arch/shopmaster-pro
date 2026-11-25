import React, { useState } from 'react';
import { User, LogOut, CloudUpload, CloudDownload, Crown } from 'lucide-react';
import { supabaseConfigured, signInWithGoogle, signIn, signUp, signOut, sendReset, setNewPassword, cloudInfo, uploadBackup, downloadBackup, lastSync, errText, isCloudPro, cloudLifetime, cloudDaysLeft } from './cloud.js';

const fmt = iso => (iso ? new Date(iso).toLocaleString('en-IN') : '—');

export default function Account({ session, sub, recovery, onRecoveryDone, getBackup, applyBackup, notify, onPlans, onRefresh }) {
  const [mode, setMode] = useState('login'); // login | signup | reset
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [shop, setShop] = useState('');
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [newPass, setNewPass] = useState('');

  if (!supabaseConfigured) {
    return <section className="menu-card"><h4>Account</h4><p>Cloud account abhi setup nahi hai. Build me <b>VITE_SUPABASE_URL</b> aur <b>VITE_SUPABASE_PUBLISHABLE_KEY</b> daalni hongi (docs/SUPABASE_SETUP.md). Tab tak app local mode me chalta rahega.</p></section>;
  }

  const run = async fn => { setBusy(true); setMsg(''); try { await fn(); } catch (e) { setMsg(errText(e)); } finally { setBusy(false); } };

  if (recovery && session) {
    return (
      <section className="menu-card">
        <h4>Naya password set karein</h4>
        <label>New password<input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} autoComplete="new-password" /></label>
        {msg && <p style={{ color: '#b91c1c' }}>{msg}</p>}
        <button className="primary" disabled={busy || newPass.length < 6} onClick={() => run(async () => { await setNewPassword(newPass); setNewPass(''); onRecoveryDone(); notify('Password badal gaya'); })}>Password save karein</button>
      </section>
    );
  }

  if (!session) {
    const submit = () => run(async () => {
      if (mode === 'reset') { await sendReset(email); setMsg('Reset link email par bhej diya gaya hai.'); return; }
      if (mode === 'signup') {
        const r = await signUp(email, password, shop);
        if (r.needsConfirm) setMsg('Account ban gaya. Email par confirmation link aaya hoga, use kholein phir login karein.');
        else notify('Account ban gaya, login ho gaye');
        return;
      }
      await signIn(email, password);
      notify('Login ho gaye');
    });
    return (
      <>
        <section className="menu-card">
          <h4>{mode === 'signup' ? 'Naya account banayein' : mode === 'reset' ? 'Password reset' : 'Login'}</h4>
          <p className="muted">Login se aap Pro plan online kharid sakte hain aur data cloud par backup kar sakte hain. App bina login ke bhi chalta hai.</p>
          {mode === 'signup' && <label>Shop name<input value={shop} onChange={e => setShop(e.target.value)} /></label>}
          <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
          {mode !== 'reset' && <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></label>}
          {msg && <p style={{ color: /bhej diya|ban gaya/.test(msg) ? '#047857' : '#b91c1c' }}>{msg}</p>}
          {mode !== 'reset' && <><button className="outline plan-btn" disabled={busy} onClick={() => run(signInWithGoogle)}>Google se {mode === 'signup' ? 'signup' : 'login'} karein</button><p className="muted" style={{ textAlign: 'center', margin: '6px 0' }}>ya email se</p></>}
          <button className="primary plan-btn" disabled={busy || !email || (mode !== 'reset' && password.length < 6)} onClick={submit}>{busy ? 'Ruko…' : mode === 'signup' ? 'Account banayein' : mode === 'reset' ? 'Reset link bhejein' : 'Login'}</button>
          <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
            {mode !== 'login' && <a href="#login" onClick={e => { e.preventDefault(); setMode('login'); setMsg(''); }}>Login</a>}
            {mode !== 'signup' && <a href="#signup" onClick={e => { e.preventDefault(); setMode('signup'); setMsg(''); }}>Naya account</a>}
            {mode !== 'reset' && <a href="#reset" onClick={e => { e.preventDefault(); setMode('reset'); setMsg(''); }}>Password bhool gaye?</a>}
          </div>
        </section>
      </>
    );
  }

  const pro = isCloudPro(sub);
  const upload = () => run(async () => {
    const info = await cloudInfo();
    const last = lastSync();
    if (info && (!last || new Date(info.updated_at) > new Date(last)) && !window.confirm(`Cloud par ${fmt(info.updated_at)} ka backup hai jo is device se sync nahi hua (shayad kisi aur device se). Upload karne se wo replace ho jayega. Continue?`)) return;
    const payload = getBackup();
    if (JSON.stringify(payload).length > 8 * 1024 * 1024) { setMsg('Data bahut bada hai (8 MB se zyada). Product/logo images chhoti karein.'); return; }
    const at = await uploadBackup(session.user.id, payload);
    setMsg(`Cloud backup ho gaya (${fmt(at)})`);
  });
  const download = () => run(async () => {
    if (!window.confirm('Cloud ka backup restore karne se is device ka abhi ka saara data replace ho jayega. Continue?')) return;
    applyBackup(await downloadBackup());
    setMsg('Cloud se restore ho gaya');
  });

  return (
    <>
      <section className="menu-card">
        <h4><User size={16} /> Account</h4>
        <p><b>{session.user.email}</b></p>
        <p className="muted">Plan: <b>{pro ? 'PRO' : 'FREE'}</b>{pro && sub?.status === 'trial' ? ' (trial)' : ''}{pro ? (cloudLifetime(sub) ? ' — lifetime' : ` — ${cloudDaysLeft(sub)} din baaki`) : ''}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="primary" onClick={onPlans}><Crown size={16} /> Plans / Upgrade</button>
          <button className="outline" onClick={onRefresh}>Status refresh</button>
          <button className="outline" onClick={() => run(async () => { await signOut(); notify('Logout ho gaye'); })}><LogOut size={16} /> Logout</button>
        </div>
      </section>
      <section className="menu-card">
        <h4>Cloud backup</h4>
        <p className="muted">Pura data (bills, products, customers) aapke account me save hota hai. Ye manual hai: upload ya restore aap dabate hain. Last sync: {fmt(lastSync())}</p>
        {msg && <p style={{ color: /nahi|galat|bada/i.test(msg) ? '#b91c1c' : '#047857' }}>{msg}</p>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="primary" disabled={busy} onClick={upload}><CloudUpload size={16} /> Upload to cloud</button>
          <button className="outline" disabled={busy} onClick={download}><CloudDownload size={16} /> Restore from cloud</button>
        </div>
      </section>
    </>
  );
}
