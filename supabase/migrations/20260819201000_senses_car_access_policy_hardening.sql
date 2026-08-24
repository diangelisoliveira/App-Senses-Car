-- Senses Car: consolidate RLS policies so admin overrides do not create
-- multiple permissive policies for the same role and operation.

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

create policy "Admins can insert profiles"
  on public.profiles for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "Owners or admins can update profiles"
  on public.profiles for update
  to authenticated
  using (
    (select private.is_admin())
    or (
      (select auth.uid()) = id
      and (
        (role is null and is_active = false)
        or (role = 'gerente' and is_active = true)
      )
    )
  )
  with check (
    (select private.is_admin())
    or (
      (select auth.uid()) = id
      and (
        (role is null and is_active = false)
        or (role = 'gerente' and is_active = true)
      )
    )
  );

create policy "Admins can delete profiles"
  on public.profiles for delete
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Active users can view active fragrances" on public.fragrance_catalog;
drop policy if exists "Admins can manage fragrances" on public.fragrance_catalog;

create policy "Active users can view active fragrances"
  on public.fragrance_catalog for select
  to authenticated
  using (
    (select private.is_admin())
    or (
      is_active = true
      and (select private.is_active_user())
    )
  );

create policy "Admins can insert fragrances"
  on public.fragrance_catalog for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "Admins can update fragrances"
  on public.fragrance_catalog for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admins can delete fragrances"
  on public.fragrance_catalog for delete
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "Active users can view their favorites" on public.user_favorites;
drop policy if exists "Active users can create their favorites" on public.user_favorites;
drop policy if exists "Active users can remove their favorites" on public.user_favorites;
drop policy if exists "Admins can manage all favorites" on public.user_favorites;

create policy "Active users can view their favorites"
  on public.user_favorites for select
  to authenticated
  using (
    (select private.is_admin())
    or (
      (select private.is_active_user())
      and (select auth.uid()) = user_id
    )
  );

create policy "Active users can create their favorites"
  on public.user_favorites for insert
  to authenticated
  with check (
    (select private.is_admin())
    or (
      (select private.is_active_user())
      and (select auth.uid()) = user_id
    )
  );

create policy "Active users can remove their favorites"
  on public.user_favorites for delete
  to authenticated
  using (
    (select private.is_admin())
    or (
      (select private.is_active_user())
      and (select auth.uid()) = user_id
    )
  );

create policy "Admins can update all favorites"
  on public.user_favorites for update
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

create policy "Admins can insert store links"
  on public.user_stores for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "Admins can update store links"
  on public.user_stores for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admins can delete store links"
  on public.user_stores for delete
  to authenticated
  using ((select private.is_admin()));


