-- Add 'live' to the allowed values for the status column on apps.
-- Run in the Supabase SQL Editor: https://supabase.com/dashboard/project/weppjarlttrfecksvmws/sql

alter table public.apps
  drop constraint if exists apps_status_check;

alter table public.apps
  add constraint apps_status_check
    check (status in ('draft', 'in_review', 'revision_needed', 'live'));
