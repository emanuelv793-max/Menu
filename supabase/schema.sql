-- Restaurants
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamptz not null default now()
);

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null,
  image_url text,
  category text,
  extras jsonb not null default '[]'::jsonb,
  excludes jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists products_restaurant_idx on public.products (restaurant_id);

-- Product modifiers (opciones de quitar/extra)
create table if not exists public.product_modifiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  type text not null check (type in ('remove','extra')),
  label text not null,
  price numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists product_modifiers_product_idx on public.product_modifiers (product_id);
alter table public.product_modifiers enable row level security;

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  table_number text not null,
  status text not null default 'enviado',
  total numeric(10,2) not null,
  created_at timestamptz not null default now(),
  served_at timestamptz
);
create index if not exists orders_restaurant_idx on public.orders (restaurant_id);
create index if not exists orders_status_idx on public.orders (status);

-- Order items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete restrict,
  quantity integer not null default 1,
  note text,
  price numeric(10,2) not null,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- Order item modifiers (se guardan para el histórico)
create table if not exists public.order_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid references public.order_items(id) on delete cascade,
  modifier_id uuid references public.product_modifiers(id) on delete set null,
  label text not null,
  type text not null check (type in ('remove','extra')),
  price numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists order_item_modifiers_item_idx on public.order_item_modifiers (order_item_id);
alter table public.order_item_modifiers enable row level security;

-- Realtime
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;

-- Table sessions (caja)
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
create unique index if not exists table_sessions_open_unique
  on public.table_sessions(restaurant_id, table_number)
  where status = 'open';
alter table public.table_sessions enable row level security;

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
alter table public.payments enable row level security;

-- App error logs
create table if not exists public.app_error_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'error',
  source text not null,
  message text not null,
  detail text,
  url text,
  context jsonb,
  created_at timestamptz not null default now()
);
alter table public.app_error_logs enable row level security;

-- User roles
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','staff')),
  created_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;

-- Role helpers
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('admin','staff')
  );
$$;

-- RLS enable
alter table public.restaurants enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Policies
-- restaurants: read public
create policy "restaurants_select_public"
  on public.restaurants
  for select
  to anon, authenticated
  using (true);

-- products: read public
create policy "products_select_public"
  on public.products
  for select
  to anon, authenticated
  using (true);

-- product modifiers: read public (para menú) y admin insert/update/delete solo authenticated
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'product_modifiers_select_public') then
    create policy "product_modifiers_select_public"
      on public.product_modifiers
      for select
      to anon, authenticated
      using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'product_modifiers_insert_admin') then
    create policy "product_modifiers_insert_admin"
      on public.product_modifiers
      for insert
      to authenticated
      with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'product_modifiers_update_admin') then
    create policy "product_modifiers_update_admin"
      on public.product_modifiers
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'product_modifiers_delete_admin') then
    create policy "product_modifiers_delete_admin"
      on public.product_modifiers
      for delete
      to authenticated
      using (public.is_admin());
  end if;
end $$;

-- orders: staff/admin access
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'orders_select_staff') then
    create policy "orders_select_staff"
      on public.orders
      for select
      to authenticated
      using (public.is_staff());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'orders_insert_staff') then
    create policy "orders_insert_staff"
      on public.orders
      for insert
      to authenticated
      with check (public.is_staff());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'orders_update_staff') then
    create policy "orders_update_staff"
      on public.orders
      for update
      to authenticated
      using (public.is_staff())
      with check (public.is_staff());
  end if;
end $$;

-- order_items: staff/admin access
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'order_items_select_staff') then
    create policy "order_items_select_staff"
      on public.order_items
      for select
      to authenticated
      using (public.is_staff());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'order_items_insert_staff') then
    create policy "order_items_insert_staff"
      on public.order_items
      for insert
      to authenticated
      with check (public.is_staff());
  end if;
end $$;

-- order_item_modifiers: staff/admin access
do $$
begin
  if to_regclass('public.order_item_modifiers') is not null then
    if not exists (select 1 from pg_policies where policyname = 'order_item_modifiers_select_staff') then
      create policy "order_item_modifiers_select_staff"
        on public.order_item_modifiers
        for select
        to authenticated
        using (public.is_staff());
    end if;
    if not exists (select 1 from pg_policies where policyname = 'order_item_modifiers_insert_staff') then
      create policy "order_item_modifiers_insert_staff"
        on public.order_item_modifiers
        for insert
        to authenticated
        with check (public.is_staff());
    end if;
  end if;
end $$;

-- table_sessions: staff/admin access
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'table_sessions_select_staff') then
    create policy "table_sessions_select_staff"
      on public.table_sessions
      for select
      to authenticated
      using (public.is_staff());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'table_sessions_insert_staff') then
    create policy "table_sessions_insert_staff"
      on public.table_sessions
      for insert
      to authenticated
      with check (public.is_staff());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'table_sessions_update_staff') then
    create policy "table_sessions_update_staff"
      on public.table_sessions
      for update
      to authenticated
      using (public.is_staff())
      with check (public.is_staff());
  end if;
end $$;

-- payments: staff/admin access
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'payments_select_staff') then
    create policy "payments_select_staff"
      on public.payments
      for select
      to authenticated
      using (public.is_staff());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'payments_insert_staff') then
    create policy "payments_insert_staff"
      on public.payments
      for insert
      to authenticated
      with check (public.is_staff());
  end if;
end $$;

-- app_error_logs: admin read
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'app_error_logs_select_admin') then
    create policy "app_error_logs_select_admin"
      on public.app_error_logs
      for select
      to authenticated
      using (public.is_admin());
  end if;
end $$;

-- products: admin write (public read)
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'products_insert_admin') then
    create policy "products_insert_admin"
      on public.products
      for insert
      to authenticated
      with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'products_update_admin') then
    create policy "products_update_admin"
      on public.products
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'products_delete_admin') then
    create policy "products_delete_admin"
      on public.products
      for delete
      to authenticated
      using (public.is_admin());
  end if;
end $$;

-- user_roles: self read + admin manage
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'user_roles_select_own') then
    create policy "user_roles_select_own"
      on public.user_roles
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'user_roles_admin_manage') then
    create policy "user_roles_admin_manage"
      on public.user_roles
      for insert
      to authenticated
      with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'user_roles_admin_manage_update') then
    create policy "user_roles_admin_manage_update"
      on public.user_roles
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'user_roles_admin_manage_delete') then
    create policy "user_roles_admin_manage_delete"
      on public.user_roles
      for delete
      to authenticated
      using (public.is_admin());
  end if;
end $$;

-- orders
create policy "orders_insert_anon"
  on public.orders
  for insert
  to anon, authenticated
  with check (true);

create policy "orders_select_auth"
  on public.orders
  for select
  to authenticated
  using (true);

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

-- order items
create policy "order_items_insert_anon"
  on public.order_items
  for insert
  to anon, authenticated
  with check (true);

create policy "order_items_select_auth"
  on public.order_items
  for select
  to authenticated
  using (true);

-- order item modifiers
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'order_item_modifiers_insert_anon') then
    create policy "order_item_modifiers_insert_anon"
      on public.order_item_modifiers
      for insert
      to anon, authenticated
      with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'order_item_modifiers_select_auth') then
    create policy "order_item_modifiers_select_auth"
      on public.order_item_modifiers
      for select
      to authenticated
      using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'order_item_modifiers_delete_auth') then
    create policy "order_item_modifiers_delete_auth"
      on public.order_item_modifiers
      for delete
      to authenticated
      using (true);
  end if;
end $$;

create policy "order_items_delete_auth"
  on public.order_items
  for delete
  to authenticated
  using (true);
