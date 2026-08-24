-- Senses Car: server-side authorization gate for the read-only Comissões view.
-- Operational records remain local in this version; the function prevents the
-- frontend from opening the administrative route without an authoritative role check.

create or replace function public.can_view_commissions()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.is_admin();
$$;

revoke all on function public.can_view_commissions() from public, anon, authenticated;
grant execute on function public.can_view_commissions() to authenticated;
