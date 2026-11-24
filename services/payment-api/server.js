// Razorpay server starter. Keep keys in server environment variables only.
import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'node:crypto';

const app = express();
const required = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'];
const ready = required.every(k => process.env[k]);

// CORS: set ALLOWED_ORIGIN to your app URL (e.g. https://yourname.github.io). Empty = no browser access.
app.use((req, res, next) => {
  const origin = process.env.ALLOWED_ORIGIN;
  if (origin && req.headers.origin === origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Webhook needs the RAW body to verify Razorpay's signature, so it is registered BEFORE express.json().
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
app.post('/webhook', express.raw({ type: 'application/json', limit: '1mb' }), (req, res) => {
  if (!ready) return res.status(503).send('Payment server not configured');
  const signature = req.headers['x-razorpay-signature'];
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(req.body).digest('hex');
  if (!safeEqual(signature, expected)) return res.status(400).send('Invalid signature');
  // const event = JSON.parse(req.body.toString('utf8'));
  // TODO: idempotently reconcile payment events and subscription state in Supabase (server-only service role key).
  res.json({ received: true });
});

app.use(express.json());
app.get('/health', (_, res) => res.json({ ok: true, razorpayConfigured: ready }));

app.post('/create-order', async (req, res) => {
  try {
    if (!ready) return res.status(503).json({ error: 'Razorpay server keys are not configured' });
    // TODO: require a logged-in Supabase user (verify the JWT) and take the price from a server-side plan table, not from the client.
    const amount = Math.round(Number(req.body.amount) * 100);
    if (!Number.isInteger(amount) || amount < 100) return res.status(400).json({ error: 'Invalid amount' });
    const rz = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const order = await rz.orders.create({ amount, currency: 'INR', receipt: `smpro_${Date.now()}`, notes: { plan: String(req.body.plan || 'pro').slice(0, 30) } });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (e) { res.status(500).json({ error: 'Unable to create payment order' }); }
});

app.post('/verify-payment', (req, res) => {
  if (!ready) return res.status(503).json({ error: 'Payment server not configured' });
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
  if (!safeEqual(razorpay_signature, expected)) return res.status(400).json({ verified: false });
  // TODO: update Supabase subscription (service role key, server only) after checking order/user/plan.
  res.json({ verified: true, activation: 'pending-server-subscription-sync' });
});

app.listen(process.env.PORT || 8788, () => console.log('Shop Master payment API listening'));
