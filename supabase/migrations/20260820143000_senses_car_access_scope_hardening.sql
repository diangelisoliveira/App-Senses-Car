-- Harden the Brand + Store scope after the initial catalog migration.

create or replace function private.user_has_store_access(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.user_access ua on ua.user_id = p.id
    join public.stores s on s.id = ua.store_id and s.brand_id = ua.brand_id
    join public.brands b on b.id = ua.brand_id and b.id = s.brand_id
    where p.id = (select auth.uid())
      and p.role = 'gerente'
      and p.is_active = true
      and s.id = p_store_id
      and s.is_active = true
      and b.is_active = true
  );
$$;

drop policy if exists "Admins can insert store links" on public.user_access;

create policy "Admins can insert store links"
  on public.user_access for insert
  to authenticated
  with check (
    (select private.is_admin())
    and user_id is not null
    and brand_id is not null
    and store_id is not null
    and created_by = (select auth.uid())
  );

revoke all on function private.user_has_store_access(uuid) from public, anon, authenticated;
grant execute on function private.user_has_store_access(uuid) to authenticated;
