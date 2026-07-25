-- ================================================================
-- Content OS — Schema: Historias de Instagram
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- ================================================================

-- Historias de Instagram (metadatos)
create table if not exists ig_stories (
  id            text primary key,
  media_type    text not null,
  media_url     text,
  thumbnail_url text,
  permalink     text,
  published_at  timestamptz not null,
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);

-- Métricas de historias (un row por historia, upsert en cada sync)
create table if not exists ig_story_metrics (
  story_id        text primary key references ig_stories(id) on delete cascade,
  impressions     integer default 0,
  reach           integer default 0,
  exits           integer default 0,
  replies         integer default 0,
  taps_forward    integer default 0,
  taps_back       integer default 0,
  link_clicks     integer default 0,
  completion_rate float default 0,
  captured_at     timestamptz default now()
);
