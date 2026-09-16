create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_session_id text not null,
  order_reference text not null,
  full_name text not null,
  reason text,
  status text not null default 'received',
  created_at timestamptz not null default now()
);
create unique index if not exists withdrawal_requests_stripe_session_unique on public.withdrawal_requests (stripe_session_id);
alter table public.withdrawal_requests enable row level security;
drop policy if exists "Clients can read their withdrawal requests" on public.withdrawal_requests;
create policy "Clients can read their withdrawal requests" on public.withdrawal_requests for select to authenticated using (auth.uid() = user_id);
