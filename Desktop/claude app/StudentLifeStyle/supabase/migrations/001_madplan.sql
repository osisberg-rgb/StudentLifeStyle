-- Profiler (udvider auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  budget_per_week int default 350,
  household_size int default 1,
  diet text[] default array['Alt'],
  stores text[] default array['Netto', 'Rema 1000', 'Lidl'],
  notifications_on boolean default true,
  onboarding_completed boolean default false,
  total_saved int default 0,
  plan_count int default 0,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Brugere ser egen profil" on public.profiles
  for select using (auth.uid() = id);
create policy "Brugere opdaterer egen profil" on public.profiles
  for all using (auth.uid() = id);

-- Trigger: opret profil ved signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Madplaner
create table if not exists public.madplaner (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  uge_nr int not null,
  plan jsonb not null,
  total_pris int default 0,
  total_spar int default 0,
  created_at timestamptz default now(),
  unique(user_id, uge_nr)
);

alter table public.madplaner enable row level security;

create policy "Brugere ser egne madplaner" on public.madplaner
  for select using (auth.uid() = user_id);
create policy "Brugere opretter egne madplaner" on public.madplaner
  for insert with check (auth.uid() = user_id);
create policy "Brugere opdaterer egne madplaner" on public.madplaner
  for update using (auth.uid() = user_id);

-- Opdatér total_saved og plan_count på profil når madplan gemmes
create or replace function public.opdater_profil_statistik()
returns trigger language plpgsql security definer as $$
begin
  update public.profiles
  set
    total_saved = total_saved + coalesce(new.total_spar, 0),
    plan_count  = plan_count + 1
  where id = new.user_id;
  return new;
end;
$$;

create or replace trigger after_madplan_insert
  after insert on public.madplaner
  for each row execute procedure public.opdater_profil_statistik();
