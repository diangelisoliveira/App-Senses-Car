-- Senses Car: core profiles, store membership, and RLS authorization.
-- This migration intentionally does not create business-domain tables.

create schema if not exists private;

alter table public.profiles
  add column if not exists email text,
  add column if not exists role text,
  add column if not exists is_active boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role is null or role in ('admin', 'gerente'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_active_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_active_role_check
      check (not is_active or role is not null);
  end if;
end
$$;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_stores (
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, store_id)
);

create index if not exists user_stores_store_user_idx
  on public.user_stores (store_id, user_id);

alter table public.profiles enable row level security;
alter table public.fragrance_catalog enable row level security;
alter table public.user_favorites enable row level security;
alter table public.stores enable row level security;
alter table public.user_stores enable row level security;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, company_name)
  values (
    new.id,
    new.email,
    nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'company_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function private.sync_user_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;
  return new;
end;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.is_active = true
  );
$$;

create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'gerente')
      and p.is_active = true
  );
$$;

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
    join public.user_stores us on us.user_id = p.id
    where p.id = (select auth.uid())
      and p.role = 'gerente'
      and p.is_active = true
      and us.store_id = p_store_id
  );
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop trigger if exists on_auth_user_updated_profile_email on auth.users;
create trigger on_auth_user_updated_profile_email
  after update of email on auth.users
  for each row execute function private.sync_user_profile_email();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

drop trigger if exists stores_set_updated_at on public.stores;
create trigger stores_set_updated_at
  before update on public.stores
  for each row execute function private.set_updated_at();

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and p.email is distinct from u.email;

do $$
declare
  user_count bigint;
  active_admin_count bigint;
begin
  select count(*) into user_count from auth.users;
  select count(*)
  into active_admin_count
  from public.profiles
  where role = 'admin'
    and is_active = true;

  if active_admin_count = 0 then
    if user_count <> 1 then
      raise exception
        'Safe admin bootstrap requires exactly one Auth user; found %',
        user_count;
    end if;

    update public.profiles p
    set role = 'admin',
        is_active = true
    from auth.users u
    where p.id = u.id;

    if not exists (
      select 1
      from public.profiles
      where role = 'admin'
        and is_active = true
    ) then
      raise exception 'The existing Auth user has no matching profile';
    end if;
  end if;
end
$$;

drop policy if exists "Profiles are readable by their owner" on public.profiles;
drop policy if exists "Profiles are editable by their owner" on public.profiles;
drop policy if exists "Profiles are readable by owner or admin" on public.profiles;
drop policy if exists "Admins can manage profiles" on public.profiles;
drop policy if exists "Users can edit their pending profile" on public.profiles;
drop policy if exists "Managers can edit their own profile" on public.profiles;

create policy "Profiles are readable by owner or admin"
  on public.profiles for select
  to authenticated
  using (
    (select private.is_admin())
    or (select auth.uid()) = id
  );

create policy "Admins can manage profiles"
  on public.profiles for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Users can edit their pending profile"
  on public.profiles for update
  to authenticated
  using (
    (select auth.uid()) = id
    and role is null
    and is_active = false
  )
  with check (
    (select auth.uid()) = id
    and role is null
    and is_active = false
  );

create policy "Managers can edit their own profile"
  on public.profiles for update
  to authenticated
  using (
    (select auth.uid()) = id
    and role = 'gerente'
    and is_active = true
  )
  with check (
    (select auth.uid()) = id
    and role = 'gerente'
    and is_active = true
  );

drop policy if exists "Active fragrances are public" on public.fragrance_catalog;
drop policy if exists "Active users can view active fragrances" on public.fragrance_catalog;
drop policy if exists "Admins can manage fragrances" on public.fragrance_catalog;

create policy "Active users can view active fragrances"
  on public.fragrance_catalog for select
  to authenticated
  using (
    is_active = true
    and (select private.is_active_user())
  );

create policy "Admins can manage fragrances"
  on public.fragrance_catalog for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Favorites are readable by their owner" on public.user_favorites;
drop policy if exists "Favorites are creatable by their owner" on public.user_favorites;
drop policy if exists "Favorites are removable by their owner" on public.user_favorites;
drop policy if exists "Active users can view their favorites" on public.user_favorites;
drop policy if exists "Active users can create their favorites" on public.user_favorites;
drop policy if exists "Active users can remove their favorites" on public.user_favorites;
drop policy if exists "Admins can manage all favorites" on public.user_favorites;

create policy "Active users can view their favorites"
  on public.user_favorites for select
  to authenticated
  using (
    (select private.is_active_user())
    and (select auth.uid()) = user_id
  );

create policy "Active users can create their favorites"
  on public.user_favorites for insert
  to authenticated
  with check (
    (select private.is_active_user())
    and (select auth.uid()) = user_id
  );

create policy "Active users can remove their favorites"
  on public.user_favorites for delete
  to authenticated
  using (
    (select private.is_active_user())
    and (select auth.uid()) = user_id
  );

create policy "Admins can manage all favorites"
  on public.user_favorites for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Active users can view assigned stores" on public.stores;
drop policy if exists "Admins can manage stores" on public.stores;

create policy "Active users can view assigned stores"
  on public.stores for select
  to authenticated
  using (
    (select private.is_admin())
    or (select private.user_has_store_access(id))
  );

create policy "Admins can manage stores"
  on public.stores for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "Users can view their own store links" on public.user_stores;
drop policy if exists "Admins can manage store links" on public.user_stores;

create policy "Users can view their own store links"
  on public.user_stores for select
  to authenticated
  using (
    (select private.is_admin())
    or (
      user_id = (select auth.uid())
      and (select private.is_active_user())
    )
  );

create policy "Admins can manage store links"
  on public.user_stores for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

revoke all on table public.profiles, public.fragrance_catalog, public.user_favorites,
  public.stores, public.user_stores from anon;

revoke all on table public.profiles, public.fragrance_catalog, public.user_favorites,
  public.stores, public.user_stores from authenticated;

grant select on table public.profiles to authenticated;
grant update (full_name, phone, company_name, avatar_url, role, is_active)
  on table public.profiles to authenticated;
grant insert, delete on table public.profiles to authenticated;

grant select, insert, update, delete
  on table public.fragrance_catalog, public.user_favorites,
    public.stores, public.user_stores to authenticated;

grant all on table public.profiles, public.fragrance_catalog, public.user_favorites,
  public.stores, public.user_stores to service_role;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.sync_user_profile_email() from public, anon, authenticated;
revoke all on function private.is_admin() from public, anon, authenticated;
revoke all on function private.is_active_user() from public, anon, authenticated;
revoke all on function private.user_has_store_access(uuid) from public, anon, authenticated;

grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.user_has_store_access(uuid) to authenticated;


