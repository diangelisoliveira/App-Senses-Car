-- Correct the two historical store names that were inserted with
-- UTF-8 bytes interpreted as Windows-1252 during the initial seed.

update public.stores
set name = 'NA' || chr(199) || chr(213) || 'ES UNIDAS',
    updated_at = timezone('utc', now())
where name = convert_from(
  decode('4e41c383e280a1c383e280a2455320554e49444153', 'hex'),
  'UTF8'
);

update public.stores
set name = 'SUMAR' || chr(201),
    updated_at = timezone('utc', now())
where name = convert_from(
  decode('53554d4152c383e280b0', 'hex'),
  'UTF8'
);

do $$
begin
  if exists (
    select 1
    from public.stores
    where name in (
      convert_from(decode('4e41c383e280a1c383e280a2455320554e49444153', 'hex'), 'UTF8'),
      convert_from(decode('53554d4152c383e280b0', 'hex'), 'UTF8')
    )
  ) then
    raise exception 'Historical mojibake store names remain in public.stores';
  end if;
end;
$$;
