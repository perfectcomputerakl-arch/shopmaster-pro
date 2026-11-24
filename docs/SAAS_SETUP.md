# Supabase setup (required before turning on cloud subscriptions)

1. Create a Supabase project.
2. Run `supabase/schema.sql` in SQL Editor.
3. Copy the Project URL and anon/public key into `.env` using `.env.example`.
4. Configure email authentication in Supabase Auth.
5. Implement payment verification and subscription updates in a Supabase Edge Function or trusted server. Never expose the `service_role` key or accept a Pro status directly from the browser.

This source ZIP contains the database schema and secure RLS starting point, but cloud login/payment activation is not enabled until project credentials and a verified payment provider endpoint are configured. Existing local Free/Pro behavior is retained for backward compatibility.
