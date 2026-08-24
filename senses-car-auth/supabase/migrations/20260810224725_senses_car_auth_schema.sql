-- Senses Car: Auth and fragrance discovery foundation
create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  company_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.fragrance_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  category text not null,
  description text not null,
  notes text[] not null default '{}'::text[],
  intensity smallint not null check (intensity between 1 and 5),
  accent_color text not null default '#D6A667' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  fragrance_id uuid not null references public.fragrance_catalog(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, fragrance_id)
);

create index if not exists fragrance_catalog_active_created_idx
  on public.fragrance_catalog (is_active, created_at desc);

alter table public.profiles enable row level security;
alter table public.fragrance_catalog enable row level security;
alter table public.user_favorites enable row level security;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.timezone('utc', pg_catalog.now());
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

revoke all on schema private from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;

drop policy if exists "Profiles are readable by their owner" on public.profiles;
create policy "Profiles are readable by their owner"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Profiles are editable by their owner" on public.profiles;
create policy "Profiles are editable by their owner"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Active fragrances are public" on public.fragrance_catalog;
create policy "Active fragrances are public"
  on public.fragrance_catalog for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Favorites are readable by their owner" on public.user_favorites;
create policy "Favorites are readable by their owner"
  on public.user_favorites for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Favorites are creatable by their owner" on public.user_favorites;
create policy "Favorites are creatable by their owner"
  on public.user_favorites for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Favorites are removable by their owner" on public.user_favorites;
create policy "Favorites are removable by their owner"
  on public.user_favorites for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select (id, full_name, phone, company_name, avatar_url, created_at, updated_at)
  on public.profiles to authenticated;
grant update (full_name, phone, company_name, avatar_url)
  on public.profiles to authenticated;
grant select on public.fragrance_catalog to anon, authenticated;
grant select, insert, delete on public.user_favorites to authenticated;

insert into public.fragrance_catalog
  (name, slug, category, description, notes, intensity, accent_color)
values
  (
    'Couro Solar',
    'couro-solar',
    'Amadeirado',
    'Uma assinatura quente e elegante, inspirada no couro aquecido pelo sol e no acabamento preciso de um cockpit premium.',
    array['Couro', 'Âmbar', 'Cedro'],
    5,
    '#D6A667'
  ),
  (
    'Citrus Drive',
    'citrus-drive',
    'Cítrico',
    'Frescor de saída com energia limpa e uma base mineral que traduz movimento, precisão e presença.',
    array['Bergamota', 'Gengibre', 'Vetiver'],
    3,
    '#B6D98A'
  ),
  (
    'Velvet Oud',
    'velvet-oud',
    'Oud',
    'Profundo e envolvente, combina madeiras escuras e especiarias suaves para uma jornada sensorial noturna.',
    array['Oud', 'Íris', 'Sândalo'],
    4,
    '#C9A7D6'
  ),
  (
    'Green Circuit',
    'green-circuit',
    'Verde aromático',
    'Uma composição translúcida e fresca, com a mesma sensação de cabine limpa depois de ligar o motor.',
    array['Folhas Verdes', 'Alecrim', 'Almíscar'],
    2,
    '#8CC8B0'
  )
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  notes = excluded.notes,
  intensity = excluded.intensity,
  accent_color = excluded.accent_color,
  is_active = true;
