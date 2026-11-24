# Supabase setup for Shop Master Pro

1. In the Supabase project `SHOP MASTER PRO`, open SQL Editor.
2. Open `supabase/schema.sql` from this project, copy the full SQL and run it once.
3. Keep the Project URL and `sb_publishable_...` key in local `.env` (copy `.env.example` to `.env.local`).
4. Install dependencies and run the app only after a Supabase client/auth module has been implemented.

Important security notes:
- The publishable key is public by design. RLS is mandatory.
- Never put `sb_secret_` or `service_role` keys in browser code, `VITE_` variables, source control or a ZIP shared with customers.
- The SQL deliberately prevents clients from editing subscriptions. A trusted Edge Function must verify payment webhooks and make subscription changes.
- Do not treat a client-side `isPro` flag or localStorage plan as paid entitlement.
