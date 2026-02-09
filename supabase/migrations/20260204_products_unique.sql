-- Asegura unicidad por restaurante/nombre y lectura pública del catálogo
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_restaurant_name_key'
  ) then
    alter table public.products
      add constraint products_restaurant_name_key unique (restaurant_id, name);
  end if;
end $$;

-- Refuerza defaults de modificadores
alter table public.products alter column extras set default '[]'::jsonb;
alter table public.products alter column excludes set default '[]'::jsonb;
update public.products set extras = '[]'::jsonb where extras is null;
update public.products set excludes = '[]'::jsonb where excludes is null;

-- Política de lectura pública para el salón
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'products_select_public') then
    create policy products_select_public
      on public.products
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;
