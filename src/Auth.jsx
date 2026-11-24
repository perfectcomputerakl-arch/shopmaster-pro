import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from './lib/supabase.js';

const AuthContext = createContext({ user: null, signOut: async () => {} });
export const useAuth = () => useContext(AuthContext);

function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const run = async (fn) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await fn();
      if (result?.error) throw result.error;
      return result;
    } catch (e) {
      setError(e?.message || 'Something went wrong. Please try again.');
      return null;
    } finally { setBusy(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) { setError('Email aur password dono bhariye.'); return; }
    if (password.length < 6) { setError('Password kam se kam 6 characters ka hona chahiye.'); return; }

    if (mode === 'register') {
      const result = await run(() => supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { emailRedirectTo: window.location.origin }
      }));
      if (result && !result.data?.session) {
        setMessage('Registration ho gaya. Email par verification link bheja gaya hai. Verify karke login karein.');
        setMode('login');
      }
    } else {
      await run(() => supabase.auth.signInWithPassword({ email: cleanEmail, password }));
    }
  };

  const google = () => run(() => supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  }));

  const forgot = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setError('Pehle apna email address likhiye.'); return; }
    const result = await run(() => supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/`
    }));
    if (result) setMessage('Password reset link aapke email par bhej diya gaya hai.');
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <img src="/shopmaster-pro-logo.jpg" alt="ShopMaster Pro" style={styles.logoImage} />
        <div style={styles.brand}>SHOPMASTER PRO</div>
        <div style={styles.subtitle}>BUSINESS MANAGER</div>
        <h1 style={styles.heading}>{mode === 'register' ? 'Create your account' : 'Welcome back'}</h1>
        <p style={styles.note}>{mode === 'register' ? 'Apna business account banayein.' : 'Login karke apna workspace kholiye.'}</p>

        <form onSubmit={submit}>
          <label style={styles.label}>Email address</label>
          <input style={styles.input} type="email" autoComplete="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          <label style={styles.label}>Password</label>
          <input style={styles.input} type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password} onChange={e => setPassword(e.target.value)}
            placeholder="At least 6 characters" minLength={6} required />
          {mode === 'login' && <button type="button" style={styles.forgot} onClick={forgot}>Forgot password?</button>}
          {error && <div style={styles.error}>{error}</div>}
          {message && <div style={styles.success}>{message}</div>}
          <button style={styles.primary} disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Login'}</button>
        </form>

        <div style={styles.separator}><span>OR</span></div>
        <button style={styles.google} onClick={google} disabled={busy}>
          <span style={{fontWeight:800,fontSize:18}}>G</span> Continue with Google
        </button>
        <p style={styles.switch}>
          {mode === 'register' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button style={styles.link} onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); setMessage(''); }}>
            {mode === 'register' ? 'Login' : 'Create account'}
          </button>
        </p>
        <small style={styles.footer}>Your business workspace is protected by Supabase Authentication.</small>
      </section>
    </main>
  );
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return; }
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) console.error('Supabase session error:', error);
      setSession(data?.session || null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  if (!supabaseConfigured) {
    return <div style={styles.config}><b>ShopMaster Pro setup incomplete</b><p>Supabase URL aur Publishable Key build environment mein set karke naya deployment chalayein.</p></div>;
  }
  if (loading) return <div style={styles.loading}>SHOPMASTER PRO<br/><small>Workspace loading…</small></div>;
  if (!session) return <AuthScreen />;

  return (
    <AuthContext.Provider value={{ user: session.user, signOut }}>
      <div style={styles.accountBar}>
        <span>Signed in: <b>{session.user.email}</b></span>
        <button style={styles.signOut} onClick={() => signOut().catch(e => alert(e.message))}>Logout</button>
      </div>
      {children}
    </AuthContext.Provider>
  );
}

const styles = {
  page:{minHeight:'100vh',display:'grid',placeItems:'center',padding:20,background:'linear-gradient(135deg,#eef5f2,#f4f7fb)',fontFamily:'Arial,sans-serif',boxSizing:'border-box'},
  card:{width:'100%',maxWidth:420,background:'#fff',borderRadius:20,padding:28,boxShadow:'0 18px 55px rgba(15,45,35,.12)',boxSizing:'border-box'},
  logoImage:{display:'block',width:'100%',maxWidth:260,height:'auto',maxHeight:150,objectFit:'contain',margin:'0 auto 12px',borderRadius:10,background:'#000'},
  brand:{textAlign:'center',fontWeight:900,letterSpacing:1.2,color:'#123b30',fontSize:19},
  subtitle:{textAlign:'center',fontSize:10,letterSpacing:3,color:'#718078',marginTop:4},
  heading:{fontSize:24,color:'#172b25',margin:'28px 0 6px'},
  note:{fontSize:13,color:'#6b7771',margin:'0 0 22px'},
  label:{display:'block',fontSize:13,fontWeight:700,color:'#33443d',margin:'14px 0 7px'},
  input:{width:'100%',boxSizing:'border-box',padding:'13px 14px',border:'1px solid #d9e2dd',borderRadius:10,fontSize:15,outlineColor:'#0b8060'},
  forgot:{display:'block',margin:'9px 0 0 auto',border:0,background:'none',color:'#087653',fontWeight:700,cursor:'pointer'},
  primary:{width:'100%',padding:14,marginTop:18,border:0,borderRadius:10,background:'#087653',color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer'},
  separator:{display:'flex',alignItems:'center',gap:12,color:'#9aa59f',fontSize:11,margin:'22px 0'},
  google:{width:'100%',padding:12,border:'1px solid #d9e2dd',borderRadius:10,background:'#fff',color:'#24352e',fontSize:14,fontWeight:700,display:'flex',justifyContent:'center',alignItems:'center',gap:12,cursor:'pointer'},
  switch:{textAlign:'center',fontSize:13,color:'#66736c',marginTop:22},
  link:{border:0,background:'none',color:'#087653',fontWeight:800,cursor:'pointer'},
  footer:{display:'block',textAlign:'center',color:'#98a39d',fontSize:10,lineHeight:1.5,marginTop:24},
  error:{background:'#fff0f0',color:'#b42318',padding:10,borderRadius:8,fontSize:12,marginTop:12},
  success:{background:'#edfbf3',color:'#137547',padding:10,borderRadius:8,fontSize:12,marginTop:12},
  config:{margin:24,padding:20,border:'1px solid #f0c36d',background:'#fff8e7',borderRadius:12,fontFamily:'Arial,sans-serif'},
  loading:{minHeight:'100vh',display:'grid',placeContent:'center',textAlign:'center',fontWeight:900,color:'#087653',fontFamily:'Arial,sans-serif',letterSpacing:1},
  accountBar:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:'8px 14px',background:'#f0f7f3',borderBottom:'1px solid #dce9e1',fontSize:12,color:'#29483a',fontFamily:'Arial,sans-serif'},
  signOut:{padding:'7px 12px',border:'1px solid #c9dbd0',borderRadius:8,background:'#fff',color:'#126447',fontWeight:700,cursor:'pointer'}
};
