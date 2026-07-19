-- ========================================================================
-- Truco stats schema — normalized, anon-open (no auth), group scope reserved
-- Applied to the dedicated project `eieaajvcdmldeacjksan` (TrucoApp, Life OS org).
-- ========================================================================
create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ---------- players ----------
create table public.players (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 40),
  group_id    uuid null,                        -- reserved: null = global pool
  created_at  timestamptz not null default now(),
  archived_at timestamptz null                  -- soft archive (null = active)
);
-- case-insensitive uniqueness among ACTIVE players in a scope; NULL group = one scope
create unique index players_unique_name_active
  on public.players (group_id, lower(name)) nulls not distinct
  where archived_at is null;
create index players_group_idx on public.players (group_id);

-- ---------- games ----------
create table public.games (
  id            uuid primary key default gen_random_uuid(),
  played_at     timestamptz not null default now(),
  mode          text not null check (mode in ('1v1','2v2','free-for-all')),
  completed     boolean not null default true,
  winning_score int not null default 30 check (winning_score > 0),
  group_id      uuid null,                       -- reserved: null = global pool
  note          text null,
  created_at    timestamptz not null default now()
);
create index games_played_at_idx on public.games (played_at desc);
create index games_mode_idx      on public.games (mode);
create index games_group_idx     on public.games (group_id);

-- ---------- game_teams ----------
create table public.game_teams (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references public.games(id) on delete cascade,
  team_index  int  not null,
  name        text null,
  final_score int  not null default 0 check (final_score >= 0),
  is_winner   boolean not null default false,
  unique (game_id, team_index)
);
create index game_teams_game_idx on public.game_teams (game_id);

-- ---------- game_participants ----------
create table public.game_participants (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references public.games(id)      on delete cascade,
  game_team_id uuid not null references public.game_teams(id) on delete cascade,
  player_id    uuid not null references public.players(id)    on delete restrict,
  team_index   int  not null,
  unique (game_id, player_id)
);
create index game_participants_player_idx on public.game_participants (player_id);
create index game_participants_game_idx   on public.game_participants (game_id);
create index game_participants_team_idx   on public.game_participants (game_team_id);

-- ========================== RLS (anon-open) ==============================
alter table public.players           enable row level security;
alter table public.games             enable row level security;
alter table public.game_teams        enable row level security;
alter table public.game_participants enable row level security;

-- players: read + insert + update; NO delete policy -> hard-delete blocked, archive instead
create policy players_read   on public.players for select using (true);
create policy players_insert on public.players for insert with check (true);
create policy players_update on public.players for update using (true) with check (true);

-- games/teams/participants: full read+write (insert to record, delete to undo/edit)
create policy games_all             on public.games             for all using (true) with check (true);
create policy game_teams_all        on public.game_teams        for all using (true) with check (true);
create policy game_participants_all on public.game_participants for all using (true) with check (true);

-- ===================== atomic record RPC ================================
create or replace function public.record_game(payload jsonb)
returns uuid
language plpgsql
security invoker           -- runs as caller (anon); RLS policies above permit it
as $$
declare v_game_id uuid; v_team jsonb; v_team_id uuid; v_pid uuid;
begin
  insert into public.games (played_at, mode, completed, winning_score, group_id, note)
  values (coalesce((payload->>'playedAt')::timestamptz, now()),
          payload->>'mode',
          coalesce((payload->>'completed')::boolean, true),
          coalesce((payload->>'winningScore')::int, 30),
          (payload->>'groupId')::uuid,
          payload->>'note')
  returning id into v_game_id;

  for v_team in select * from jsonb_array_elements(payload->'teams') loop
    insert into public.game_teams (game_id, team_index, name, final_score, is_winner)
    values (v_game_id, (v_team->>'teamIndex')::int, v_team->>'name',
            coalesce((v_team->>'finalScore')::int,0),
            coalesce((v_team->>'isWinner')::boolean,false))
    returning id into v_team_id;

    for v_pid in select (jsonb_array_elements_text(v_team->'playerIds'))::uuid loop
      insert into public.game_participants (game_id, game_team_id, player_id, team_index)
      values (v_game_id, v_team_id, v_pid, (v_team->>'teamIndex')::int);
    end loop;
  end loop;
  return v_game_id;
end $$;

grant execute on function public.record_game(jsonb) to anon, authenticated;
