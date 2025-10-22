-- Creates tables required by enhanced Google Calendar sync.
create extension if not exists "pgcrypto";

-- 1) sync_operations (client reads this for status/analytics)
create table if not exists public.sync_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text,
  entity_id text,
  operation_type text,
  operation_status text,
  sync_direction text,
  sync_type text,
  google_event_id text,
  conflict_data jsonb,
  error_message text,
  retry_count int default 0,
  last_attempted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.sync_operations enable row level security;
create policy "sync_operations_read_own"
  on public.sync_operations for select
  to authenticated
  using (user_id = auth.uid());
create index if not exists sync_operations_user_created_idx
  on public.sync_operations (user_id, created_at desc);

-- 2) google_event_mappings (service_role uses this)
create table if not exists public.google_event_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  google_event_id text not null,
  google_event_updated timestamptz,
  local_event_updated timestamptz,
  last_synced_at timestamptz default now(),
  sync_hash text,
  created_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id),
  unique (user_id, google_event_id)
);
alter table public.google_event_mappings enable row level security;

-- 3) google_sync_tokens (service_role uses this)
create table if not exists public.google_sync_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id text not null default 'primary',
  sync_token text not null,
  last_used_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists google_sync_tokens_user_cal_idx
  on public.google_sync_tokens (user_id, calendar_id, last_used_at desc);
alter table public.google_sync_tokens enable row level security;

-- 4) google_calendar_channels (client reads this to show RT status)
create table if not exists public.google_calendar_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_id text not null,
  resource_id text not null,
  calendar_id text not null default 'primary',
  webhook_url text not null,
  expiration timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (channel_id)
);
alter table public.google_calendar_channels enable row level security;
create policy "calendar_channels_read_own"
  on public.google_calendar_channels for select
  to authenticated
  using (user_id = auth.uid());

-- 5) sync_conflicts (service_role logs and resolves)
create table if not exists public.sync_conflicts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  google_event_id text not null,
  conflict_type text not null,
  local_data jsonb not null,
  google_data jsonb not null,
  resolution_preference text,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.sync_conflicts enable row level security;

-- Allow service_role full access for edge functions
grant all on table public.sync_operations, public.google_event_mappings, public.google_sync_tokens,
  public.google_calendar_channels, public.sync_conflicts to service_role;