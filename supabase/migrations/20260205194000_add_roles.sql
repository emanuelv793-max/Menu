-- Roles: admin vs staff (single-tenant).

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','staff')),
  created_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;

-- Role helpers (owned by postgres when run via migrations)
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

-- user_roles policies
drop policy if exists user_roles_select_own on public.user_roles;
create policy "user_roles_select_own"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_roles_admin_manage on public.user_roles;
create policy "user_roles_admin_manage"
  on public.user_roles
  for insert
  to authenticated
  with check (public.is_admin());
create policy "user_roles_admin_manage_update"
  on public.user_roles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
create policy "user_roles_admin_manage_delete"
  on public.user_roles
  for delete
  to authenticated
  using (public.is_admin());

-- Orders: staff/admin
drop policy if exists orders_select_auth on public.orders;
drop policy if exists orders_insert_auth on public.orders;
drop policy if exists orders_update_auth on public.orders;
create policy "orders_select_staff"
  on public.orders
  for select
  to authenticated
  using (public.is_staff());
create policy "orders_insert_staff"
  on public.orders
  for insert
  to authenticated
  with check (public.is_staff());
create policy "orders_update_staff"
  on public.orders
  for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Order items: staff/admin
drop policy if exists order_items_select_auth on public.order_items;
drop policy if exists order_items_insert_auth on public.order_items;
create policy "order_items_select_staff"
  on public.order_items
  for select
  to authenticated
  using (public.is_staff());
create policy "order_items_insert_staff"
  on public.order_items
  for insert
  to authenticated
  with check (public.is_staff());

-- Order item modifiers: staff/admin
do $$
begin
  if to_regclass('public.order_item_modifiers') is not null then
    drop policy if exists order_item_modifiers_select_auth on public.order_item_modifiers;
    drop policy if exists order_item_modifiers_insert_auth on public.order_item_modifiers;
    create policy "order_item_modifiers_select_staff"
      on public.order_item_modifiers
      for select
      to authenticated
      using (public.is_staff());
    create policy "order_item_modifiers_insert_staff"
      on public.order_item_modifiers
      for insert
      to authenticated
      with check (public.is_staff());
  end if;
end $$;

-- Table sessions: staff/admin
drop policy if exists table_sessions_select_auth on public.table_sessions;
drop policy if exists table_sessions_insert_auth on public.table_sessions;
drop policy if exists table_sessions_update_auth on public.table_sessions;
create policy "table_sessions_select_staff"
  on public.table_sessions
  for select
  to authenticated
  using (public.is_staff());
create policy "table_sessions_insert_staff"
  on public.table_sessions
  for insert
  to authenticated
  with check (public.is_staff());
create policy "table_sessions_update_staff"
  on public.table_sessions
  for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Payments: staff/admin
drop policy if exists payments_select_auth on public.payments;
drop policy if exists payments_insert_auth on public.payments;
create policy "payments_select_staff"
  on public.payments
  for select
  to authenticated
  using (public.is_staff());
create policy "payments_insert_staff"
  on public.payments
  for insert
  to authenticated
  with check (public.is_staff());

-- App error logs: admin only
drop policy if exists app_error_logs_select_auth on public.app_error_logs;
create policy "app_error_logs_select_admin"
  on public.app_error_logs
  for select
  to authenticated
  using (public.is_admin());

-- Product modifiers: admin only
drop policy if exists product_modifiers_insert_auth on public.product_modifiers;
drop policy if exists product_modifiers_update_auth on public.product_modifiers;
drop policy if exists product_modifiers_delete_auth on public.product_modifiers;
create policy "product_modifiers_insert_admin"
  on public.product_modifiers
  for insert
  to authenticated
  with check (public.is_admin());
create policy "product_modifiers_update_admin"
  on public.product_modifiers
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
create policy "product_modifiers_delete_admin"
  on public.product_modifiers
  for delete
  to authenticated
  using (public.is_admin());

-- Products: admin only (public select already allowed)
drop policy if exists products_insert_admin on public.products;
drop policy if exists products_update_admin on public.products;
drop policy if exists products_delete_admin on public.products;
create policy "products_insert_admin"
  on public.products
  for insert
  to authenticated
  with check (public.is_admin());
create policy "products_update_admin"
  on public.products
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
create policy "products_delete_admin"
  on public.products
  for delete
  to authenticated
  using (public.is_admin());
