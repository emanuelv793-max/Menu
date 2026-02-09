-- Ensure modifier tables exist for orders and realtime.

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

-- Realtime publication: order item modifiers
do $$
begin
  begin
    alter publication supabase_realtime add table public.order_item_modifiers;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
