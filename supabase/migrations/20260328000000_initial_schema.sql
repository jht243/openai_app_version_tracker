-- ChatGPT App Tracker — apps + locked version snapshots
-- Run in Supabase SQL Editor or: supabase db push (if using Supabase CLI)

create table if not exists public.apps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subtitle text not null default '',
  description text not null default '',
  website_url text not null default '',
  support_url text not null default '',
  privacy_url text not null default '',
  terms_url text not null default '',
  demo_recording_url text not null default '',
  mcp_server_url text not null default '',
  test_cases jsonb not null default '[]'::jsonb,
  negative_test_cases jsonb not null default '[]'::jsonb,
  read_only_assessment text not null default '',
  open_world_assessment text not null default '',
  destructive_assessment text not null default '',
  github_repo_url text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'revision_needed')),
  notes text not null default '',
  release_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_versions (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps (id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  feedback text not null default '',
  feedback_received_at timestamptz,
  changes_made text not null default '',
  outcome text not null default 'pending'
    check (outcome in ('pending', 'approved', 'rejected', 'revision_requested')),
  commit_sha_at_submission text not null default '',
  locked boolean not null default true,
  unique (app_id, version_number)
);

create index if not exists idx_app_versions_app_id on public.app_versions (app_id);
create index if not exists idx_apps_updated_at on public.apps (updated_at desc);

alter table public.apps enable row level security;
alter table public.app_versions enable row level security;

-- MVP: allow read/write with the anon key. Lock this down before production:
-- e.g. Supabase Auth + policies on auth.uid(), or server-only service role + API routes.
create policy "apps_all" on public.apps for all using (true) with check (true);
create policy "app_versions_all" on public.app_versions for all using (true) with check (true);
