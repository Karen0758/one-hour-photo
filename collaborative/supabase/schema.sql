create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  openid text not null unique,
  slot text not null check (slot in ('tl', 'tr', 'bl', 'br')),
  display_name text,
  title text,
  pin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  participant_openid text not null references public.participants(openid) on delete cascade,
  slot text not null check (slot in ('tl', 'tr', 'bl', 'br')),
  sent_at timestamptz not null,
  date_key text not null,
  hour_key text not null,
  image_url text not null,
  media_id text,
  text text,
  created_at timestamptz not null default now()
);

create index if not exists photos_date_hour_idx on public.photos(date_key, hour_key);
create index if not exists photos_participant_idx on public.photos(participant_openid);

create table if not exists public.room_states (
  code text primary key check (code ~ '^[0-9]{4}$'),
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.participants enable row level security;
alter table public.photos enable row level security;
alter table public.room_states enable row level security;

drop policy if exists "Public read participants" on public.participants;
create policy "Public read participants"
on public.participants for select
using (true);

drop policy if exists "Public read photos" on public.photos;
create policy "Public read photos"
on public.photos for select
using (true);

drop policy if exists "Public read room states" on public.room_states;
create policy "Public read room states"
on public.room_states for select
using (true);

-- Writes are done by Netlify Functions with SUPABASE_SERVICE_ROLE_KEY.
-- Create a public bucket named "one-hour-photo" in Supabase Storage.
