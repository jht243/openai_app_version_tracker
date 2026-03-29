alter table public.apps
  add column if not exists release_notes text not null default '';
