-- Senses Car: canonical brand/store catalog and exact access scope.
-- The current project has an empty public.stores/user_stores catalog. This
-- migration centralizes the versioned BRAND_STORES pairs in Supabase without
-- creating a second access table alongside the legacy user_stores relation.

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists brands_name_lower_key
  on public.brands (lower(btrim(name)));

alter table public.stores
  add column if not exists brand_id uuid;

do $$
begin
  if exists (select 1 from public.stores where brand_id is null) then
    raise exception
      'Cannot centralize stores: every existing store must be mapped to a brand before this migration';
  end if;
end
$$;

alter table public.stores
  drop constraint if exists stores_name_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stores_brand_id_fkey'
      and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
      add constraint stores_brand_id_fkey
      foreign key (brand_id) references public.brands(id) on delete restrict;
  end if;
end
$$;

create unique index if not exists stores_brand_name_lower_key
  on public.stores (brand_id, lower(btrim(name)));

insert into public.brands (name)
values ('Fiat'), ('Jeep'), ('Nissan'), ('BYD')
on conflict do nothing;

insert into public.stores (brand_id, name)
select b.id, v.name
from (values
  ('Fiat', 'NAÇÕES UNIDAS'),
  ('Fiat', 'CEASA'),
  ('Fiat', 'ARICANDUVA'),
  ('Fiat', 'OSASCO'),
  ('Jeep', 'SUMARÉ'),
  ('Jeep', 'ARICANDUVA'),
  ('Jeep', 'CEASA'),
  ('Jeep', 'GUARULHOS'),
  ('Jeep', 'WASHINGTON LUIZ'),
  ('Jeep', 'VILA GUILHERME'),
  ('Nissan', 'BRAZ LEME'),
  ('Nissan', 'CEASA'),
  ('BYD', 'SANTO AMARO/ITAIM'),
  ('BYD', 'W. LUIZ (AEROPORTO)'),
  ('BYD', 'CEASA'),
  ('BYD', 'ARICANDUVA'),
  ('BYD', 'VILA GUILHERME')
) as v(brand_name, name)
join public.brands b on lower(b.name) = lower(v.brand_name)
on conflict do nothing;

alter table public.stores
  alter column brand_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stores_id_brand_id_key'
      and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
      add constraint stores_id_brand_id_key unique (id, brand_id);
  end if;
end
$$;

drop trigger if exists brands_set_updated_at on public.brands;
create trigger brands_set_updated_at
  before update on public.brands
  for each row execute function private.set_updated_at();

do $$
begin
  if to_regclass('public.user_access') is null
     and to_regclass('public.user_stores') is not null then
    alter table public.user_stores rename to user_access;
  end if;
end
$$;

create table if not exists public.user_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete restrict,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.user_access
  add column if not exists id uuid;

update public.user_access
set id = gen_random_uuid()
where id is null;

alter table public.user_access
  alter column id set default gen_random_uuid(),
  alter column id set not null;

alter table public.user_access
  add column if not exists brand_id uuid,
  add column if not exists created_by uuid;

update public.user_access ua
set brand_id = s.brand_id
from public.stores s
where s.id = ua.store_id
  and ua.brand_id is null;

do $$
begin
  if exists (select 1 from public.user_access where brand_id is null) then
    raise exception
      'Cannot migrate user access: every existing store link must resolve to a brand';
  end if;
end
$$;

update public.user_access ua
set created_by = p.id
from public.profiles p
where ua.created_by is null
  and p.role = 'admin'
  and p.is_active = true;

alter table public.user_access
  alter column brand_id set not null,
  alter column created_by set default auth.uid();

alter table public.user_access
  drop constraint if exists user_stores_pkey;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_access_pkey'
      and conrelid = 'public.user_access'::regclass
  ) then
    alter table public.user_access
      add constraint user_access_pkey primary key (id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_access_brand_id_fkey'
      and conrelid = 'public.user_access'::regclass
  ) then
    alter table public.user_access
      add constraint user_access_brand_id_fkey
      foreign key (brand_id) references public.brands(id) on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_access_store_brand_fkey'
      and conrelid = 'public.user_access'::regclass
  ) then
    alter table public.user_access
      add constraint user_access_store_brand_fkey
      foreign key (store_id, brand_id)
      references public.stores(id, brand_id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_access_created_by_fkey'
      and conrelid = 'public.user_access'::regclass
  ) then
    alter table public.user_access
      add constraint user_access_created_by_fkey
      foreign key (created_by) references auth.users(id) on delete set null;
  end if;
end
$$;

create unique index if not exists user_access_user_brand_store_key
  on public.user_access (user_id, brand_id, store_id);
create index if not exists user_access_store_user_idx
  on public.user_access (store_id, user_id);
create index if not exists user_access_brand_user_idx
  on public.user_access (brand_id, user_id);

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

create or replace function private.user_has_brand_access(p_brand_id uuid)
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
    join public.brands b on b.id = ua.brand_id
    join public.stores s on s.id = ua.store_id and s.brand_id = ua.brand_id
    where p.id = (select auth.uid())
      and p.role = 'gerente'
      and p.is_active = true
      and b.id = p_brand_id
      and b.is_active = true
      and s.is_active = true
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
    join public.user_access ua on ua.user_id = p.id
    join public.stores s on s.id = ua.store_id and s.brand_id = ua.brand_id
    where p.id = (select auth.uid())
      and p.role = 'gerente'
      and p.is_active = true
      and s.id = p_store_id
      and s.is_active = true
  );
$$;

create or replace function private.prevent_last_admin_loss()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'admin'
       and old.is_active = true
       and not exists (
         select 1 from public.profiles p
         where p.id <> old.id and p.role = 'admin' and p.is_active = true
       ) then
      raise exception 'The last active administrator cannot be removed';
    end if;
    return old;
  end if;

  if old.role = 'admin'
     and old.is_active = true
     and (new.role is distinct from 'admin' or new.is_active is distinct from true)
     and not exists (
       select 1 from public.profiles p
       where p.id <> old.id and p.role = 'admin' and p.is_active = true
     ) then
    raise exception 'The last active administrator cannot be demoted or deactivated';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_last_admin_loss on public.profiles;
create trigger profiles_prevent_last_admin_loss
  before update or delete on public.profiles
  for each row execute function private.prevent_last_admin_loss();

alter table public.brands enable row level security;
alter table public.stores enable row level security;
alter table public.user_access enable row level security;

drop policy if exists "Active users can view brands" on public.brands;
drop policy if exists "Admins can manage brands" on public.brands;
drop policy if exists "Admins can insert brands" on public.brands;
drop policy if exists "Admins can update brands" on public.brands;
drop policy if exists "Admins can delete brands" on public.brands;

create policy "Active users can view brands"
  on public.brands for select
  to authenticated
  using (
    (select private.is_admin())
    or (
      is_active = true
      and (select private.is_active_user())
      and (select private.user_has_brand_access(id))
    )
  );

create policy "Admins can insert brands"
  on public.brands for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "Admins can update brands"
  on public.brands for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admins can delete brands"
  on public.brands for delete
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Active users can view assigned stores" on public.stores;
drop policy if exists "Admins can manage stores" on public.stores;
drop policy if exists "Admins can insert stores" on public.stores;
drop policy if exists "Admins can update stores" on public.stores;
drop policy if exists "Admins can delete stores" on public.stores;

create policy "Active users can view assigned stores"
  on public.stores for select
  to authenticated
  using (
    (select private.is_admin())
    or (select private.user_has_store_access(id))
  );

create policy "Admins can insert stores"
  on public.stores for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "Admins can update stores"
  on public.stores for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admins can delete stores"
  on public.stores for delete
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Users can view their own store links" on public.user_access;
drop policy if exists "Admins can manage store links" on public.user_access;
drop policy if exists "Admins can insert store links" on public.user_access;
drop policy if exists "Admins can update store links" on public.user_access;
drop policy if exists "Admins can delete store links" on public.user_access;

create policy "Users can view their own store links"
  on public.user_access for select
  to authenticated
  using (
    (select private.is_admin())
    or (
      user_id = (select auth.uid())
      and (select private.is_active_user())
    )
  );

create policy "Admins can insert store links"
  on public.user_access for insert
  to authenticated
  with check (
    (select private.is_admin())
    and user_id is not null
    and brand_id is not null
    and store_id is not null
  );

create policy "Admins can update store links"
  on public.user_access for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admins can delete store links"
  on public.user_access for delete
  to authenticated
  using ((select private.is_admin()));

revoke all on table public.brands, public.stores, public.user_access from anon;
revoke all on table public.brands, public.stores, public.user_access from authenticated;

grant select, insert, update, delete
  on table public.brands, public.stores, public.user_access to authenticated;
grant all
  on table public.brands, public.stores, public.user_access to service_role;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

revoke all on function private.is_admin() from public, anon, authenticated;
revoke all on function private.is_active_user() from public, anon, authenticated;
revoke all on function private.user_has_brand_access(uuid) from public, anon, authenticated;
revoke all on function private.user_has_store_access(uuid) from public, anon, authenticated;
revoke all on function private.prevent_last_admin_loss() from public, anon, authenticated;

grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.user_has_brand_access(uuid) to authenticated;
grant execute on function private.user_has_store_access(uuid) to authenticated;

