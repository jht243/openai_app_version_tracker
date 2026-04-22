alter table public.apps
  add column if not exists live_app_url text not null default '';
