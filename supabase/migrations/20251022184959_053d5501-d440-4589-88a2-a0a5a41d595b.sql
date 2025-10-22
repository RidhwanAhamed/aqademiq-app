-- Grant service_role full access for edge functions (safe to re-run)
grant all on table public.sync_operations to service_role;
grant all on table public.google_event_mappings to service_role;
grant all on table public.google_sync_tokens to service_role;
grant all on table public.google_calendar_channels to service_role;
grant all on table public.sync_conflicts to service_role;

-- Ensure indexes exist (IF NOT EXISTS is safe)
create index if not exists sync_operations_user_created_idx
  on public.sync_operations (user_id, created_at desc);

create index if not exists google_sync_tokens_user_cal_idx
  on public.google_sync_tokens (user_id, calendar_id, last_used_at desc);

-- Create missing RLS policy for calendar_channels if it doesn't exist
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'google_calendar_channels' 
    and policyname = 'calendar_channels_read_own'
  ) then
    create policy "calendar_channels_read_own"
      on public.google_calendar_channels for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;