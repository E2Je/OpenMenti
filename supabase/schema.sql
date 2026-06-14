-- ============================================================================
-- OpenMenti - database schema + RLS
-- Run in the Supabase SQL editor (or `supabase db push`).
--
-- Security model:
--   * Presenters/creators are AUTHENTICATED users. They own presentations and
--     are the ONLY writers to aggregated_results (results are persisted by the
--     presenter screen, throttled to once / 2s per slide).
--   * Participants are ANONYMOUS. They NEVER write to Postgres. Their votes
--     travel over Supabase Realtime Broadcast to the presenter, who aggregates
--     in memory and persists. Anon role therefore gets SELECT-only access,
--     scoped to slides/sessions that are currently live.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'slide_type') then
    create type slide_type as enum (
      'instructions',
      'text',
      'multiple_choice',
      'word_cloud',
      'open_ended',
      'ranking',
      'pin_on_image'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'session_status') then
    create type session_status as enum ('draft', 'active', 'ended');
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- presentations
-- ---------------------------------------------------------------------------
create table if not exists public.presentations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null default 'מצגת ללא שם',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- slides
--   content_json holds the type-specific config (question, options, image url,
--   ranking items, ...). Shapes are defined in src/lib/types.ts.
-- ---------------------------------------------------------------------------
create table if not exists public.slides (
  id               uuid primary key default gen_random_uuid(),
  presentation_id  uuid not null references public.presentations (id) on delete cascade,
  type             slide_type not null,
  title            text not null default '',
  content_json     jsonb not null default '{}'::jsonb,
  order_index      integer not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists slides_presentation_order_idx
  on public.slides (presentation_id, order_index);

-- ---------------------------------------------------------------------------
-- live_sessions
--   One active session per presentation at a time (partial unique index).
-- ---------------------------------------------------------------------------
create table if not exists public.live_sessions (
  id               uuid primary key default gen_random_uuid(),
  presentation_id  uuid not null references public.presentations (id) on delete cascade,
  active_slide_id  uuid references public.slides (id) on delete set null,
  room_code        text not null unique,
  status           session_status not null default 'draft',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index if not exists live_sessions_one_active_per_presentation
  on public.live_sessions (presentation_id)
  where status = 'active';
create index if not exists live_sessions_room_code_idx
  on public.live_sessions (room_code);

-- ---------------------------------------------------------------------------
-- aggregated_results
--   payload_json is the rolled-up state for a slide (vote tallies, word
--   frequencies, card list, ranking weights, pin coordinates).
-- ---------------------------------------------------------------------------
create table if not exists public.aggregated_results (
  id           uuid primary key default gen_random_uuid(),
  slide_id     uuid not null references public.slides (id) on delete cascade,
  session_id   uuid references public.live_sessions (id) on delete cascade,
  payload_json jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);
create unique index if not exists aggregated_results_slide_session_uniq
  on public.aggregated_results (slide_id, session_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_presentations_touch on public.presentations;
create trigger trg_presentations_touch before update on public.presentations
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_live_sessions_touch on public.live_sessions;
create trigger trg_live_sessions_touch before update on public.live_sessions
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.presentations     enable row level security;
alter table public.slides            enable row level security;
alter table public.live_sessions     enable row level security;
alter table public.aggregated_results enable row level security;

-- presentations: owner full access ------------------------------------------
drop policy if exists "owner manages presentations" on public.presentations;
create policy "owner manages presentations" on public.presentations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- slides: owner full access via parent presentation -------------------------
drop policy if exists "owner manages slides" on public.slides;
create policy "owner manages slides" on public.slides
  for all
  using (
    exists (
      select 1 from public.presentations p
      where p.id = slides.presentation_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.presentations p
      where p.id = slides.presentation_id and p.user_id = auth.uid()
    )
  );

-- slides: anonymous read for slides whose presentation is currently live ----
drop policy if exists "anon reads live slides" on public.slides;
create policy "anon reads live slides" on public.slides
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.live_sessions s
      where s.presentation_id = slides.presentation_id
        and s.status = 'active'
    )
  );

-- live_sessions: owner full access ------------------------------------------
drop policy if exists "owner manages sessions" on public.live_sessions;
create policy "owner manages sessions" on public.live_sessions
  for all
  using (
    exists (
      select 1 from public.presentations p
      where p.id = live_sessions.presentation_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.presentations p
      where p.id = live_sessions.presentation_id and p.user_id = auth.uid()
    )
  );

-- live_sessions: anonymous read of active sessions only ---------------------
drop policy if exists "anon reads active sessions" on public.live_sessions;
create policy "anon reads active sessions" on public.live_sessions
  for select
  to anon, authenticated
  using (status = 'active');

-- aggregated_results: owner full access via slide -> presentation -----------
drop policy if exists "owner manages results" on public.aggregated_results;
create policy "owner manages results" on public.aggregated_results
  for all
  using (
    exists (
      select 1
      from public.slides sl
      join public.presentations p on p.id = sl.presentation_id
      where sl.id = aggregated_results.slide_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.slides sl
      join public.presentations p on p.id = sl.presentation_id
      where sl.id = aggregated_results.slide_id and p.user_id = auth.uid()
    )
  );

-- aggregated_results: anonymous read for live sessions ----------------------
drop policy if exists "anon reads live results" on public.aggregated_results;
create policy "anon reads live results" on public.aggregated_results
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.live_sessions s
      where s.id = aggregated_results.session_id and s.status = 'active'
    )
  );
