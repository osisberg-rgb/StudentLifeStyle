# Tilbuds-notifikationer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lade brugeren overvåge specifikke varer og få ægte push-notifikation når en overvåget vare kommer på tilbud — også når appen er lukket.

**Architecture:** 3 nye Supabase-tabeller (`push_tokens`, `watchlist`, `notifikationer_sendt`). `pg_cron` kalder dagligt en idempotent edge-funktion `send-tilbud-notifikationer`, der matcher hver brugers overvågede varer mod ugens `tilbud` (i deres butikker) og sender via Expo Push API; en ledger forhindrer dubletter. Klienten registrerer en Expo push-token og tilbyder 🔔-knapper + et fritekst-felt. Ægte push kræver et EAS development build (væk fra Expo Go).

**Tech Stack:** React Native + Expo SDK 54, TypeScript strict, Supabase (Postgres+RLS, Edge Functions/Deno, pg_cron, pg_net), Expo Push API, `expo-notifications`, `expo-device`, EAS Build.

**Spec:** `docs/superpowers/specs/2026-06-18-tilbuds-notifikationer-design.md`

**Branch:** `feature/tilbuds-notifikationer`

---

## Projektets test-virkelighed (læs før du starter)

Dette repo har **ingen test-runner**. Verifikations-gaten er:
- **`npx tsc --noEmit`** skal være ren efter hver klient-ændring.
- **`node scripts/test-matchning.mjs`** for ren pris-/match-logik (JS-spejle af kilden).
- Edge-funktionen testes via **`?dry_run=1`** mod test-data i `tilbud` (uge 99), ikke en unit-test-ramme.
- Push-runtime testes **manuelt** i et dev build (Fase C).

Hvor planen siger "Write the failing test" bruger vi `scripts/test-matchning.mjs`-mønsteret (tilføj cases, kør, se dem fejle, implementér, se dem bestå). For ikke-ren kode er "testen" tsc + dry_run/manuel røgtest — det står eksplicit i hvert trin.

## Supabase-adgang (ingen interaktiv login)

- **Token:** ligger i Windows Credential Manager, target `Supabase CLI:supabase`. Læs via Win32 `CredRead` i PowerShell og sæt `$env:SUPABASE_ACCESS_TOKEN` (se `scripts/opdater-tilbud.ps1` for det eksakte snippet).
- **Kør SQL:** `POST https://api.supabase.com/v1/projects/oqolcifpmdybimspnadc/database/query` med `Authorization: Bearer <token>` og body `{ "query": "<sql>" }`.
- **Deploy edge-funktion:** `npx supabase functions deploy <navn> --project-ref oqolcifpmdybimspnadc` (Docker-advarsel er harmløs; brug IKKE `2>&1` på native exe — det sætter falsk exit 1).
- **Projekt-ref:** `oqolcifpmdybimspnadc`. **Funktions-URL:** `https://oqolcifpmdybimspnadc.supabase.co/functions/v1/<navn>`.

---

## File Structure

**Nye filer**
- `supabase/migrations/20260618_watchlist_push.sql` — 3 tabeller + RLS + indeks.
- `supabase/functions/send-tilbud-notifikationer/index.ts` — match + send (idempotent, `dry_run`).
- `lib/watchlist.ts` — klient-store for overvågede varer + term-normalisering.
- `lib/notifikationer.ts` — tilladelse + Expo push-token-registrering.
- `components/KlokkeKnap.tsx` — genbrugelig 🔔-knap (overvåg/fjern + tilladelses-prompt).
- `scripts/test-watchlist.mjs` — JS-spejl-test af term-normalisering + matchning.

**Ændrede filer**
- `screens/HomeScreen.tsx` — 🔔 på "Tilbud til dig"-kort.
- `components/AlleTilbudModal.tsx` — 🔔 på hvert tilbud i "Se alle".
- `screens/IndkøbScreen.tsx` — 🔔 på indkøbsvarer.
- `components/OpskriftDetaljeModal.tsx` — 🔔 på ingredienser.
- `screens/ProfilScreen.tsx` — "Overvåg en vare"-felt + liste + Notifikationer-kontakt.
- `App.tsx` — registrér token ved opstart hvis tilladelse er givet; håndtér notifikations-tap.
- `app.json`, `eas.json`, `package.json` — dev build + `expo-notifications`/`expo-device` (Fase C).

---

# FASE A — Backend (kan bygges OG testes nu på Windows)

## Task A1: Migration — tabeller, RLS, indeks

**Files:**
- Create: `supabase/migrations/20260618_watchlist_push.sql`

- [ ] **Step 1: Skriv migrationen**

```sql
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
create policy "egne push_tokens" on public.push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "egen watchlist" on public.watchlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- notifikationer_sendt: ingen klient-policy → kun service-role har adgang.
```

- [ ] **Step 2: Anvend migrationen via Management API**

Kør i PowerShell (token læses som beskrevet i "Supabase-adgang"):

```powershell
$sql = Get-Content -Raw "supabase/migrations/20260618_watchlist_push.sql"
$body = @{ query = $sql } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri "https://api.supabase.com/v1/projects/oqolcifpmdybimspnadc/database/query" `
  -Headers @{ Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN" } `
  -ContentType "application/json" -Body $body
```

Expected: intet fejl-svar (tomt array eller `[]`).

- [ ] **Step 3: Verificér tabellerne findes**

Kør samme endpoint med:
```json
{ "query": "select table_name from information_schema.tables where table_schema='public' and table_name in ('push_tokens','watchlist','notifikationer_sendt') order by 1" }
```
Expected: 3 rækker.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260618_watchlist_push.sql
git commit -m "feat(notifikationer): DB-tabeller push_tokens/watchlist/notifikationer_sendt + RLS"
```

---

## Task A2: Ren logik — term-normalisering + matchning (med regressions-test)

Dette er den eneste nye *rene* logik. Vi spejler den i `scripts/test-watchlist.mjs` (samme mønster som `test-matchning.mjs`), så den kan køres uden RN.

**Files:**
- Create: `scripts/test-watchlist.mjs`
- (kilden lægges i `lib/watchlist.ts` i Task B1 — testen spejler funktionerne i JS)

- [ ] **Step 1: Skriv den fejlende test**

```js
// scripts/test-watchlist.mjs — JS-spejl af term-normalisering (lib/watchlist.ts)
// og matchning (matcherSoegeord). Holdes i synk med kilden manuelt.

const ENHEDS_ORD = new Set(['g','kg','l','ml','cl','dl','stk','pk','pakke','ca','x','liter','gram']);
function normaliserNavn(navn) {
  return (navn ?? '').toLowerCase()
    .replace(/[^a-zæøå0-9]+/g, ' ')
    .split(' ')
    .filter(w => w && !ENHEDS_ORD.has(w) && !/^\d+([.,]\d+)?$/.test(w))
    .join(' ').trim();
}
function termFraTilbud(navn) { return normaliserNavn(navn).split(' ').slice(0, 2).join(' '); }
function termFraFritekst(tekst) { return normaliserNavn(tekst); }

// matcherSoegeord — kopi af constants/basispriser.ts (ord-start; ≤3 tegn = helt ord)
function matcherSoegeord(tekst, soegeord) {
  const norm = (s) => ' ' + s.toLowerCase().replace(/[^a-z0-9æøåé]+/g, ' ').trim() + ' ';
  const t = norm(tekst), k = norm(soegeord);
  if (k.trim().length <= 3) return t.includes(k);
  return t.includes(k.substring(0, k.length - 1));
}

let ok = 0, fejl = 0;
function er(navn, faktisk, forventet) {
  const pass = faktisk === forventet;
  pass ? ok++ : fejl++;
  console.log(`${pass ? 'OK  ' : 'FEJL'}  ${navn}  (fik ${JSON.stringify(faktisk)}, forventet ${JSON.stringify(forventet)})`);
}

// term-normalisering
er("Faxe Kondi fra tilbud", termFraTilbud("Faxe Kondi Booster 1,5 L"), "faxe kondi");
er("Lurpak fra tilbud",     termFraTilbud("Lurpak Smør 200 g"),         "lurpak smør");
er("Fritekst trimmer",      termFraFritekst("  Faxe   Kondi  "),         "faxe kondi");
er("Fritekst dropper enhed",termFraFritekst("Mælk 1 liter"),             "mælk");

// matchning: en watch-term mod et tilbudsnavn
er("Faxe matcher booster",  matcherSoegeord("Faxe Kondi Booster 1,5L", "faxe kondi"), true);
er("Faxe matcher kort",     matcherSoegeord("Faxe Kondi 1,5L",          "faxe kondi"), true);
er("Lurpak matcher",        matcherSoegeord("Lurpak Smør 200g",         "lurpak smør"), true);
er("Pepsi != Faxe",         matcherSoegeord("Pepsi Max 1,5L",           "faxe kondi"), false);

console.log(`\n${ok} OK, ${fejl} fejl`);
if (fejl > 0) process.exit(1);
```

- [ ] **Step 2: Kør og se den bestå (den er selvstændig JS)**

Run: `node scripts/test-watchlist.mjs`
Expected: `8 OK, 0 fejl`. (Testen indeholder selv implementeringen, så den består straks — den fungerer som **kontrakt** for `lib/watchlist.ts` i Task B1. Hvis du ændrer normaliseringen, opdatér begge.)

- [ ] **Step 3: Commit**

```bash
git add scripts/test-watchlist.mjs
git commit -m "test(notifikationer): regressions-test for term-normalisering + matchning"
```

---

## Task A3: Edge-funktion `send-tilbud-notifikationer`

Idempotent: matcher watchlist mod ugens tilbud, springer allerede-sendte over, sender via Expo Push, rydder ugyldige tokens. `?dry_run=1` returnerer planen uden at sende/skrive.

**Files:**
- Create: `supabase/functions/send-tilbud-notifikationer/index.ts`

- [ ] **Step 1: Skriv funktionen**

```ts
// Henter watchlist + push_tokens + ugens tilbud, matcher pr. bruger i deres
// butikker, dedup'er via notifikationer_sendt og sender via Expo Push API.
// Beskyttet med CRON_SECRET (header). ?dry_run=1 sender ikke og skriver ikke ledger.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ENHEDS = new Set(['pr','stk','kuvert','kg','g','l','ml','dl']);
// Pr-enhed-tilbud udelukkes (samme regel som constants/tilbudspriser.ts: erPrEnhed)
function erPrEnhed(navn: string): boolean { return /\bpr\.\s*(\d|½|stk|kuvert|kg)/i.test(navn); }
function matcherSoegeord(tekst: string, k: string): boolean {
  const norm = (s: string) => ' ' + s.toLowerCase().replace(/[^a-z0-9æøåé]+/g, ' ').trim() + ' ';
  const t = norm(tekst), kk = norm(k);
  if (kk.trim().length <= 3) return t.includes(kk);
  return t.includes(kk.substring(0, kk.length - 1));
}

function isoUge(d = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const diff = (date.getTime() - firstThursday.getTime()) / 86400000;
  return 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dry_run') === '1';

  // Adgangskontrol: kun cron (eller manuel test) med CRON_SECRET må udløse afsendelse.
  const secret = Deno.env.get('CRON_SECRET') ?? '';
  if (!dryRun && req.headers.get('x-cron-secret') !== secret) {
    return new Response('forbidden', { status: 403 });
  }

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const uge = isoUge();
  const [{ data: watch }, { data: tokens }, { data: profiler }, { data: tilbud }, { data: sendt }] =
    await Promise.all([
      sb.from('watchlist').select('user_id, term, label'),
      sb.from('push_tokens').select('user_id, token'),
      sb.from('profiles').select('id, butikker'),
      sb.from('tilbud').select('butik, navn, soeg, pris, uge').eq('uge', uge),
      sb.from('notifikationer_sendt').select('user_id, term, uge').eq('uge', uge),
    ]);

  const butikkerFor = new Map<string, string[]>();
  for (const p of (profiler ?? [])) butikkerFor.set(p.id, p.butikker ?? []);
  const tokensFor = new Map<string, string[]>();
  for (const t of (tokens ?? [])) {
    if (!tokensFor.has(t.user_id)) tokensFor.set(t.user_id, []);
    tokensFor.get(t.user_id)!.push(t.token);
  }
  const alleredeSendt = new Set((sendt ?? []).map((s) => `${s.user_id}|${s.term}`));

  type Besked = { to: string; title: string; body: string; data: unknown; _user: string; _term: string };
  const beskeder: Besked[] = [];

  for (const w of (watch ?? [])) {
    if (alleredeSendt.has(`${w.user_id}|${w.term}`)) continue;
    const userTokens = tokensFor.get(w.user_id) ?? [];
    if (userTokens.length === 0) continue;
    const brugersButikker = butikkerFor.get(w.user_id) ?? [];

    // Find billigste matchende tilbud i brugerens butikker (eller alle hvis ingen valgt)
    let bedst: { butik: string; pris: number; navn: string } | null = null;
    for (const d of (tilbud ?? [])) {
      if (brugersButikker.length && !brugersButikker.includes(d.butik)) continue;
      if (erPrEnhed(d.navn)) continue;
      const tekst = `${d.navn} ${(d.soeg ?? []).join(' ')}`;
      if (!matcherSoegeord(tekst, w.term)) continue;
      if (!bedst || d.pris < bedst.pris) bedst = { butik: d.butik, pris: d.pris, navn: d.navn };
    }
    if (!bedst) continue;

    for (const to of userTokens) {
      beskeder.push({
        to,
        title: `🏷️ ${w.label} er på tilbud`,
        body: `${bedst.pris} kr i ${bedst.butik} denne uge`,
        data: { skærm: 'tilbud', term: w.term },
        _user: w.user_id, _term: w.term,
      });
    }
  }

  if (dryRun) {
    return Response.json({ uge, antal: beskeder.length, beskeder: beskeder.map(({ _user, _term, ...b }) => b) });
  }

  // Send i batches á 100 til Expo Push API
  const ugyldige: string[] = [];
  for (let i = 0; i < beskeder.length; i += 100) {
    const batch = beskeder.slice(i, i + 100);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch.map(({ _user, _term, ...b }) => b)),
    });
    const json = await res.json().catch(() => ({}));
    const data = json?.data ?? [];
    data.forEach((r: any, idx: number) => {
      if (r?.status === 'error' && r?.details?.error === 'DeviceNotRegistered') {
        ugyldige.push(batch[idx].to);
      }
    });
  }

  // Skriv ledger (én pr. user+term+uge) og ryd ugyldige tokens
  const ledger = [...new Map(beskeder.map((b) => [`${b._user}|${b._term}`, { user_id: b._user, term: b._term, uge }])).values()];
  if (ledger.length) await sb.from('notifikationer_sendt').upsert(ledger, { onConflict: 'user_id,term,uge' });
  if (ugyldige.length) await sb.from('push_tokens').delete().in('token', ugyldige);

  return Response.json({ uge, sendt: beskeder.length, ledger: ledger.length, ryddedeTokens: ugyldige.length });
});
```

- [ ] **Step 2: Sæt funktions-secrets**

`CRON_SECRET` er en tilfældig streng (gem den — cron skal bruge den i Task A4). `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` injiceres automatisk i edge-funktioner, men `CRON_SECRET` skal sættes:

```bash
npx supabase secrets set CRON_SECRET="<en-lang-tilfældig-streng>" --project-ref oqolcifpmdybimspnadc
```

- [ ] **Step 3: Deploy**

Run: `npx supabase functions deploy send-tilbud-notifikationer --project-ref oqolcifpmdybimspnadc`
Expected: `Deployed Functions on project oqolcifpmdybimspnadc`. (Docker-advarsel harmløs.)

- [ ] **Step 4: Indsæt testdata (uge 99) + en test-watchlist-række**

Via Management API (`database/query`), én ad gangen. Brug en ægte bruger-uuid fra `auth.users` (slå op med `select id from auth.users limit 1`):

```sql
insert into public.tilbud (butik, uge, navn, soeg, pris) values
  ('Netto', 99, 'Faxe Kondi Booster 1,5 L', array['faxe kondi','sodavand'], 8);
insert into public.watchlist (user_id, term, label, kilde) values
  ('<bruger-uuid>', 'faxe kondi', 'Faxe Kondi', 'fritekst')
  on conflict do nothing;
insert into public.push_tokens (user_id, token, platform) values
  ('<bruger-uuid>', 'ExponentPushToken[TEST]', 'ios')
  on conflict do nothing;
```

> Funktionen matcher på **indeværende ISO-uge**. Til test: enten sæt testrækken til den aktuelle uge i stedet for 99, eller kald funktionen og bekræft at uge-tallet i svaret matcher dine testdata. Nemmest: brug den aktuelle uges nummer i `tilbud.uge` for testrækken.

- [ ] **Step 5: Kør dry_run og verificér matchningen**

```powershell
Invoke-RestMethod -Method Post `
  -Uri "https://oqolcifpmdybimspnadc.supabase.co/functions/v1/send-tilbud-notifikationer?dry_run=1" `
  -Headers @{ Authorization = "Bearer $env:SB_ANON" } -ContentType "application/json" -Body "{}"
```
(`SB_ANON` = projektets anon-key, jf. `scripts/opdater-tilbud.ps1`.)
Expected: JSON med `antal: 1` og en besked `🏷️ Faxe Kondi er på tilbud` / `8 kr i Netto denne uge`. Ingen rigtig push sendes (dry_run).

- [ ] **Step 6: Ryd testdata**

```sql
delete from public.tilbud where uge = 99;
delete from public.watchlist where term = 'faxe kondi' and user_id = '<bruger-uuid>';
delete from public.push_tokens where token = 'ExponentPushToken[TEST]';
```

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/send-tilbud-notifikationer/index.ts
git commit -m "feat(notifikationer): edge-funktion send-tilbud-notifikationer (idempotent, dry_run)"
```

---

## Task A4: pg_cron — dagligt kald af funktionen

**Files:** (kun SQL via Management API; gem en kopi i migrations for sporbarhed)
- Create: `supabase/migrations/20260618_cron_notifikationer.sql`

- [ ] **Step 1: Skriv cron-opsætningen**

```sql
-- Aktivér extensions (idempotent) og planlæg dagligt kald af edge-funktionen.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Fjern evt. tidligere job med samme navn, så re-kørsel er idempotent
select cron.unschedule(jobid) from cron.job where jobname = 'send-tilbud-notifikationer-dagligt';

select cron.schedule(
  'send-tilbud-notifikationer-dagligt',
  '0 8 * * *',  -- hver dag kl. 08:00 (server-tid/UTC)
  $$
  select net.http_post(
    url     := 'https://oqolcifpmdybimspnadc.supabase.co/functions/v1/send-tilbud-notifikationer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET fra Task A3>'
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

- [ ] **Step 2: Anvend via Management API**

Samme PowerShell-mønster som Task A1, Step 2 (med denne fils indhold). Indsæt den faktiske `CRON_SECRET`-værdi før kørsel.

- [ ] **Step 3: Verificér jobbet er planlagt**

```json
{ "query": "select jobname, schedule, active from cron.job where jobname='send-tilbud-notifikationer-dagligt'" }
```
Expected: 1 række, `active = true`, `schedule = '0 8 * * *'`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260618_cron_notifikationer.sql
git commit -m "feat(notifikationer): pg_cron kalder send-funktionen dagligt 08:00"
```

> **Bemærk:** `<CRON_SECRET>` står i klartekst i `cron.job`. Det er en intern hemmelighed (kun for at hindre uautoriseret udløsning). Hold migrations-filens placeholder uden den ægte værdi i git; indsæt værdien kun ved kørsel.

---

# FASE B — Klient (bygges + tsc nu; runtime-push testes i Fase C)

## Task B1: `lib/watchlist.ts` — store + term-normalisering

**Files:**
- Create: `lib/watchlist.ts`

- [ ] **Step 1: Implementér (skal matche `scripts/test-watchlist.mjs`)**

```ts
// Brugerens overvågede varer (specifikke, fx "faxe kondi"). In-memory store med
// version-bump som lib/favoritter.ts, så 🔔-ikoner synkront viser korrekt tilstand.
import { supabase } from './supabase';

export type WatchRække = { id: string; term: string; label: string; kilde: string };

let watch: WatchRække[] = [];
let version = 0;
export function watchlistVersion(): number { return version; }

const ENHEDS_ORD = new Set(['g','kg','l','ml','cl','dl','stk','pk','pakke','ca','x','liter','gram']);

// Normaliser et varenavn til et søgeord: lowercase, fjern tegn/enheder/mængder.
export function normaliserNavn(navn: string): string {
  return (navn ?? '').toLowerCase()
    .replace(/[^a-zæøå0-9]+/g, ' ')
    .split(' ')
    .filter(w => w && !ENHEDS_ORD.has(w) && !/^\d+([.,]\d+)?$/.test(w))
    .join(' ').trim();
}
// Klokke på et (ofte langt) tilbudsnavn → de første 2 betydende ord.
export function termFraTilbud(navn: string): string {
  return normaliserNavn(navn).split(' ').slice(0, 2).join(' ');
}
// Fritekst → hele det normaliserede input.
export function termFraFritekst(tekst: string): string { return normaliserNavn(tekst); }

export function alleWatch(): WatchRække[] { return watch; }
export function erOvervåget(term: string): boolean { return watch.some(w => w.term === term); }

export async function hentWatchlist(): Promise<WatchRække[]> {
  try {
    const { data, error } = await supabase.from('watchlist').select('id, term, label, kilde');
    if (error || !data) return watch;
    watch = data as WatchRække[];
    version++;
    return watch;
  } catch { return watch; }
}

// Tilføj en overvågning. label = pænt navn (vises i push); term udledes hvis ikke givet.
export async function tilføjWatch(label: string, term?: string, kilde = 'klokke'): Promise<boolean> {
  const t = (term ?? termFraFritekst(label)).trim();
  if (!t) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.from('watchlist')
    .upsert({ user_id: user.id, term: t, label: label.trim(), kilde }, { onConflict: 'user_id,term' })
    .select('id, term, label, kilde').single();
  if (error || !data) return false;
  if (!watch.some(w => w.term === t)) { watch = [data as WatchRække, ...watch]; version++; }
  return true;
}

export async function fjernWatch(term: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from('watchlist').delete().eq('user_id', user.id).eq('term', term);
  if (error) return false;
  watch = watch.filter(w => w.term !== term); version++;
  return true;
}
```

- [ ] **Step 2: Verificér at JS-spejlet stadig stemmer**

Run: `node scripts/test-watchlist.mjs`
Expected: `8 OK, 0 fejl`. (Hvis du ændrede normaliseringen, opdatér både `lib/watchlist.ts` og testen.)

- [ ] **Step 3: tsc**

Run: `npx tsc --noEmit`
Expected: ingen output.

- [ ] **Step 4: Commit**

```bash
git add lib/watchlist.ts
git commit -m "feat(notifikationer): klient-watchlist-store + term-normalisering"
```

---

## Task B2: `lib/notifikationer.ts` — tilladelse + token

> `expo-notifications`/`expo-device` installeres i Fase C (de findes ikke i Expo Go-runtime). For at holde tsc grøn nu **uden** pakkerne, isolér importerne bag `require` i en try/catch, så filen typetjekker og fejler blødt i Expo Go.

**Files:**
- Create: `lib/notifikationer.ts`

- [ ] **Step 1: Implementér**

```ts
// Notifikations-tilladelse + Expo push-token. Kræver et dev build (expo-notifications
// virker ikke i Expo Go på SDK 53+). I Expo Go fejler den blødt (returnerer false),
// så resten af appen virker uændret.
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Lazy require: undgå hård import-fejl i Expo Go hvor pakken ikke er linket.
function modul(): any | null {
  try { return require('expo-notifications'); } catch { return null; }
}

export async function harTilladelse(): Promise<boolean> {
  const N = modul(); if (!N) return false;
  const { status } = await N.getPermissionsAsync();
  return status === 'granted';
}

// Bed om tilladelse (hvis ikke givet) og gem token. Returnerer true ved succes.
export async function registrérForPush(): Promise<boolean> {
  const N = modul(); if (!N) return false;
  let { status } = await N.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await N.requestPermissionsAsync());
  if (status !== 'granted') return false;

  const projectId = (Constants as any)?.expoConfig?.extra?.eas?.projectId
    ?? (Constants as any)?.easConfig?.projectId;
  if (!projectId) return false;

  const token = (await N.getExpoPushTokenAsync({ projectId })).data;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !token) return false;

  const platform = (require('react-native').Platform.OS) as string;
  await supabase.from('push_tokens').upsert(
    { user_id: user.id, token, platform, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,token' },
  );
  return true;
}

// Slå fra: fjern denne enheds tokens for brugeren.
export async function afmeldPush(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from('push_tokens').delete().eq('user_id', user.id);
}
```

- [ ] **Step 2: tsc**

Run: `npx tsc --noEmit`
Expected: ingen output. (Hvis tsc klager over manglende `expo-notifications`-typer: det lazy `require` undgår typeafhængighed; hvis nødvendigt, behold `any`-castet som her.)

- [ ] **Step 3: Commit**

```bash
git add lib/notifikationer.ts
git commit -m "feat(notifikationer): tilladelse + Expo push-token-registrering (blød i Expo Go)"
```

---

## Task B3: `components/KlokkeKnap.tsx` — genbrugelig 🔔

**Files:**
- Create: `components/KlokkeKnap.tsx`

- [ ] **Step 1: Implementér**

```tsx
// Genbrugelig 🔔-knap: overvåg/fjern en specifik vare. Første gang der overvåges,
// beder den om notifikations-tilladelse. Optimistisk UI (ruller tilbage ved fejl).
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { tilføjWatch, fjernWatch, erOvervåget, watchlistVersion } from '../lib/watchlist';
import { harTilladelse, registrérForPush } from '../lib/notifikationer';

type Props = {
  label: string;            // pænt navn (vises i push)
  term: string;             // normaliseret søgeord (matchning)
  kilde?: string;           // 'klokke' | 'fritekst'
  størrelse?: number;
};

export default function KlokkeKnap({ label, term, kilde = 'klokke', størrelse = 22 }: Props) {
  // watchlistVersion() i deps tvinger re-render når storen ændrer sig
  const [, setNonce] = useState(0);
  const aktiv = erOvervåget(term);

  async function tryk() {
    if (aktiv) {
      const ok = await fjernWatch(term);
      if (ok) setNonce(n => n + 1);
      return;
    }
    const ok = await tilføjWatch(label, term, kilde);
    if (!ok) { Alert.alert('Hov', 'Kunne ikke gemme overvågningen. Er du logget ind?'); return; }
    setNonce(n => n + 1);
    // Bed om tilladelse første gang (uden at blokere selve overvågningen)
    if (!(await harTilladelse())) {
      const fik = await registrérForPush();
      if (!fik) {
        Alert.alert('Notifikationer slået fra',
          'Varen overvåges, men du får først besked når du tillader notifikationer (kræver app-opdatering med notifikationer).');
      }
    }
  }

  // bind til version, så søsken-knapper med samme term også opdaterer
  void watchlistVersion();

  return (
    <TouchableOpacity onPress={tryk} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.knap}>
      <Ionicons name={aktiv ? 'notifications' : 'notifications-outline'} size={størrelse}
        color={aktiv ? Colors.green : Colors.inkSoft} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  knap: { padding: 4, alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 2: tsc**

Run: `npx tsc --noEmit`
Expected: ingen output.

- [ ] **Step 3: Commit**

```bash
git add components/KlokkeKnap.tsx
git commit -m "feat(notifikationer): genbrugelig KlokkeKnap (overvåg/fjern + tilladelses-prompt)"
```

---

## Task B4: 🔔 i "Tilbud til dig" (HomeScreen)

**Files:**
- Modify: `screens/HomeScreen.tsx`

- [ ] **Step 1: Importér + hent watchlist ved fokus**

Tilføj import øverst:
```tsx
import KlokkeKnap from '../components/KlokkeKnap';
import { hentWatchlist, termFraTilbud } from '../lib/watchlist';
```
I den eksisterende `useFocusEffect`/indlæsnings-funktion (hvor favoritter/mine varer hentes), tilføj et kald:
```tsx
hentWatchlist();
```

- [ ] **Step 2: Tilføj 🔔 ved siden af tilbuds-`+`**

I `ugensTilbud.map(...)` (kortet med navn/pris/`+`), indsæt en `KlokkeKnap` mellem pris og `+`:
```tsx
<KlokkeKnap label={t.navn} term={termFraTilbud(t.navn)} />
```
Placér den inde i kortets højre-gruppe, fx lige før `tilbudPlus`-knappen. Behold layoutet (`flexDirection: 'row'`, `alignItems: 'center'`).

- [ ] **Step 3: tsc + visuel egenkontrol**

Run: `npx tsc --noEmit`
Expected: ingen output. (Runtime-udseende verificeres når appen kører i Fase C / Expo Go-preview.)

- [ ] **Step 4: Commit**

```bash
git add screens/HomeScreen.tsx
git commit -m "feat(notifikationer): 🔔 på Tilbud til dig-kort"
```

---

## Task B5: 🔔 i "Se alle"-tilbud (AlleTilbudModal)

**Files:**
- Modify: `components/AlleTilbudModal.tsx`

- [ ] **Step 1: Importér**

```tsx
import KlokkeKnap from './KlokkeKnap';
import { termFraTilbud } from '../lib/watchlist';
```

- [ ] **Step 2: Tilføj 🔔 på hver tilbuds-række**

Find rækken der viser hvert tilbud (navn + pris). Tilføj i højre side:
```tsx
<KlokkeKnap label={t.navn} term={termFraTilbud(t.navn)} />
```
Brug det faktiske variabelnavn for tilbuddet i modalens `.map(...)` (tjek filen — det kan hedde `t`, `vare` el.lign.).

- [ ] **Step 3: tsc**

Run: `npx tsc --noEmit`
Expected: ingen output.

- [ ] **Step 4: Commit**

```bash
git add components/AlleTilbudModal.tsx
git commit -m "feat(notifikationer): 🔔 i Se alle-tilbud"
```

---

## Task B6: 🔔 på indkøbsvarer (IndkøbScreen)

**Files:**
- Modify: `screens/IndkøbScreen.tsx`

- [ ] **Step 1: Importér**

```tsx
import KlokkeKnap from '../components/KlokkeKnap';
import { termFraFritekst } from '../lib/watchlist';
```

- [ ] **Step 2: Tilføj 🔔 pr. vare-række**

I rækken der viser en indkøbsvare (`v.vare`), tilføj ved siden af afkryds/pris:
```tsx
<KlokkeKnap label={v.vare} term={termFraFritekst(v.vare)} størrelse={18} />
```
(Indkøbsvarer er ofte korte navne → `termFraFritekst` er fint. Hold rækkens layout.)

- [ ] **Step 3: tsc**

Run: `npx tsc --noEmit`
Expected: ingen output.

- [ ] **Step 4: Commit**

```bash
git add screens/IndkøbScreen.tsx
git commit -m "feat(notifikationer): 🔔 på indkøbsvarer"
```

---

## Task B7: 🔔 på ingredienser (OpskriftDetaljeModal)

**Files:**
- Modify: `components/OpskriftDetaljeModal.tsx`

- [ ] **Step 1: Importér**

```tsx
import KlokkeKnap from './KlokkeKnap';
import { termFraFritekst } from '../lib/watchlist';
```

- [ ] **Step 2: Tilføj 🔔 pr. ingrediens-række**

I ingrediens-listens `.map(...)`, tilføj i højre side af hver række:
```tsx
<KlokkeKnap label={ing.navn} term={(ing.soeg?.[0]) ?? termFraFritekst(ing.navn)} størrelse={18} />
```
(Foretræk ingrediensens første `soeg`-ord som term hvis det findes — det matcher tilbud bedst; ellers normalisér navnet.)

- [ ] **Step 3: tsc**

Run: `npx tsc --noEmit`
Expected: ingen output.

- [ ] **Step 4: Commit**

```bash
git add components/OpskriftDetaljeModal.tsx
git commit -m "feat(notifikationer): 🔔 på opskrift-ingredienser"
```

---

## Task B8: Profil — fritekst-felt, liste, Notifikationer-kontakt

**Files:**
- Modify: `screens/ProfilScreen.tsx`

- [ ] **Step 1: Importér + state + hent**

```tsx
import { useState } from 'react';
import { TextInput, Switch } from 'react-native';
import { hentWatchlist, alleWatch, tilføjWatch, fjernWatch, termFraFritekst, type WatchRække } from '../lib/watchlist';
import { harTilladelse, registrérForPush, afmeldPush } from '../lib/notifikationer';
```
Tilføj state:
```tsx
const [watch, setWatch] = useState<WatchRække[]>([]);
const [nyVare, setNyVare] = useState('');
const [notiTil, setNotiTil] = useState(false);
```
I skærmens eksisterende load-effekt:
```tsx
hentWatchlist().then(setWatch);
harTilladelse().then(setNotiTil);
```

- [ ] **Step 2: Tilføj-funktion + render-blok**

Funktion:
```tsx
async function tilføjOvervågning() {
  const label = nyVare.trim();
  const term = termFraFritekst(label);
  if (!term) return;
  const ok = await tilføjWatch(label, term, 'fritekst');
  if (ok) { setWatch(alleWatch()); setNyVare(''); if (!notiTil) { const f = await registrérForPush(); setNotiTil(f); } }
}
async function vekslNotifikationer(v: boolean) {
  if (v) setNotiTil(await registrérForPush());
  else { await afmeldPush(); setNotiTil(false); }
}
```
Render (placér i en ny "Notifikationer"-sektion):
```tsx
<Text style={styles.sektionTitel}>Notifikationer</Text>
<View style={styles.række}>
  <Text style={styles.rækkeTekst}>Få besked om tilbud</Text>
  <Switch value={notiTil} onValueChange={vekslNotifikationer} />
</View>
<View style={styles.søgRække}>
  <TextInput style={styles.input} value={nyVare} onChangeText={setNyVare}
    placeholder="Overvåg en vare, fx Faxe Kondi" placeholderTextColor={Colors.inkSoft}
    onSubmitEditing={tilføjOvervågning} returnKeyType="done" />
  <TouchableOpacity style={styles.tilføjKnap} onPress={tilføjOvervågning}>
    <Text style={styles.tilføjKnapTekst}>Tilføj</Text>
  </TouchableOpacity>
</View>
{watch.map(w => (
  <View key={w.id} style={styles.række}>
    <Text style={styles.rækkeTekst}>🔔 {w.label}</Text>
    <TouchableOpacity onPress={async () => { await fjernWatch(w.term); setWatch(alleWatch()); }}>
      <Text style={{ color: Colors.red }}>Fjern</Text>
    </TouchableOpacity>
  </View>
))}
```
Genbrug eksisterende style-navne hvor de findes; tilføj `søgRække`/`input`/`tilføjKnap`/`tilføjKnapTekst`/`sektionTitel` hvis de mangler (kopiér mønster fra `VælgRetterModal`s søgefelt-styles).

- [ ] **Step 3: tsc**

Run: `npx tsc --noEmit`
Expected: ingen output.

- [ ] **Step 4: Commit**

```bash
git add screens/ProfilScreen.tsx
git commit -m "feat(notifikationer): Profil — overvåg-felt, liste og notifikations-kontakt"
```

---

## Task B9: App-opstart — opdatér token + håndtér notifikations-tap

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Importér + hent watchlist + opdatér token ved login**

I `App.tsx` (i den eksisterende `useEffect` der kører ved `session`, hvor `hentBrugerOpskrifter()`/`hentFavoritter()` kaldes), tilføj:
```tsx
import { hentWatchlist } from './lib/watchlist';
import { harTilladelse, registrérForPush } from './lib/notifikationer';
// ...
hentWatchlist();
// Opdatér token hvis tilladelse allerede er givet (ingen prompt)
harTilladelse().then(ok => { if (ok) registrérForPush(); });
```

- [ ] **Step 2: Håndtér tryk på en notifikation (deep-link til Tilbud)**

Tilføj en effekt der lytter på notifikations-tap og navigerer til Hjem (hvor "Tilbud til dig" vises). Brug lazy require så det er blødt i Expo Go:
```tsx
useEffect(() => {
  let sub: any;
  try {
    const N = require('expo-notifications');
    sub = N.addNotificationResponseReceivedListener(() => {
      // v1: bring brugeren til Hjem/Tilbud til dig (navigation-ref hvis tilgængelig)
    });
  } catch {}
  return () => { try { sub?.remove(); } catch {} };
}, []);
```
(Deep-link helt ned til varen er uden for scope i v1 — det er nok at åbne appen/Hjem.)

- [ ] **Step 3: tsc**

Run: `npx tsc --noEmit`
Expected: ingen output.

- [ ] **Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat(notifikationer): opdatér push-token ved opstart + håndtér notifikations-tap"
```

---

# FASE C — EAS dev build + ægte push (kræver MacBook/EAS)

> Disse trin kræver en Expo-konto og typisk macOS for fuld iOS-test. EAS Build kører i skyen, men iOS-simulator + App Store-indsendelse er nemmest på Mac.

## Task C1: Installér notifikations-pakker + EAS-config

**Files:**
- Modify: `package.json`, `app.json`, `eas.json` (ny)

- [ ] **Step 1: Installér pakker (versions-matchet SDK 54)**

Run:
```bash
npx expo install expo-notifications expo-device
npm install -g eas-cli   # hvis ikke installeret
```

- [ ] **Step 2: Initialisér EAS + projectId**

Run:
```bash
eas login
eas init        # opretter projektet og sætter expo.extra.eas.projectId i app.json
```
Verificér at `app.json` nu har `expo.extra.eas.projectId`.

- [ ] **Step 3: Tilføj notifikations-plugin i `app.json`**

I `expo.plugins`:
```json
["expo-notifications", { "icon": "./assets/notification-icon.png", "color": "#4AAF5A" }]
```
(Ikon er valgfrit; udelad `icon`-feltet hvis I ikke har et endnu.)

- [ ] **Step 4: Opret `eas.json` med en development-profil**

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal" },
    "production": {}
  },
  "submit": { "production": {} }
}
```

- [ ] **Step 5: tsc + commit**

Run: `npx tsc --noEmit` → ingen output.
```bash
git add package.json app.json eas.json
git commit -m "chore(notifikationer): expo-notifications/device + EAS dev build-config"
```

---

## Task C2: Byg dev build + end-to-end push-test

- [ ] **Step 1: Byg development client**

Run (Android først, hurtigst):
```bash
eas build --profile development --platform android
```
Installér den resulterende APK på `Pixel_7`-emulatoren eller en fysisk enhed. (iOS: `--platform ios`, kræver Apple-konto/credentials.)

- [ ] **Step 2: Start dev-serveren mod dev clienten**

Run: `npx expo start --dev-client`
Åbn appen fra dev clienten (ikke Expo Go).

- [ ] **Step 3: Verificér tilladelse + token**

I appen: gå til Profil → slå "Få besked om tilbud" til → accepter tilladelse.
Verificér i Supabase at `push_tokens` har en ny række (`select * from push_tokens` via Management API). Token skal starte med `ExponentPushToken[`.

- [ ] **Step 4: Overvåg en vare + udløs funktionen manuelt**

I appen: skriv "Faxe Kondi" i Profil-feltet (eller tryk 🔔 på et tilbud). Verificér ny `watchlist`-række.
Indsæt en matchende testrække i `tilbud` for **indeværende uge** (som i Task A3, Step 4, men brug den rigtige uge og en butik brugeren har valgt).
Udløs funktionen rigtigt (ikke dry_run) med cron-secret:
```powershell
Invoke-RestMethod -Method Post `
  -Uri "https://oqolcifpmdybimspnadc.supabase.co/functions/v1/send-tilbud-notifikationer" `
  -Headers @{ 'x-cron-secret' = '<CRON_SECRET>' } -ContentType "application/json" -Body "{}"
```
Expected: en rigtig push lander på enheden: `🏷️ Faxe Kondi er på tilbud` / `… kr i <butik> denne uge`. Tryk åbner appen.

- [ ] **Step 5: Verificér idempotens**

Kør samme kald igen. Expected: ingen ny push (ledger forhindrer dublet); svaret viser `sendt: 0` eller en uændret ledger.

- [ ] **Step 6: Ryd testdata**

Slet test-`tilbud`-rækken igen (jf. Task A3, Step 6).

- [ ] **Step 7: Commit (kun hvis kode/config ændredes under test)**

```bash
git add -A
git commit -m "test(notifikationer): end-to-end push verificeret i dev build"
```

---

## Færdiggørelse

- [ ] Opdatér `OPTIMERING.md` (nyt afsnit: notifikationer leveret) og `ROADMAP.md` (beslutningslog + milepæl).
- [ ] Opdatér `README.md` (kort: "Notifikationer"-afsnit) og `CLAUDE.md` (ny edge-funktion + tabeller i Architecture).
- [ ] Merge `feature/tilbuds-notifikationer` → `main` (eller PR), når Fase C er grøn.

---

## Self-review-noter (udført ved planlægning)

- **Spec-dækning:** hver spec-sektion har en task — tabeller (A1), edge+match+dedup+dry_run (A3), cron (A4), token/tilladelse (B2), 🔔 to indgange + liste (B3–B8), token ved opstart + tap (B9), dev build + e2e (C1–C2). ✔
- **Type-konsistens:** `term`/`label`/`kilde` ens i DB (A1), edge (A3), `lib/watchlist.ts` (B1) og `KlokkeKnap` (B3). `WatchRække`-formen matcher select-felterne. ✔
- **Mac-afhængighed isoleret:** alt i Fase A+B bygges/tsc'es på Windows; kun Fase C kræver dev build. `expo-notifications` lazy-require'es, så tsc + Expo Go ikke brækker før Fase C. ✔
```
