-- Job-tabel til sky-baseret tilbuds-import (in-app upload -> GitHub Action).
-- Én række pr. (butik, uge); id er deterministisk "<slug>-uge<NN>" så appen kan
-- upserte og Action'en kan PATCHe status. Admin (e-mail-allowlist) opretter/ser
-- egne jobs; service-role (Action) opdaterer status og omgår RLS.

create table if not exists public.tilbud_import_job (
  id text primary key,                       -- "<slug>-uge<NN>", fx "netto-uge26"
  user_id uuid references auth.users on delete cascade not null,
  butik text not null,
  slug text not null,
  uge int not null,
  status text not null default 'afventer'
    check (status in ('afventer', 'koerer', 'faerdig', 'fejl')),
  antal int not null default 0,
  fejl text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tilbud_import_job enable row level security;

-- Kun admin må oprette jobs; brugeren kan kun se/ændre egne rækker.
-- NB: vi gater på auth.uid() (admin-bruger-id), IKKE auth.jwt()->>'email' —
-- email-claimet er ikke pålideligt til stede i RLS-tokenet (gav RLS-fejl).
create policy "Admin opretter jobs" on public.tilbud_import_job
  for insert with check (
    auth.uid() = user_id
    and auth.uid() = 'a896ec72-1d5d-4f10-b221-5cd9bcb511a6'::uuid
  );
create policy "Admin ser egne jobs" on public.tilbud_import_job
  for select using (auth.uid() = user_id);
create policy "Admin opdaterer egne jobs" on public.tilbud_import_job
  for update using (auth.uid() = user_id);

create index if not exists tilbud_import_job_uge_idx
  on public.tilbud_import_job (uge);

-- Storage: kun admin må skrive til tilbudsaviser/inbox/. (Cloud-scriptet bruger
-- service-role og omgår RLS; disse policies gælder kun in-app upload.)
-- Gater på auth.uid() (admin-bruger-id) — IKKE email-claim, jf. ovenfor.
create policy "Admin upload inbox" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'tilbudsaviser'
    and auth.uid() = 'a896ec72-1d5d-4f10-b221-5cd9bcb511a6'::uuid
    and name like 'inbox/%'
  );
create policy "Admin opdater inbox" on storage.objects
  for update to authenticated using (
    bucket_id = 'tilbudsaviser'
    and auth.uid() = 'a896ec72-1d5d-4f10-b221-5cd9bcb511a6'::uuid
    and name like 'inbox/%'
  );
