-- Brugerens favorit-opskrifter. Per bruger, både statiske og importerede
-- opskrifter (opskrift_id er tekst, så begge passer). Vises som samlingen
-- "Favoritter" i ret-vælgeren.
create table if not exists public.favoritter (
  user_id uuid references auth.users on delete cascade not null,
  opskrift_id text not null,
  created_at timestamptz default now(),
  primary key (user_id, opskrift_id)
);

alter table public.favoritter enable row level security;

create policy "Brugere ser egne favoritter" on public.favoritter
  for select using (auth.uid() = user_id);
create policy "Brugere ændrer egne favoritter" on public.favoritter
  for all using (auth.uid() = user_id);
