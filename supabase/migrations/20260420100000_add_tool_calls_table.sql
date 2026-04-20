-- Tool call usage tracking for live apps.
-- Run in Supabase SQL Editor or: supabase db push

create table if not exists public.tool_calls (
  id          uuid primary key default gen_random_uuid(),
  app_id      uuid not null references public.apps (id) on delete cascade,
  tool_name   text not null,
  called_at   timestamptz not null default now()
);

create index if not exists idx_tool_calls_app_id_called_at
  on public.tool_calls (app_id, called_at desc);

create index if not exists idx_tool_calls_called_at
  on public.tool_calls (called_at desc);

alter table public.tool_calls enable row level security;

create policy "tool_calls_all"
  on public.tool_calls
  for all
  using (true)
  with check (true);
