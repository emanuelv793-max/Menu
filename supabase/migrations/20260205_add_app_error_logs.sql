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
