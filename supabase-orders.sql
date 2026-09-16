create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_session_id text not null unique,
  status text not null check (status in ('paid', 'refunded', 'cancelled')),
  currency text not null default 'eur',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  items jsonb not null default '[]'::jsonb,
  customer_email text,
  shipping_address jsonb,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "Clients can read their orders" on public.orders;
create policy "Clients can read their orders"
on public.orders for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Clients can register their verified orders" on public.orders;

create index if not exists orders_user_created_idx
on public.orders (user_id, created_at desc);
