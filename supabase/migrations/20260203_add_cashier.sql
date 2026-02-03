-- Table sessions per mesa
create table if not exists public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_number text not null,
  status text not null check (status in ('open','closed')) default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opened_by uuid,
  closed_by uuid
);

-- Una sola sesión abierta por mesa/restaurante
create unique index if not exists table_sessions_open_unique
  on public.table_sessions(restaurant_id, table_number)
  where status = 'open';

-- Payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_id uuid not null references public.table_sessions(id) on delete cascade,
  method text not null check (method in ('cash','card')),
  amount_total numeric not null,
  created_at timestamptz not null default now(),
  created_by uuid
);

-- Orders: add session_id, is_paid
alter table public.orders
  add column if not exists session_id uuid references public.table_sessions(id) on delete set null;

alter table public.orders
  add column if not exists is_paid boolean not null default false;

-- RLS
alter table public.table_sessions enable row level security;
alter table public.payments enable row level security;

-- Policies mínimas: authenticated full access (endurecer después)
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'table_sessions_select_auth') then
    create policy table_sessions_select_auth on public.table_sessions
      for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'table_sessions_insert_auth') then
    create policy table_sessions_insert_auth on public.table_sessions
      for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'table_sessions_update_auth') then
    create policy table_sessions_update_auth on public.table_sessions
      for update to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'payments_select_auth') then
    create policy payments_select_auth on public.payments
      for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'payments_insert_auth') then
    create policy payments_insert_auth on public.payments
      for insert to authenticated with check (true);
  end if;
end $$;
