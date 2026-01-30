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
  created_at timestamptz not null default now()
);
create index if not exists products_restaurant_idx on public.products (restaurant_id);

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

-- Realtime
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;

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

create policy "order_items_delete_auth"
  on public.order_items
  for delete
  to authenticated
  using (true);
