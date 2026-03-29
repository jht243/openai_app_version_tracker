alter table public.apps
  add column if not exists read_only_assessment text not null default '',
  add column if not exists open_world_assessment text not null default '',
  add column if not exists destructive_assessment text not null default '';
