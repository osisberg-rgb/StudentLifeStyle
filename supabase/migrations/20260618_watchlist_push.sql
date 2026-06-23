-- Tilbuds-notifikationer: hvem (push_tokens), hvad (watchlist), allerede-sendt (ledger).

create table if not exists public.push_tokens (
  user_id    uuid not null references auth.users(id) on delete cascade,
  token      text not null,
  platform   text,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

create table if not exists public.watchlist (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  term       text not null,
  label      text not null,
  kilde      text not null default 'klokke',
  created_at timestamptz not null default now(),
  unique (user_id, term)
);

create table if not exists public.notifikationer_sendt (
  user_id  uuid not null references auth.users(id) on delete cascade,
  term     text not null,
  uge      int  not null,
  sendt_at timestamptz not null default now(),
  primary key (user_id, term, uge)
);

create index if not exists watchlist_user_idx on public.watchlist(user_id);

alter table public.push_tokens          enable row level security;
alter table public.watchlist            enable row level security;
alter table public.notifikationer_sendt enable row level security;

-- Bruger ser/ændrer kun egne rækker. (Edge-funktionen bruger service-role og omgår RLS.)
drop policy if exists "egne push_tokens" on public.push_tokens;
create policy "egne push_tokens" on public.push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "egen watchlist" on public.watchlist;
create policy "egen watchlist" on public.watchlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notifikationer_sendt: ingen klient-policy → kun service-role har adgang.
