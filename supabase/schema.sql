-- Tabla de pedidos para Menu Lungo
create table if not exists public.orders (
  id bigserial primary key,
  table_number text not null,
  items jsonb not null,
  total numeric(10,2) not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  served_at timestamptz
);

alter table public.orders
  add column if not exists served_at timestamptz;

-- Realtime
alter publication supabase_realtime add table public.orders;

-- RLS
alter table public.orders enable row level security;

-- Permitir insertar y leer pedidos solo a usuarios autenticados
create policy "orders_select_auth"
  on public.orders
  for select
  to authenticated
  using (true);

create policy "orders_insert_anon"
  on public.orders
  for insert
  to anon, authenticated
  with check (true);

create policy "orders_update_auth"
  on public.orders
  for update
  to authenticated
  using (true)
  with check (true);

create policy "orders_delete_auth"
  on public.orders
  for delete
  to authenticated
  using (true);
