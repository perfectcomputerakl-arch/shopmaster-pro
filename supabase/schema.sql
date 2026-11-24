-- Shop Master Pro SaaS schema. Run once in Supabase SQL Editor.
-- Client apps may use the publishable key only. Never expose a secret/service_role key.
create extension if not exists pgcrypto;

create table if not exists public.shop_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  shop_name text not null default '', phone text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','pro','lifetime')),
  status text not null default 'active' check (status in ('active','expired','cancelled','trial','pending')),
  starts_at timestamptz not null default now(), expires_at timestamptz,
  trial_used boolean not null default false, provider text, provider_customer_id text,
  provider_subscription_id text, updated_at timestamptz not null default now()
);
create table if not exists public.shop_banners (
  id uuid primary key default gen_random_uuid(), owner_id uuid references auth.users(id) on delete cascade,
  title text not null, image_url text not null, target_url text, enabled boolean not null default true,
  starts_at date, ends_at date, created_at timestamptz not null default now()
);
create table if not exists public.ad_events (
  id bigint generated always as identity primary key, banner_id uuid references public.shop_banners(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade, event_type text not null check(event_type in ('impression','click')),
  created_at timestamptz not null default now()
);
create table if not exists public.purchase_import_drafts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  source_name text, extracted_data jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check(status in ('draft','confirmed','discarded')),
  created_at timestamptz not null default now()
);

alter table public.shop_profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.shop_banners enable row level security;
alter table public.ad_events enable row level security;
alter table public.purchase_import_drafts enable row level security;

-- Policies are dropped/recreated to make this script safe to rerun.
drop policy if exists "profile owner select" on public.shop_profiles;
drop policy if exists "profile owner insert" on public.shop_profiles;
drop policy if exists "profile owner update" on public.shop_profiles;
create policy "profile owner select" on public.shop_profiles for select to authenticated using (auth.uid()=owner_id);
create policy "profile owner insert" on public.shop_profiles for insert to authenticated with check (auth.uid()=owner_id);
create policy "profile owner update" on public.shop_profiles for update to authenticated using (auth.uid()=owner_id) with check (auth.uid()=owner_id);

drop policy if exists "subscription owner select" on public.subscriptions;
create policy "subscription owner select" on public.subscriptions for select to authenticated using (auth.uid()=owner_id);
-- Intentionally no client insert/update/delete policy for subscriptions. Trusted Edge Function/admin only.

drop policy if exists "banner owner all" on public.shop_banners;
create policy "banner owner all" on public.shop_banners for all to authenticated using (auth.uid()=owner_id) with check (auth.uid()=owner_id);
drop policy if exists "ad event owner select" on public.ad_events;
create policy "ad event owner select" on public.ad_events for select to authenticated using (auth.uid()=owner_id);
-- Event writes should go through a rate-limited Edge Function to prevent fake counts.

drop policy if exists "purchase draft owner all" on public.purchase_import_drafts;
create policy "purchase draft owner all" on public.purchase_import_drafts for all to authenticated using (auth.uid()=owner_id) with check (auth.uid()=owner_id);

-- New-user defaults: profile and free subscription. Subscription updates remain server controlled.
create or replace function public.handle_new_shop_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.shop_profiles(owner_id, shop_name) values(new.id, coalesce(new.raw_user_meta_data->>'shop_name','')) on conflict(owner_id) do nothing;
  insert into public.subscriptions(owner_id, plan, status) values(new.id, 'free', 'active') on conflict(owner_id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_shop on auth.users;
create trigger on_auth_user_created_shop after insert on auth.users for each row execute procedure public.handle_new_shop_user();

-- Cloud sync tables (the existing app remains local-first until sync UI is enabled).
create table if not exists public.shop_customers (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null, phone text, email text, address text, gstin text, payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(owner_id,id)
);
create table if not exists public.shop_products (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null, sku text, stock numeric not null default 0, payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(owner_id,id)
);
create table if not exists public.shop_documents (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 doc_type text not null, doc_number text, doc_date date, total numeric not null default 0,
 payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), unique(owner_id,id)
);
create table if not exists public.shop_sync_state (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 last_sync_at timestamptz, app_version text, updated_at timestamptz not null default now()
);

alter table public.shop_customers enable row level security;
alter table public.shop_products enable row level security;
alter table public.shop_documents enable row level security;
alter table public.shop_sync_state enable row level security;
drop policy if exists "customer owner access" on public.shop_customers;
create policy "customer owner access" on public.shop_customers for all to authenticated using(auth.uid()=owner_id) with check(auth.uid()=owner_id);
drop policy if exists "product owner access" on public.shop_products;
create policy "product owner access" on public.shop_products for all to authenticated using(auth.uid()=owner_id) with check(auth.uid()=owner_id);
drop policy if exists "document owner access" on public.shop_documents;
create policy "document owner access" on public.shop_documents for all to authenticated using(auth.uid()=owner_id) with check(auth.uid()=owner_id);
drop policy if exists "sync owner access" on public.shop_sync_state;
create policy "sync owner access" on public.shop_sync_state for all to authenticated using(auth.uid()=owner_id) with check(auth.uid()=owner_id);
