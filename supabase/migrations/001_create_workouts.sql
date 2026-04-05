create extension if not exists vector;

create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date text not null,
  date_iso date,
  workout_type text not null default 'Practice',
  event_focus text[] default '{}',
  exercises jsonb default '[]',
  technical_cues text[] default '{}',
  personal_notes text,
  raw_text text,
  flags text[] default '{}',
  image_path text,
  embedding vector(1024),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index workouts_user_id_idx on workouts(user_id);
create index workouts_date_iso_idx on workouts(date_iso desc);

alter table workouts enable row level security;

create policy "Users can read own workouts"
  on workouts for select
  using (auth.uid() = user_id);

create policy "Users can insert own workouts"
  on workouts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own workouts"
  on workouts for update
  using (auth.uid() = user_id);

create policy "Users can delete own workouts"
  on workouts for delete
  using (auth.uid() = user_id);
