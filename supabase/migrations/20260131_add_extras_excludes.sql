-- Añade campos de modificaciones directamente en products
alter table public.products
  add column if not exists extras jsonb not null default '[]'::jsonb;

alter table public.products
  add column if not exists excludes jsonb not null default '[]'::jsonb;

-- Normaliza nulos existentes
update public.products set extras = '[]'::jsonb where extras is null;
update public.products set excludes = '[]'::jsonb where excludes is null;
