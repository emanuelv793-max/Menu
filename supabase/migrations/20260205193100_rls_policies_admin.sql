-- RLS policies for admin access (authenticated)
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'orders_select_auth') then
    create policy "orders_select_auth"
      on public.orders
      for select
      to authenticated
      using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'orders_insert_auth') then
    create policy "orders_insert_auth"
      on public.orders
      for insert
      to authenticated
      with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'orders_update_auth') then
    create policy "orders_update_auth"
      on public.orders
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'order_items_select_auth') then
    create policy "order_items_select_auth"
      on public.order_items
      for select
      to authenticated
      using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'order_items_insert_auth') then
    create policy "order_items_insert_auth"
      on public.order_items
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

do $$
begin
  if to_regclass('public.order_item_modifiers') is not null then
    if not exists (select 1 from pg_policies where policyname = 'order_item_modifiers_select_auth') then
      create policy "order_item_modifiers_select_auth"
        on public.order_item_modifiers
        for select
        to authenticated
        using (true);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'order_item_modifiers_insert_auth') then
      create policy "order_item_modifiers_insert_auth"
        on public.order_item_modifiers
        for insert
        to authenticated
        with check (true);
    end if;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'table_sessions_select_auth') then
    create policy "table_sessions_select_auth"
      on public.table_sessions
      for select
      to authenticated
      using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'table_sessions_insert_auth') then
    create policy "table_sessions_insert_auth"
      on public.table_sessions
      for insert
      to authenticated
      with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'table_sessions_update_auth') then
    create policy "table_sessions_update_auth"
      on public.table_sessions
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'payments_select_auth') then
    create policy "payments_select_auth"
      on public.payments
      for select
      to authenticated
      using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'payments_insert_auth') then
    create policy "payments_insert_auth"
      on public.payments
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'app_error_logs_select_auth') then
    create policy "app_error_logs_select_auth"
      on public.app_error_logs
      for select
      to authenticated
      using (true);
  end if;
end $$;
