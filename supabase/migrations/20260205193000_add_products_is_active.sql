alter table public.products
  add column if not exists is_active boolean default true;

update public.products
  set is_active = true
  where is_active is null;

alter table public.products
  alter column is_active set not null;
