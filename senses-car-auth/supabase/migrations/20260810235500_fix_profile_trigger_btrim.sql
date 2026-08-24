-- Fix Auth signup trigger: trim is exposed as btrim in pg_catalog.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, company_name)
  values (
    new.id,
    nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'company_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
