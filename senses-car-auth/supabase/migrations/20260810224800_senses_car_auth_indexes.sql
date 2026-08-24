create index if not exists user_favorites_fragrance_idx
  on public.user_favorites (fragrance_id);

drop index if exists public.user_favorites_user_idx;
