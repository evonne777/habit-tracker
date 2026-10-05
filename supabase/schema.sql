create extension if not exists pgcrypto;

create table if not exists public.habits (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  constraint habits_id_user_id_key unique (id, user_id)
);

create unique index if not exists habits_active_name_unique
  on public.habits (user_id, lower(btrim(name)))
  where deleted_at is null;

create index if not exists habits_user_updated_idx
  on public.habits (user_id, updated_at);

create table if not exists public.checkins (
  habit_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  check_date date not null,
  completed boolean not null default false,
  updated_at timestamptz not null,
  primary key (habit_id, check_date),
  constraint checkins_habit_owner_fk
    foreign key (habit_id, user_id)
    references public.habits (id, user_id)
    on delete cascade
);

create index if not exists checkins_user_updated_idx
  on public.checkins (user_id, updated_at);

alter table public.habits enable row level security;
alter table public.checkins enable row level security;

drop policy if exists "Users can read own habits" on public.habits;
create policy "Users can read own habits"
  on public.habits for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own habits" on public.habits;
create policy "Users can insert own habits"
  on public.habits for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own habits" on public.habits;
create policy "Users can update own habits"
  on public.habits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own habits" on public.habits;
create policy "Users can delete own habits"
  on public.habits for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own checkins" on public.checkins;
create policy "Users can read own checkins"
  on public.checkins for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own checkins" on public.checkins;
create policy "Users can insert own checkins"
  on public.checkins for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own checkins" on public.checkins;
create policy "Users can update own checkins"
  on public.checkins for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own checkins" on public.checkins;
create policy "Users can delete own checkins"
  on public.checkins for delete
  using (auth.uid() = user_id);
