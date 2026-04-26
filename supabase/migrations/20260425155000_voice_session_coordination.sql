-- Voice/session backend refactor persistence.
-- This migration keeps the existing frontend-compatible tables and adds durable
-- coordination state for Retell-driven demo sessions.

create table if not exists public.demo_voice_sessions (
  id text primary key,
  call_id text unique,
  profile_id text not null,
  scenario_id text not null,
  active_station_id text references public.stations(id),
  active_route jsonb,
  cart_state jsonb not null default '{}'::jsonb,
  checkout_state jsonb not null default '{}'::jsonb,
  loyalty_state jsonb not null default '{}'::jsonb,
  recommendation_state jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demo_session_coordination_events (
  id bigserial primary key,
  session_id text not null references public.demo_voice_sessions(id) on delete cascade,
  call_id text,
  sequence_number integer not null,
  event_type text not null,
  actor text not null default 'system',
  title text not null,
  detail text,
  status text not null default 'accepted',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, sequence_number)
);

create table if not exists public.voice_agent_actions (
  id bigserial primary key,
  session_id text references public.demo_voice_sessions(id) on delete cascade,
  call_id text,
  action_type text not null,
  status text not null default 'accepted',
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.express_demo_call_recommendations (
  call_id text primary key,
  active_station_id text not null references public.stations(id),
  reason text,
  eta_minutes integer,
  updated_at timestamptz not null default now()
);

alter table public.transcript_lines
  add column if not exists sequence_number integer,
  add column if not exists source text not null default 'webhook',
  add column if not exists retell_event_id text;

alter table public.demo_voice_sessions
  add column if not exists checkout_state jsonb not null default '{}'::jsonb,
  add column if not exists loyalty_state jsonb not null default '{}'::jsonb;

create index if not exists demo_voice_sessions_call_id_idx
  on public.demo_voice_sessions (call_id);

create index if not exists demo_session_coordination_events_session_idx
  on public.demo_session_coordination_events (session_id, sequence_number);

create index if not exists voice_agent_actions_session_idx
  on public.voice_agent_actions (session_id, created_at);

create index if not exists transcript_lines_call_sequence_idx
  on public.transcript_lines (call_id, sequence_number);

create unique index if not exists transcript_lines_retell_event_unique_idx
  on public.transcript_lines (call_id, retell_event_id)
  where retell_event_id is not null;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'demo_session_coordination_events'
    ) then
      alter publication supabase_realtime add table public.demo_session_coordination_events;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'demo_voice_sessions'
    ) then
      alter publication supabase_realtime add table public.demo_voice_sessions;
    end if;
  end if;
end $$;

alter table public.demo_voice_sessions enable row level security;
alter table public.demo_session_coordination_events enable row level security;
alter table public.voice_agent_actions enable row level security;
alter table public.express_demo_call_recommendations enable row level security;

drop policy if exists "authenticated can read demo voice sessions" on public.demo_voice_sessions;
create policy "authenticated can read demo voice sessions"
  on public.demo_voice_sessions for select
  to authenticated
  using (true);

drop policy if exists "authenticated can read coordination events" on public.demo_session_coordination_events;
create policy "authenticated can read coordination events"
  on public.demo_session_coordination_events for select
  to authenticated
  using (true);

drop policy if exists "authenticated can read voice agent actions" on public.voice_agent_actions;
create policy "authenticated can read voice agent actions"
  on public.voice_agent_actions for select
  to authenticated
  using (true);

drop policy if exists "authenticated can read express demo recommendations" on public.express_demo_call_recommendations;
create policy "authenticated can read express demo recommendations"
  on public.express_demo_call_recommendations for select
  to authenticated
  using (true);
