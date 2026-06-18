-- Brugerimporterede opskrifter (fra et link, via edge function
-- importer-opskrift). Samme felt-form som de statiske OPSKRIFTER, så de
-- virker overalt i appen gennem alleOpskrifter()/findOpskrift().
create table if not exists public.bruger_opskrifter (
  id text primary key,                       -- app-genereret, fx "bruger-<rand>"
  user_id uuid references auth.users on delete cascade not null,
  navn text not null,
  koed text not null default 'Alt',
  portioner int not null default 4,
  minutter int,
  kategorier text[] default '{}',
  billede_url text,
  kilde_url text,
  kilde_navn text,
  ingredienser jsonb not null default '[]',
  fremgangsmaade jsonb not null default '[]',
  created_at timestamptz default now()
);

alter table public.bruger_opskrifter enable row level security;

create policy "Brugere ser egne opskrifter" on public.bruger_opskrifter
  for select using (auth.uid() = user_id);
create policy "Brugere ændrer egne opskrifter" on public.bruger_opskrifter
  for all using (auth.uid() = user_id);

create index if not exists bruger_opskrifter_user_idx
  on public.bruger_opskrifter (user_id);
