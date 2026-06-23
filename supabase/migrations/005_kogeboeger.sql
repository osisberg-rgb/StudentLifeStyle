-- Brugerens kogebøger (navngivne samlinger) + medlemskab. Per bruger, RLS.
-- opskrift_id er TEKST, så både statiske ("dessert-1") og importerede
-- ("bruger-...") opskrifter kan ligge i en kogebog — samme mønster som
-- favoritter (003). Én kogebog pr. opskrift håndhæves af primærnøglen på
-- medlemskabs-tabellen.

create table if not exists public.kogeboeger (
  id text primary key,                       -- app-genereret, fx "kogebog-<rand>"
  user_id uuid references auth.users on delete cascade not null,
  navn text not null,
  emoji text not null default '📕',
  created_at timestamptz default now()
);

alter table public.kogeboeger enable row level security;

create policy "Brugere ser egne kogeboeger" on public.kogeboeger
  for select using (auth.uid() = user_id);
create policy "Brugere aendrer egne kogeboeger" on public.kogeboeger
  for all using (auth.uid() = user_id);

create index if not exists kogeboeger_user_idx
  on public.kogeboeger (user_id);

create table if not exists public.kogebog_medlemskab (
  user_id uuid references auth.users on delete cascade not null,
  opskrift_id text not null,                 -- statisk ELLER "bruger-..." id
  kogebog_id text not null references public.kogeboeger(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, opskrift_id)         -- én kogebog pr. opskrift
);

alter table public.kogebog_medlemskab enable row level security;

create policy "Brugere ser egne medlemskaber" on public.kogebog_medlemskab
  for select using (auth.uid() = user_id);
create policy "Brugere aendrer egne medlemskaber" on public.kogebog_medlemskab
  for all using (auth.uid() = user_id);

create index if not exists kogebog_medlemskab_kogebog_idx
  on public.kogebog_medlemskab (user_id, kogebog_id);
