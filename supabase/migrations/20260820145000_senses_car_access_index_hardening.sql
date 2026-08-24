-- Cover the foreign-key lookup paths and remove the duplicate legacy index
-- left behind when user_stores was renamed to user_access.

drop index if exists public.user_stores_store_user_idx;

create index if not exists user_access_store_brand_idx
  on public.user_access (store_id, brand_id);

create index if not exists user_access_created_by_idx
  on public.user_access (created_by);
