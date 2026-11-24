// Razorpay server starter. Keep keys in server environment variables only.
import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'node:crypto';
const app=express();app.use(express.json());
const required=['RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET'];
const ready=required.every(k=>process.env[k]);
app.get('/health',(_,res)=>res.json({ok:true,razorpayConfigured:ready}));
app.post('/create-order',async(req,res)=>{try{if(!ready)return res.status(503).json({error:'Razorpay server keys are not configured'});const amount=Math.round(Number(req.body.amount)*100);if(!Number.isInteger(amount)||amount<100)return res.status(400).json({error:'Invalid amount'});const rz=new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});const order=await rz.orders.create({amount,currency:'INR',receipt:`smpro_${Date.now()}`,notes:{plan:String(req.body.plan||'pro').slice(0,30)}});res.json({orderId:order.id,amount:order.amount,currency:order.currency,keyId:process.env.RAZORPAY_KEY_ID});}catch(e){res.status(500).json({error:'Unable to create payment order'})}});
app.post('/verify-payment',(req,res)=>{const {razorpay_order_id,razorpay_payment_id,razorpay_signature}=req.body||{};if(!ready)return res.status(503).json({error:'Payment server not configured'});const expected=crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');if(!razorpay_signature||!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(razorpay_signature)))return res.status(400).json({verified:false});/* TODO: Update Supabase subscription using server-only service role key after checking order/user/plan. */res.json({verified:true,activation:'pending-server-subscription-sync'});});
app.post('/webhook',(req,res)=>{const signature=req.headers['x-razorpay-signature'];const body=JSON.stringify(req.body);const expected=crypto.createHmac('sha256',process.env.RAZORPAY_WEBHOOK_SECRET||'').update(body).digest('hex');if(!signature||signature!==expected)return res.status(400).send('Invalid signature');/* TODO: idempotently reconcile payment events and subscription state in Supabase. */res.json({received:true});});
app.listen(process.env.PORT||8788,()=>console.log('Shop Master payment API listening'));
