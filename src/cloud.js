// Supabase account, subscription, cloud backup and Razorpay checkout helpers.

import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase, supabaseConfigured } from './lib/supabase.js';

export { supabase, supabaseConfigured };

// Payment API: Cloudflare Pages same-origin fallback.
// Android APK requires VITE_PAYMENT_API_URL during build.
const CONFIGURED_PAYMENT_API = String(
  import.meta.env.VITE_PAYMENT_API_URL || ''
).replace(/\/$/, '');

const BROWSER_ORIGIN =
  typeof window !== 'undefined' &&
  /^https?:$/.test(window.location.protocol)
    ? window.location.origin
    : '';

export const PAYMENT_API =
  CONFIGURED_PAYMENT_API ||
  (!Capacitor.isNativePlatform() ? BROWSER_ORIGIN : '');

export const payOnline = Boolean(PAYMENT_API && supabaseConfigured);

const LAST_SYNC_KEY = 'shopmaster-cloud-last-sync';

const need = () => {
  if (!supabase) {
    throw new Error('Cloud setup nahi hai (Supabase keys missing)');
  }
  return supabase;
};

const clean = e => {
  const m = String(e?.message || e || '');

  if (/Invalid login credentials/i.test(m))
    return 'Email ya password galat hai';

  if (/already registered/i.test(m))
    return 'Ye email pehle se registered hai, login karein';

  if (/Password should be/i.test(m))
    return 'Password kam se kam 6 characters ka rakhein';

  if (/trial_already_used/.test(m))
    return 'Free trial is account par pehle use ho chuka hai';

  if (/already_pro/.test(m))
    return 'Pro plan pehle se active hai';

  if (/Failed to fetch|NetworkError/i.test(m))
    return 'Internet ya server se connection nahi ho paya';

  return m || 'Kuch galat ho gaya';
};

export const errText = clean;


// ---- AUTH -------------------------------------------------------------------

export async function signUp(email, password, shopName) {
  const { data, error } = await need().auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { shop_name: shopName || '' }
    }
  });

  if (error) throw new Error(clean(error));

  return { needsConfirm: !data.session };
}

export async function signIn(email, password) {
  const { error } = await need().auth.signInWithPassword({
    email: email.trim(),
    password
  });

  if (error) throw new Error(clean(error));
}


// ---- GOOGLE LOGIN -----------------------------------------------------------

const NATIVE = Capacitor.isNativePlatform();
const NATIVE_REDIRECT = 'shopmasterpro://auth-callback';

export async function signInWithGoogle() {
  const { data, error } = await need().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: NATIVE
        ? NATIVE_REDIRECT
        : location.origin + location.pathname,
      skipBrowserRedirect: NATIVE
    }
  });

  if (error) throw new Error(clean(error));

  if (NATIVE && data?.url) {
    await Browser.open({ url: data.url });
  }
}

let deepLinkReady = false;

export function initAuthDeepLinks() {
  if (!NATIVE || !supabase || deepLinkReady) return;

  deepLinkReady = true;

  CapApp.addListener('appUrlOpen', async ({ url }) => {
    if (!url || !url.startsWith(NATIVE_REDIRECT)) return;

    try {
      await Browser.close();
    } catch {
      // Already closed
    }

    try {
      const u = new URL(url);
      const code = u.searchParams.get('code');

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        return;
      }

      const h = new URLSearchParams(u.hash.replace(/^#/, ''));
      const at = h.get('access_token');
      const rt = h.get('refresh_token');

      if (at && rt) {
        await supabase.auth.setSession({
          access_token: at,
          refresh_token: rt
        });
      }
    } catch (e) {
      console.error('Google login callback failed', e);
    }
  });
}

export const signOut = () => need().auth.signOut();

export async function sendReset(email) {
  const { error } = await need().auth.resetPasswordForEmail(
    email.trim(),
    { redirectTo: location.origin + location.pathname }
  );

  if (error) throw new Error(clean(error));
}

export async function setNewPassword(password) {
  const { error } = await need().auth.updateUser({ password });

  if (error) throw new Error(clean(error));
}


// ---- SUBSCRIPTION -----------------------------------------------------------

export async function fetchSubscription() {
  const { data, error } = await need()
    .from('subscriptions')
    .select('*')
    .maybeSingle();

  if (error) throw new Error(clean(error));

  return data;
}

export function isCloudPro(sub) {
  if (
    !sub ||
    !['pro', 'lifetime'].includes(sub.plan) ||
    !['active', 'trial'].includes(sub.status)
  ) {
    return false;
  }

  return !sub.expires_at ||
    new Date(sub.expires_at).getTime() > Date.now();
}

export const cloudLifetime = sub =>
  !!sub &&
  sub.plan === 'lifetime' &&
  sub.status === 'active' &&
  !sub.expires_at;

export const cloudDaysLeft = sub =>
  sub?.expires_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(sub.expires_at).getTime() - Date.now()) / 86400000
        )
      )
    : 0;

export async function cloudTrial() {
  const { data, error } = await need().rpc('start_trial');

  if (error) throw new Error(clean(error));

  return data;
}


// ---- CLOUD BACKUP -----------------------------------------------------------

export const lastSync = () =>
  localStorage.getItem(LAST_SYNC_KEY) || '';

const markSync = iso => {
  try {
    localStorage.setItem(LAST_SYNC_KEY, iso);
  } catch {
    // Ignore storage errors
  }
};

export async function cloudInfo() {
  const { data, error } = await need()
    .from('shop_cloud_backup')
    .select('updated_at,app_version')
    .maybeSingle();

  if (error) throw new Error(clean(error));

  return data;
}

export async function uploadBackup(userId, payload) {
  const at = new Date().toISOString();

  const { error } = await need()
    .from('shop_cloud_backup')
    .upsert(
      {
        owner_id: userId,
        payload,
        app_version: '1.0.0',
        updated_at: at
      },
      { onConflict: 'owner_id' }
    );

  if (error) throw new Error(clean(error));

  markSync(at);

  return at;
}

export async function downloadBackup() {
  const { data, error } = await need()
    .from('shop_cloud_backup')
    .select('payload,updated_at')
    .maybeSingle();

  if (error) throw new Error(clean(error));

  if (!data) {
    throw new Error('Cloud par abhi koi backup nahi hai');
  }

  markSync(data.updated_at);

  return data.payload;
}


// ---- RAZORPAY CHECKOUT ------------------------------------------------------

export async function fetchPlans() {
  if (!PAYMENT_API) {
    throw new Error('Payment server URL configure nahi hai');
  }

  const r = await fetch(`${PAYMENT_API}/plans`);

  if (!r.ok) {
    throw new Error('Plans load nahi hue');
  }

  return r.json();
}

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();

    const s = document.createElement('script');

    s.src = 'https://checkout.razorpay.com/v1/checkout.js';

    s.onload = resolve;

    s.onerror = () => {
      reject(
        new Error('Razorpay load nahi hua, internet check karein')
      );
    };

    document.head.appendChild(s);
  });
}

async function api(path, token, body) {
  if (!PAYMENT_API) {
    throw new Error('Payment server URL configure nahi hai');
  }

  const r = await fetch(`${PAYMENT_API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok) {
    throw new Error(j.error || 'Server error');
  }

  return j;
}


// Payment verification and activation happens on the server.
export async function buyPlan(planKey) {
  const { data } = await need().auth.getSession();

  const session = data.session;

  if (!session) {
    throw new Error('Pehle login karein');
  }

  const order = await api(
    '/create-order',
    session.access_token,
    { plan: planKey }
  );

  await loadRazorpay();

  return new Promise((resolve, reject) => {
    const rz = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,

      name: 'ShopMaster Pro',
      description: order.label,

      prefill: {
        email: session.user.email
      },

      theme: {
        color: '#1d5cff'
      },

      handler: async resp => {
        try {
          const result = await api(
            '/verify-payment',
            session.access_token,
            resp
          );

          resolve(result);
        } catch (e) {
          reject(e);
        }
      },

      modal: {
        ondismiss: () => {
          reject(new Error('Payment cancel ho gayi'));
        }
      }
    });

    rz.on('payment.failed', e => {
      reject(
        new Error(
          e?.error?.description || 'Payment fail ho gayi'
        )
      );
    });

    rz.open();
  });
}
