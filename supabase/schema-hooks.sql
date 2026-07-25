-- ================================================================
-- Content OS — Schema: Hooks Database + Plan de Contenido
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- ================================================================

-- Hooks extraídos de transcripciones y captions
create table if not exists hooks (
  id            uuid primary key default gen_random_uuid(),
  reel_id       text unique not null references posts(id) on delete cascade,
  text          text not null,
  source        text not null default 'transcription', -- 'transcription' | 'caption'
  reach         integer default 0,
  saves         integer default 0,
  engagement_rate float default 0,
  date_published  timestamptz,
  used_count    integer default 0,
  created_at    timestamptz default now()
);

-- Plan de contenido semanal generado por IA
create table if not exists content_plan (
  id              uuid primary key default gen_random_uuid(),
  emoji           text default '🎯',
  title           text not null,
  hook_text       text not null,
  suggested_day   text,
  format          text not null default 'reel',
  why             text,
  status          text not null default 'pendiente', -- 'pendiente' | 'en_proceso' | 'publicado'
  linked_reel_id  text references posts(id) on delete set null,
  week_start      date not null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists content_plan_week_idx on content_plan(week_start);
