# Tilbuds-pipeline i skyen — Implementeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flyt den ugentlige tilbuds-udtrækning fra brugerens PC til skyen — udløst af en in-app admin-upload af PDF'erne — så appen aldrig skal opdateres.

**Architecture:** Admin uploader PDF'er i MadUgen → Storage `tilbudsaviser/inbox/` + en `tilbud_import_job`-række → edge-funktionen `start-tilbud-import` (admin-JWT-gate) affyrer en GitHub `repository_dispatch` → en GitHub Action kører det *eksisterende* Node-udtræk (renderer sider, kalder `importer-tilbud`, skriver `tilbud`) og opdaterer job-status → appen viser status og henter `tilbud` live.

**Tech Stack:** React Native + Expo SDK 54 (TypeScript strict), Supabase (Postgres+RLS, Edge Functions/Deno, Storage), Node ESM-scripts (`pdf-to-img`), GitHub Actions.

---

## Vigtige projekt-konventioner (læs først)

- **Intet test-runner.** Verifikationsgaten er `npx tsc --noEmit`. Konkret kommando (undgår `cd`):
  ```
  node "C:/Users/gust5/claude/StudentLifeStyle/node_modules/typescript/bin/tsc" -p "C:/Users/gust5/claude/StudentLifeStyle/tsconfig.json" --noEmit
  ```
  Forventet: ingen output, exit 0. `tsconfig.json` ekskluderer `supabase/`, og `scripts/*.mjs` er ikke TypeScript — så **kun app-filer** (`lib/`, `components/`, `screens/`) type-tjekkes. Edge-funktioner og scripts verificeres ved deploy/kørsel i stedet.
- **Git:** repo-rod er `C:/Users/gust5/claude/StudentLifeStyle` (app ligger nu i repo-roden). Commit altid med `git -C "C:/Users/gust5/claude/StudentLifeStyle" ...`. Arbejd på `main`. **Push kun når brugeren beder om det.** Afslut commit-beskeder med `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **App-smoketest er bruger-drevet.** Boot IKKE emulator/`expo start` uopfordret (bruger-præference). Efter app-kode: kør tsc, og lad brugeren genindlæse selv.
- **Supabase uden interaktiv login:** SQL via `pwsh scripts/sb-sql.ps1 -File <fil>`; token læses fra Windows Credential Manager (`Supabase CLI:supabase`). Projekt-ref: `oqolcifpmdybimspnadc`.

## Filstruktur

**Nye filer**
- `supabase/migrations/006_tilbud_import.sql` — job-tabel + RLS + Storage-policy.
- `lib/admin.ts` — admin-e-mail-allowlist + `erAdmin()`.
- `lib/tilbudUpload.ts` — upload til Storage, opret jobs, kald edge-fn, poll status.
- `components/UploadTilbudModal.tsx` — admin-UI (fil-vælger, butik pr. fil, uge, status).
- `supabase/functions/start-tilbud-import/index.ts` — admin-gate → GitHub dispatch.
- `scripts/tilbud-core.mjs` — DELT render+udtræk+skriv-logik.
- `scripts/opdater-tilbud-cloud.mjs` — cloud-wrapper (læser payload, henter PDF fra Storage, opdaterer job).
- `.github/workflows/tilbud-import.yml` — workflow på `repository_dispatch`.

**Ændrede filer**
- `package.json` — tilføj `pdf-to-img`.
- `scripts/opdater-tilbud.mjs` — refaktorér til at bruge `tilbud-core.mjs` (DRY; launcher `.ps1` uændret).
- `screens/ProfilScreen.tsx` — admin-række + render af `UploadTilbudModal`.
- `ROADMAP.md` — milepæl + beslutningslog.

---

## Task 1: Tilføj `pdf-to-img` som afhængighed

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Tilføj afhængigheden uden at oprette en lockfile**

Repoet har ingen `package-lock.json` (bevidst) — brug `--no-package-lock` så vi kun ændrer `package.json`:
```
node -e "process.chdir('C:/Users/gust5/claude/StudentLifeStyle'); require('child_process').execSync('npm install pdf-to-img@^6.2.0 --no-package-lock --no-audit --no-fund', {stdio:'inherit'})"
```
Forventet: `pdf-to-img` lander i `node_modules`, og `package.json` får linjen `"pdf-to-img": "^6.2.0"` under `dependencies`.

- [ ] **Step 2: Bekræft at `package.json` har linjen**

Åbn `package.json` og verificér at `dependencies` nu indeholder `"pdf-to-img": "^6.2.0"` (alfabetisk efter `expo-web-browser`, før `react`). Hvis npm valgte en nyere 6.x, er det fint — behold den.

- [ ] **Step 3: Røgtest renderingen (hvis en PDF er ved hånden)**

Hvis du har en tilbuds-PDF lokalt, bekræft at `pdf-to-img` kan rendere i dette miljø:
```
node -e "import('pdf-to-img').then(async ({pdf})=>{const d=await pdf(process.argv[1],{scale:1.3});console.log('sider:',d.length);const p=await d.getPage(1);console.log('side1 PNG bytes:',p.length);})" "C:/Users/gust5/Downloads/<en-tilbudsavis>.pdf"
```
Forventet: `sider: <n>` og `side1 PNG bytes: <stort tal>`. Hvis det fejler med en canvas-relateret fejl: kør `npm install @napi-rs/canvas --no-package-lock` i app-mappen og prøv igen (kontingens — `pdf-to-img@6` plejer at klare sig uden). Har du ingen PDF, spring testen over; den eksisterende lokale pipeline (Task 3) dækker samme rendering.

- [ ] **Step 4: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "package.json"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'build: tilfoej pdf-to-img afhaengighed til sky-udtraek\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 2: DB-migration — `tilbud_import_job` + RLS + Storage-policy

**Files:**
- Create: `supabase/migrations/006_tilbud_import.sql`

- [ ] **Step 1: Skriv migrationen**

```sql
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
    check (status in ('afventer', 'kører', 'færdig', 'fejl')),
  antal int not null default 0,
  fejl text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tilbud_import_job enable row level security;

-- Kun admin-e-mails må oprette jobs; brugeren kan kun se/ændre egne rækker.
create policy "Admin opretter jobs" on public.tilbud_import_job
  for insert with check (
    auth.uid() = user_id
    and lower(auth.jwt() ->> 'email') = any (array['os.isberg@gmail.com'])
  );
create policy "Admin ser egne jobs" on public.tilbud_import_job
  for select using (auth.uid() = user_id);
create policy "Admin opdaterer egne jobs" on public.tilbud_import_job
  for update using (auth.uid() = user_id);

create index if not exists tilbud_import_job_uge_idx
  on public.tilbud_import_job (uge);

-- Storage: kun admin må skrive til tilbudsaviser/inbox/. (Cloud-scriptet bruger
-- service-role og omgår RLS; disse policies gælder kun in-app upload.)
create policy "Admin upload inbox" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'tilbudsaviser'
    and lower(auth.jwt() ->> 'email') = any (array['os.isberg@gmail.com'])
    and name like 'inbox/%'
  );
create policy "Admin opdater inbox" on storage.objects
  for update to authenticated using (
    bucket_id = 'tilbudsaviser'
    and lower(auth.jwt() ->> 'email') = any (array['os.isberg@gmail.com'])
    and name like 'inbox/%'
  );
```

- [ ] **Step 2: Kør migrationen mod databasen**
```
pwsh "C:/Users/gust5/claude/StudentLifeStyle/scripts/sb-sql.ps1" -File "C:/Users/gust5/claude/StudentLifeStyle/supabase/migrations/006_tilbud_import.sql"
```
Forventet: JSON-svar uden `error` (typisk `[]` eller tomt resultat).

- [ ] **Step 3: Verificér tabel + policies**
```
pwsh "C:/Users/gust5/claude/StudentLifeStyle/scripts/sb-sql.ps1" -Query "select count(*) as cols from information_schema.columns where table_name='tilbud_import_job';"
```
Forventet: `cols` = 10. Hvis en Storage-policy fejler fordi den allerede findes (`policy ... already exists`), er det ufarligt — fjern den dublerede `create policy`-blok og kør igen.

- [ ] **Step 4: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "supabase/migrations/006_tilbud_import.sql"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(db): tilbud_import_job tabel + RLS + storage inbox-policy\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 3: Delt udtræks-kerne + refaktorér det lokale script

**Files:**
- Create: `scripts/tilbud-core.mjs`
- Modify: `scripts/opdater-tilbud.mjs`

- [ ] **Step 1: Skriv `scripts/tilbud-core.mjs`**

```js
// DELT kerne for tilbuds-udtræk — bruges af BÅDE det lokale script
// (opdater-tilbud.mjs) OG cloud-scriptet (opdater-tilbud-cloud.mjs).
// Renderer en PDF (buffer), uploader PDF+forside til Storage, kalder
// edge-funktionen importer-tilbud pr. side, og skriver til `tilbud`-tabellen.
// Nøgler læses fra miljøvariabler: SB_SERVICE (service-role), SB_ANON (anon).
import { pdf } from 'pdf-to-img';

const REF = 'oqolcifpmdybimspnadc';
const BUCKET = 'tilbudsaviser';
const FUNK_URL = `https://${REF}.supabase.co/functions/v1/importer-tilbud`;
const STORAGE = `https://${REF}.supabase.co/storage/v1/object`;
const REST = `https://${REF}.supabase.co/rest/v1`;

function svcHead() {
  const s = process.env.SB_SERVICE;
  return { Authorization: `Bearer ${s}`, apikey: s };
}

export async function uploadStorage(navn, buf, type) {
  const r = await fetch(`${STORAGE}/${BUCKET}/${navn}`, {
    method: 'POST',
    headers: { ...svcHead(), 'Content-Type': type, 'x-upsert': 'true' },
    body: buf,
  });
  if (!r.ok) throw new Error(`upload ${navn}: ${r.status} ${await r.text()}`);
}

async function udtrækSide(dataUrl) {
  const anon = process.env.SB_ANON;
  const r = await fetch(FUNK_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${anon}`, apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ billede: dataUrl }),
  });
  if (!r.ok) return [];
  const j = await r.json();
  return Array.isArray(j.varer) ? j.varer : [];
}

async function skrivTilbud(butik, uge, varer) {
  await fetch(`${REST}/tilbud?butik=eq.${encodeURIComponent(butik)}&uge=eq.${uge}`, {
    method: 'DELETE', headers: svcHead(),
  });
  if (varer.length === 0) return;
  const rows = varer.map(v => ({ butik, uge, navn: v.navn, soeg: v.soeg ?? [], pris: v.pris }));
  for (let i = 0; i < rows.length; i += 500) {
    const r = await fetch(`${REST}/tilbud`, {
      method: 'POST',
      headers: { ...svcHead(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(rows.slice(i, i + 500)),
    });
    if (!r.ok) throw new Error(`insert tilbud: ${r.status} ${await r.text()}`);
  }
}

// Behandl én butik: render PDF-buffer, upload PDF+cover, udtræk pr. side, skriv.
// Returnerer { antal }. `log` kaldes med fremdrifts-tekst (default: ingenting).
export async function behandlButik({ slug, butik, uge, pdfBuffer, maxSider = Infinity, log = () => {} }) {
  const doc = await pdf(pdfBuffer, { scale: 1.3 });
  const sider = Math.min(doc.length, maxSider);

  await uploadStorage(`${slug}-uge${uge}.pdf`, pdfBuffer, 'application/pdf');
  const cover = await doc.getPage(1);
  await uploadStorage(`${slug}-cover.png`, cover, 'image/png');
  log(`  PDF + cover uploadet (${doc.length} sider)`);

  const varer = [];
  for (let i = 1; i <= sider; i++) {
    const png = await doc.getPage(i);
    const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
    varer.push(...await udtrækSide(dataUrl));
    if (i % 10 === 0 || i === sider) log(`  side ${i}/${sider} — ${varer.length} tilbud i alt`);
  }

  await skrivTilbud(butik, uge, varer);
  return { antal: varer.length };
}
```

- [ ] **Step 2: Refaktorér `scripts/opdater-tilbud.mjs` til at bruge kernen**

Erstat HELE filen med (samme adfærd som før, men render/udtræk ligger nu i kernen):
```js
// Ugentlig tilbuds-opdatering (LOKAL) — læser PDF'er fra disk og bruger den
// delte kerne (tilbud-core.mjs). Cloud-varianten (opdater-tilbud-cloud.mjs)
// bruger samme kerne, men henter PDF'erne fra Storage.
//
// KØR (via PowerShell-launcheren der henter nøglerne):
//   pwsh scripts/opdater-tilbud.ps1            (indeværende uge)
//   pwsh scripts/opdater-tilbud.ps1 -Uge 25    (bestemt uge)
import { readFileSync } from 'fs';
import { behandlButik } from './tilbud-core.mjs';

// Ret stierne her når du har nye PDF'er. slug bruges til filnavne i Storage.
const BUTIKKER = [
  { butik: 'Netto',     slug: 'netto',    pdf: 'C:/Users/gust5/Downloads/netto uge 25-compressed.pdf' },
  { butik: 'Rema 1000', slug: 'rema1000', pdf: 'C:/Users/gust5/Downloads/rema1000 uge 25-compressed.pdf' },
  { butik: 'Føtex',     slug: 'fotex',    pdf: 'C:/Users/gust5/Downloads/Føtex uge 25_compressed.pdf' },
];

if (!process.env.SB_SERVICE || !process.env.SB_ANON) {
  console.error('Mangler SB_SERVICE/SB_ANON (kør via opdater-tilbud.ps1)');
  process.exit(1);
}

function aktuelUge() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((((now.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
}
const ugeArg = process.argv.find(a => a.startsWith('--uge='));
const UGE = ugeArg ? parseInt(ugeArg.split('=')[1], 10) : aktuelUge();
const maxArg = process.argv.find(a => a.startsWith('--maxsider='));
const MAX_SIDER = maxArg ? parseInt(maxArg.split('=')[1], 10) : Infinity;

for (const b of BUTIKKER) {
  console.log(`\n=== ${b.butik} (uge ${UGE}) ===`);
  try {
    const { antal } = await behandlButik({
      slug: b.slug, butik: b.butik, uge: UGE,
      pdfBuffer: readFileSync(b.pdf), maxSider: MAX_SIDER, log: console.log,
    });
    console.log(`  ✓ ${antal} tilbud gemt for ${b.butik}`);
  } catch (e) {
    console.error(`  FEJL (${b.butik}): ${e.message}`);
  }
}
console.log('\nFærdig. Appen henter de nye tilbud automatisk.');
```

- [ ] **Step 3: Syntaks-tjek begge scripts (parser uden at køre)**
```
node --check "C:/Users/gust5/claude/StudentLifeStyle/scripts/tilbud-core.mjs"
node --check "C:/Users/gust5/claude/StudentLifeStyle/scripts/opdater-tilbud.mjs"
```
Forventet: ingen output, exit 0 for begge.

- [ ] **Step 4: (Valgfrit) lokal end-to-end test af én side**

Hvis du har en gyldig PDF og vil bekræfte hele kæden mod databasen, ret en sti i `BUTIKKER` og kør launcheren med få sider:
```
pwsh "C:/Users/gust5/claude/StudentLifeStyle/scripts/opdater-tilbud.ps1" -Uge 99 -MaxSider 1
```
Forventet: `✓ <n> tilbud gemt`. (Uge 99 = throwaway, så rigtige uger ikke røres.) Spring over hvis ingen PDF er klar.

- [ ] **Step 5: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "scripts/tilbud-core.mjs" "scripts/opdater-tilbud.mjs"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'refactor(scripts): udtraek deles i tilbud-core.mjs (lokal + cloud)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 4: Cloud-script — henter PDF fra Storage og opdaterer job-status

**Files:**
- Create: `scripts/opdater-tilbud-cloud.mjs`

- [ ] **Step 1: Skriv `scripts/opdater-tilbud-cloud.mjs`**

```js
// Sky-variant af tilbuds-opdateringen — KØRES af GitHub Action'en
// (.github/workflows/tilbud-import.yml). Læser jobs fra dispatch-payloaden
// (env PAYLOAD), henter hver PDF fra Storage `inbox/`, bruger den delte kerne,
// og opdaterer `tilbud_import_job`-status. Nøgler: SB_SERVICE, SB_ANON (env).
import { behandlButik } from './tilbud-core.mjs';

const REF = 'oqolcifpmdybimspnadc';
const BUCKET = 'tilbudsaviser';
const STORAGE = `https://${REF}.supabase.co/storage/v1/object`;
const REST = `https://${REF}.supabase.co/rest/v1`;

const SERVICE = process.env.SB_SERVICE;
const ANON = process.env.SB_ANON;
if (!SERVICE || !ANON) { console.error('Mangler SB_SERVICE/SB_ANON'); process.exit(1); }

const payload = JSON.parse(process.env.PAYLOAD || '{}');
const UGE = Number(payload.uge);
const JOBS = Array.isArray(payload.jobs) ? payload.jobs : [];
if (!UGE || JOBS.length === 0) { console.error('Tomt payload (uge/jobs)'); process.exit(1); }

const svcHead = { Authorization: `Bearer ${SERVICE}`, apikey: SERVICE };

async function sætStatus(slug, fields) {
  const id = `${slug}-uge${UGE}`;
  await fetch(`${REST}/tilbud_import_job?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...svcHead, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
  });
}

async function hentPdf(sti) {
  const r = await fetch(`${STORAGE}/${BUCKET}/${sti}`, { headers: svcHead });
  if (!r.ok) throw new Error(`hent ${sti}: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function sletInbox(sti) {
  await fetch(`${STORAGE}/${BUCKET}/${sti}`, { method: 'DELETE', headers: svcHead });
}

for (const job of JOBS) {
  const { slug, butik } = job;
  const sti = job.sti || `inbox/${slug}-uge${UGE}.pdf`;
  console.log(`\n=== ${butik} (uge ${UGE}) ===`);
  try {
    await sætStatus(slug, { status: 'kører', fejl: null });
    const pdfBuffer = await hentPdf(sti);
    const { antal } = await behandlButik({ slug, butik, uge: UGE, pdfBuffer, log: console.log });
    await sletInbox(sti);
    await sætStatus(slug, { status: 'færdig', antal });
    console.log(`  ✓ ${antal} tilbud gemt for ${butik}`);
  } catch (e) {
    await sætStatus(slug, { status: 'fejl', fejl: String(e?.message ?? e) });
    console.error(`  FEJL (${butik}): ${e?.message ?? e}`);
  }
}
console.log('\nFærdig.');
```

- [ ] **Step 2: Syntaks-tjek**
```
node --check "C:/Users/gust5/claude/StudentLifeStyle/scripts/opdater-tilbud-cloud.mjs"
```
Forventet: ingen output, exit 0.

- [ ] **Step 3: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "scripts/opdater-tilbud-cloud.mjs"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(scripts): cloud-udtraek henter PDF fra Storage + opdaterer job-status\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 5: GitHub Action-workflow

**Files:**
- Create: `.github/workflows/tilbud-import.yml`

> Bemærk: `.git` ligger i repo-roden `C:/Users/gust5/claude/StudentLifeStyle`, så workflow-filen skal ligge i repo-roden under `.github/workflows/`. **Opret den i app-mappens `.github/` IKKE** — den skal ligge der GitHub kan se den (repo-roden). Stien herunder er relativ til repo-roden.

- [ ] **Step 1: Skriv workflowen i repo-roden**

Fil: `C:/Users/gust5/claude/StudentLifeStyle/.github/workflows/tilbud-import.yml`
```yaml
name: Tilbud-import
on:
  repository_dispatch:
    types: [tilbud-import]

jobs:
  import:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - name: Installer afhængigheder
        working-directory: "."
        run: npm install --no-audit --no-fund
      - name: Kør tilbuds-udtræk
        working-directory: "."
        env:
          SB_SERVICE: ${{ secrets.SB_SERVICE }}
          SB_ANON: ${{ secrets.SB_ANON }}
          PAYLOAD: ${{ toJson(github.event.client_payload) }}
        run: node scripts/opdater-tilbud-cloud.mjs
```

- [ ] **Step 2: Valider YAML-syntaksen**
```
node -e "const fs=require('fs');const s=fs.readFileSync('C:/Users/gust5/claude/StudentLifeStyle/.github/workflows/tilbud-import.yml','utf8');if(!/repository_dispatch/.test(s)||!/opdater-tilbud-cloud\.mjs/.test(s))throw new Error('mangler felter');console.log('OK: indeholder trigger + script-kald');"
```
Forventet: `OK: indeholder trigger + script-kald`.

- [ ] **Step 3: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add ".github/workflows/tilbud-import.yml"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'ci: workflow der koerer tilbuds-udtraek paa repository_dispatch\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

> **Vigtigt:** Workflowen kan først udløses, når den findes i `origin/main` på GitHub. Push sker i Task 11 (når brugeren beder om det), og GitHub-secrets sættes i Task 10.

---

## Task 6: Edge-funktion `start-tilbud-import`

**Files:**
- Create: `supabase/functions/start-tilbud-import/index.ts`

- [ ] **Step 1: Skriv funktionen**

```ts
// Admin starter sky-tilbuds-import: verificér kalderens JWT-email mod en
// allowlist, og affyr en GitHub repository_dispatch der trigger Action'en
// (.github/workflows/tilbud-import.yml). Funktionen gemmer INTET selv.
// ?dry_run=1 returnerer payloaden uden at affyre (kræver stadig admin).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_EMAILS = ['os.isberg@gmail.com'];
const REPO = 'osisberg-rgb/StudentLifeStyle';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const dryRun = new URL(req.url).searchParams.get('dry_run') === '1';

  // Admin-gate: læs brugeren ud af det medsendte JWT.
  const auth = req.headers.get('Authorization') ?? '';
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return json({ error: 'forbidden' }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const uge = Number(body?.uge);
  const jobs = Array.isArray(body?.jobs) ? body.jobs : [];
  if (!uge || jobs.length === 0) return json({ error: 'Mangler uge/jobs' }, 400);

  const payload = { event_type: 'tilbud-import', client_payload: { uge, jobs } };
  if (dryRun) return json({ dryRun: true, ...payload });

  const token = Deno.env.get('GITHUB_DISPATCH_TOKEN');
  if (!token) return json({ error: 'GITHUB_DISPATCH_TOKEN ikke sat' }, 500);

  const gh = await fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'maet-tilbud-import',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!gh.ok) return json({ error: `GitHub dispatch fejlede: ${gh.status} ${await gh.text()}` }, 502);
  return json({ ok: true, uge, antal: jobs.length });
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
```

- [ ] **Step 2: Deploy funktionen**

Sæt access-token (fra Credential Manager) og deploy med `--no-verify-jwt` (samme mønster som `send-tilbud-notifikationer`). Admin håndhæves i KODEN via `getUser()` — appen sender stadig brugerens token gennem `functions.invoke`, så `getUser()` kan validere det; `--no-verify-jwt` betyder blot at platformen ikke selv afviser kald uden token (så vores eksplicitte 403 bliver gaten og kan testes):
```
pwsh -Command "& { . 'C:/Users/gust5/claude/StudentLifeStyle/scripts/sb-token.ps1'; npx supabase functions deploy start-tilbud-import --no-verify-jwt --project-ref oqolcifpmdybimspnadc }"
```
> Hvis `scripts/sb-token.ps1` ikke findes/ikke eksporterer `$env:SUPABASE_ACCESS_TOKEN`, så genbrug Credential-Manager-snippetten fra `scripts/sb-sql.ps1` til at sætte `$env:SUPABASE_ACCESS_TOKEN` før `npx supabase functions deploy`. "Docker is not running"-advarslen er harmløs.

Forventet: `Deployed Function start-tilbud-import`.

- [ ] **Step 3: Verificér admin-gaten (uden token → 403)**
```
node -e "fetch('https://oqolcifpmdybimspnadc.supabase.co/functions/v1/start-tilbud-import?dry_run=1',{method:'POST',headers:{'Content-Type':'application/json','apikey':'sb_publishable_SntdXltM0E8APcJBVIs4hw_MAtau6SF'},body:'{}'}).then(async r=>console.log(r.status, await r.text()))"
```
Forventet: `403 {\"error\":\"forbidden\"}` — beviser at funktionen er deployet og gaten virker. (Fuld dispatch testes via appen i Task 11.)

- [ ] **Step 4: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "supabase/functions/start-tilbud-import/index.ts"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(edge): start-tilbud-import affyrer GitHub dispatch (admin-gate)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 7: `lib/admin.ts`

**Files:**
- Create: `lib/admin.ts`

- [ ] **Step 1: Skriv filen**

```ts
import type { Session } from '@supabase/supabase-js';

// Admin-e-mails der må uploade tilbudsaviser. Den RIGTIGE håndhævelse sker
// server-side (edge-funktionen start-tilbud-import + RLS) — dette skjuler blot
// indgangen i UI'et. Hold listen i sync med ADMIN_EMAILS i edge-funktionen.
export const ADMIN_EMAILS = ['os.isberg@gmail.com'];

export function erAdmin(session: Session | null): boolean {
  const email = session?.user?.email?.toLowerCase();
  return !!email && ADMIN_EMAILS.includes(email);
}
```

- [ ] **Step 2: tsc**

Kør tsc-kommandoen fra "Vigtige projekt-konventioner". Forventet: ingen fejl.

- [ ] **Step 3: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "lib/admin.ts"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(lib): admin-allowlist + erAdmin()\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 8: `lib/tilbudUpload.ts`

**Files:**
- Create: `lib/tilbudUpload.ts`

- [ ] **Step 1: Skriv filen**

```ts
// Admin-upload af tilbudsaviser: upload PDF'er til Storage `inbox/`, opret
// `tilbud_import_job`-rækker, og kald edge-funktionen start-tilbud-import der
// affyrer GitHub Action'en. hentJobStatus() bruges til at polle fremdrift.
import { supabase } from './supabase';

export type ButikValg = 'Netto' | 'Rema 1000' | 'Føtex' | 'SuperBrugsen' | 'Bilka';

// slug bruges i Storage-filnavne og MÅ matche de eksisterende (netto/rema1000/fotex).
export const BUTIK_SLUG: Record<ButikValg, string> = {
  'Netto': 'netto',
  'Rema 1000': 'rema1000',
  'Føtex': 'fotex',
  'SuperBrugsen': 'superbrugsen',
  'Bilka': 'bilka',
};

export const ALLE_BUTIK_VALG: ButikValg[] = ['Netto', 'Rema 1000', 'Føtex', 'SuperBrugsen', 'Bilka'];

export type UploadFil = { uri: string; navn: string; butik: ButikValg };

export type JobStatus = {
  id: string; butik: string; slug: string; uge: number;
  status: 'afventer' | 'kører' | 'færdig' | 'fejl'; antal: number; fejl: string | null;
};

// Samme uge-formel som appens getWeekNumber() (IKKE ISO).
export function aktuelUge(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
}

// Gæt butik ud fra filnavnet (bekvemmelighed — kan altid rettes i UI'et).
export function gætButik(filnavn: string): ButikValg {
  const n = filnavn.toLowerCase();
  if (n.includes('rema')) return 'Rema 1000';
  if (n.includes('føtex') || n.includes('fotex')) return 'Føtex';
  if (n.includes('brugsen')) return 'SuperBrugsen';
  if (n.includes('bilka')) return 'Bilka';
  return 'Netto';
}

// Upload hver PDF til inbox, opret job-rækker, og start sky-importen.
export async function uploadOgStart(filer: UploadFil[], uge: number): Promise<{ ok: boolean; fejl?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, fejl: 'Du er ikke logget ind' };

  const jobs: { slug: string; butik: string; sti: string }[] = [];
  for (const f of filer) {
    const slug = BUTIK_SLUG[f.butik];
    const sti = `inbox/${slug}-uge${uge}.pdf`;

    // Læs den lokale fil som ArrayBuffer (undgår RN's tomme-Blob-problem).
    const arrayBuffer = await (await fetch(f.uri)).arrayBuffer();
    const up = await supabase.storage.from('tilbudsaviser')
      .upload(sti, arrayBuffer, { contentType: 'application/pdf', upsert: true });
    if (up.error) return { ok: false, fejl: `Upload fejlede (${f.butik}): ${up.error.message}` };

    const ins = await supabase.from('tilbud_import_job').upsert({
      id: `${slug}-uge${uge}`, user_id: user.id, butik: f.butik, slug, uge,
      status: 'afventer', antal: 0, fejl: null,
    }, { onConflict: 'id' });
    if (ins.error) return { ok: false, fejl: `Kunne ikke oprette job (${f.butik}): ${ins.error.message}` };

    jobs.push({ slug, butik: f.butik, sti });
  }

  const { error } = await supabase.functions.invoke('start-tilbud-import', { body: { uge, jobs } });
  if (error) return { ok: false, fejl: `Kunne ikke starte sky-import: ${error.message}` };
  return { ok: true };
}

export async function hentJobStatus(uge: number, slugs: string[]): Promise<JobStatus[]> {
  const ids = slugs.map(s => `${s}-uge${uge}`);
  const { data } = await supabase.from('tilbud_import_job')
    .select('id, butik, slug, uge, status, antal, fejl')
    .in('id', ids);
  return (data ?? []) as JobStatus[];
}
```

- [ ] **Step 2: tsc**

Kør tsc-kommandoen. Forventet: ingen fejl. (Bemærk: `fetch`/`ArrayBuffer` findes i RN's runtime og i `@types/react-native`/lib.dom-typerne via expo-base — hvis tsc klager over `arrayBuffer`, så cast: `await (await fetch(f.uri) as Response).arrayBuffer()`.)

- [ ] **Step 3: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "lib/tilbudUpload.ts"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(lib): tilbudUpload (upload til inbox, opret job, start sky-import)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 9: `components/UploadTilbudModal.tsx`

**Files:**
- Create: `components/UploadTilbudModal.tsx`

- [ ] **Step 1: Skriv komponenten**

```tsx
// Admin-modal til at uploade ugens tilbudsaviser. Vælg 1-N PDF'er, sæt butik
// pr. fil, vælg uge, og send til skyen. Viser derefter status pr. butik
// (poller `tilbud_import_job`). Kun synlig for admin (gaten ligger i ProfilScreen).
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Alert, Modal,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Radii } from '../constants/theme';
import Chip from './Chip';
import {
  ALLE_BUTIK_VALG, BUTIK_SLUG, aktuelUge, gætButik, hentJobStatus, uploadOgStart,
  type ButikValg, type JobStatus, type UploadFil,
} from '../lib/tilbudUpload';

type Props = { synlig: boolean; onLuk: () => void };

const STATUS_TEKST: Record<JobStatus['status'], string> = {
  afventer: 'Afventer …', kører: 'Udtrækker …', færdig: 'Færdig', fejl: 'Fejl',
};

export default function UploadTilbudModal({ synlig, onLuk }: Props) {
  const [filer, setFiler] = useState<UploadFil[]>([]);
  const [uge, setUge] = useState(String(aktuelUge()));
  const [sender, setSender] = useState(false);
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ryd op ved luk
  useEffect(() => {
    if (!synlig) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      setFiler([]); setJobs([]); setSender(false); setUge(String(aktuelUge()));
    }
  }, [synlig]);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  async function vælgFiler() {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf', multiple: true, copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const nye = res.assets.map(a => ({ uri: a.uri, navn: a.name, butik: gætButik(a.name) }));
    setFiler(nye);
    setJobs([]);
  }

  function sætButik(index: number, b: ButikValg) {
    setFiler(prev => prev.map((f, i) => (i === index ? { ...f, butik: b } : f)));
  }

  function startPolling(ugeNr: number, slugs: string[]) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const s = await hentJobStatus(ugeNr, slugs);
      setJobs(s);
      const alleFærdige = s.length > 0 && s.every(j => j.status === 'færdig' || j.status === 'fejl');
      if (alleFærdige && pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; setSender(false); }
    }, 4000);
  }

  async function send() {
    const ugeNr = parseInt(uge, 10);
    if (!ugeNr || filer.length === 0) { Alert.alert('Hov', 'Vælg mindst én PDF og en gyldig uge.'); return; }
    setSender(true);
    const r = await uploadOgStart(filer, ugeNr);
    if (!r.ok) { setSender(false); Alert.alert('Fejl', r.fejl ?? 'Ukendt fejl'); return; }
    const slugs = filer.map(f => BUTIK_SLUG[f.butik]);
    setJobs(slugs.map(slug => ({
      id: `${slug}-uge${ugeNr}`, butik: '', slug, uge: ugeNr, status: 'afventer', antal: 0, fejl: null,
    })));
    startPolling(ugeNr, slugs);
  }

  return (
    <Modal visible={synlig} animationType="slide" presentationStyle="pageSheet" onRequestClose={onLuk}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.titel}>Upload tilbudsavis</Text>
          <TouchableOpacity onPress={onLuk}><Text style={styles.luk}>Færdig</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sub}>Vælg PDF'erne, sæt butik på hver, og send til skyen. Udtrækningen kører i baggrunden — du behøver ikke holde appen åben.</Text>

          <View style={styles.ugeRække}>
            <Text style={styles.ugeLabel}>Uge</Text>
            <TextInput
              style={styles.ugeInput}
              value={uge}
              onChangeText={setUge}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>

          <TouchableOpacity style={styles.vælgKnap} onPress={vælgFiler} activeOpacity={0.85}>
            <Text style={styles.vælgKnapTekst}>{filer.length ? 'Vælg andre PDF\'er' : 'Vælg PDF\'er'}</Text>
          </TouchableOpacity>

          {filer.map((f, i) => (
            <View key={f.uri} style={styles.filKort}>
              <Text style={styles.filNavn} numberOfLines={1}>{f.navn}</Text>
              <View style={styles.chips}>
                {ALLE_BUTIK_VALG.map(b => (
                  <Chip key={b} label={b} active={f.butik === b} onPress={() => sætButik(i, b)} />
                ))}
              </View>
            </View>
          ))}

          {jobs.length > 0 && (
            <View style={styles.statusBoks}>
              <Text style={styles.statusTitel}>Status</Text>
              {jobs.map(j => (
                <View key={j.id} style={styles.statusRække}>
                  <Text style={styles.statusButik}>{j.slug}</Text>
                  <Text style={[styles.statusVærdi, j.status === 'fejl' && { color: Colors.red }, j.status === 'færdig' && { color: Colors.green }]}>
                    {STATUS_TEKST[j.status]}{j.status === 'færdig' ? ` — ${j.antal} tilbud` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.sendKnap, (sender || filer.length === 0) && { opacity: 0.4 }]}
            onPress={send}
            disabled={sender || filer.length === 0}
          >
            <Text style={styles.sendTekst}>{sender ? 'Sender …' : 'Send til sky'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  titel: { fontSize: 20, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.4 },
  luk: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.green },
  content: { padding: 20 },
  sub: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, lineHeight: 20, marginBottom: 20 },
  ugeRække: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  ugeLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  ugeInput: {
    backgroundColor: Colors.card, borderRadius: Radii.btn, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 15, fontFamily: 'Inter_600SemiBold',
    color: Colors.ink, minWidth: 64, textAlign: 'center',
  },
  vælgKnap: {
    backgroundColor: Colors.greenSoft, borderRadius: Radii.btn, paddingVertical: 14,
    alignItems: 'center', marginBottom: 16,
  },
  vælgKnapTekst: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.green },
  filKort: {
    backgroundColor: Colors.card, borderRadius: Radii.card, borderWidth: 1, borderColor: Colors.line,
    padding: 14, marginBottom: 12,
  },
  filNavn: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusBoks: {
    backgroundColor: Colors.card, borderRadius: Radii.card, borderWidth: 1, borderColor: Colors.line,
    padding: 16, marginTop: 8,
  },
  statusTitel: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  statusRække: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  statusButik: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  statusVærdi: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.line },
  sendKnap: { backgroundColor: Colors.green, borderRadius: Radii.btn, padding: 15, alignItems: 'center' },
  sendTekst: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
```

- [ ] **Step 2: tsc**

Kør tsc-kommandoen. Forventet: ingen fejl. Hvis `Chip`-propsene afviger (tjek `components/Chip.tsx`), så tilpas `label`/`active`/`onPress` til den faktiske signatur.

- [ ] **Step 3: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "components/UploadTilbudModal.tsx"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(ui): UploadTilbudModal (admin upload + status-poll)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 10: Admin-indgang i ProfilScreen + GitHub-secrets

**Files:**
- Modify: `screens/ProfilScreen.tsx`

- [ ] **Step 1: Tilføj imports**

I `screens/ProfilScreen.tsx`, efter linjen `import { harTilladelse, registrérForPush, afmeldPush } from '../lib/notifikationer';`, tilføj:
```ts
import { erAdmin } from '../lib/admin';
import UploadTilbudModal from '../components/UploadTilbudModal';
```

- [ ] **Step 2: Hent `session` + state til modalen**

Skift linjen `const { user, signOut } = useAuth();` til:
```ts
const { user, session, signOut } = useAuth();
```
Og tilføj efter `const [historikÅben, setHistorikÅben] = useState(false);`:
```ts
const [uploadÅben, setUploadÅben] = useState(false);
```

- [ ] **Step 3: Tilføj admin-sektionen**

Lige FØR blokken `{/* Andet */}` (linjen `<Text style={styles.sektionLabel}>ANDET</Text>` er starten på den), indsæt:
```tsx
{erAdmin(session) && (
  <>
    <Text style={styles.sektionLabel}>ADMIN</Text>
    <View style={styles.kort}>
      <TouchableOpacity style={styles.række} onPress={() => setUploadÅben(true)}>
        <Text style={styles.rækkIkon}>🗞️</Text>
        <Text style={styles.rækkeLabel}>Upload tilbudsavis</Text>
        <Text style={styles.værditekst}>›</Text>
      </TouchableOpacity>
    </View>
  </>
)}
```

- [ ] **Step 4: Render modalen**

Lige FØR den afsluttende `</SafeAreaView>` (efter `<BesparelsesHistorikModal ... />`-blokken), indsæt:
```tsx
<UploadTilbudModal synlig={uploadÅben} onLuk={() => setUploadÅben(false)} />
```

- [ ] **Step 5: tsc**

Kør tsc-kommandoen. Forventet: ingen fejl.

- [ ] **Step 6: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "screens/ProfilScreen.tsx"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(profil): admin-indgang til Upload tilbudsavis\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

- [ ] **Step 7: Sæt hemmeligheder (operationelt — brugeren udfører)**

Disse skal sættes før første rigtige kørsel:

1. **GitHub-token** til edge-funktionen. Opret en *fine-grained PAT* med adgang KUN til repoet `osisberg-rgb/StudentLifeStyle` og rettigheden **"Contents: Read and write"** (det er det `repository_dispatch` kræver). Sæt den som Supabase edge-secret:
   ```
   pwsh -Command "& { . 'C:/Users/gust5/claude/StudentLifeStyle/scripts/sb-token.ps1'; npx supabase secrets set GITHUB_DISPATCH_TOKEN=github_pat_DIN_TOKEN --project-ref oqolcifpmdybimspnadc }"
   ```
2. **Supabase-nøgler** som GitHub repo-secrets (henter du i Supabase-dashboardet → Project Settings → API keys):
   ```
   gh secret set SB_SERVICE --repo osisberg-rgb/StudentLifeStyle --body "<service_role/secret key>"
   gh secret set SB_ANON --repo osisberg-rgb/StudentLifeStyle --body "sb_publishable_SntdXltM0E8APcJBVIs4hw_MAtau6SF"
   ```
   Verificér:
   ```
   gh secret list --repo osisberg-rgb/StudentLifeStyle
   ```
   Forventet: `SB_SERVICE` og `SB_ANON` på listen.

---

## Task 11: ROADMAP + end-to-end verifikation

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1: Opdater ROADMAP**

Læs `ROADMAP.md`. Tilføj et afkrydset milepæls-punkt under den relevante milepæls-sektion:
```
- [x] Sky-baseret tilbuds-import: in-app admin-upload → Storage → edge-fn repository_dispatch → GitHub Action kører udtrækket → `tilbud` (app læser live).
```
Og en linje i beslutningsloggen (med dagens dato):
```
- **2026-06-20:** Tilbuds-pipelinen flyttet fra PC til skyen. Valgt GitHub Actions (genbruger det velafprøvede Node-udtræk via `scripts/tilbud-core.mjs`) frem for Deno-edge-rendering eller OpenAI PDF-input. Intet butiks-API — admin uploader PDF'erne i appen. Spec/plan i `docs/superpowers/`.
```

- [ ] **Step 2: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "ROADMAP.md"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'docs(roadmap): sky-baseret tilbuds-import + beslutningslog\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

- [ ] **Step 3: Push (kun når brugeren beder om det)**

Workflowen virker først når den ligger i `origin/main`:
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" push origin main
```

- [ ] **Step 4: End-to-end røgtest (bruger-drevet — kræver EAS dev-build)**

Agenten booter IKKE emulator. Brugeren tester selv:
1. Genindlæs appen (dev-build med `expo-document-picker`). Gå til **Profil → Upload tilbudsavis** (kun synlig for din konto).
2. Vælg en PDF, sæt butik, vælg en throwaway-uge (fx 99), tryk **Send til sky**.
3. I GitHub → Actions skal "Tilbud-import" køre. Status i appen går `afventer → kører → færdig — N tilbud`.
4. Verificér rækker:
   ```
   pwsh "C:/Users/gust5/claude/StudentLifeStyle/scripts/sb-sql.ps1" -Query "select butik, count(*) from tilbud where uge=99 group by butik;"
   ```
   Forventet: én række med antal > 0. Ryd op bagefter:
   ```
   pwsh "C:/Users/gust5/claude/StudentLifeStyle/scripts/sb-sql.ps1" -Query "delete from tilbud where uge=99;"
   ```

---

## Afhængigheds-rækkefølge

1 (pdf-to-img) → 3 (kerne bruger pdf-to-img). 2 (DB) er uafhængig men kræves før 4/8/11-test. 3 → 4 (cloud bruger kerne). 4 → 5 (workflow kører cloud-script). 6 (edge) uafhængig. 7 → 8 → 9 → 10 (UI-kæde; 8 bruger ikke 7, men 10 binder admin+modal sammen). 11 til sidst. Secrets (Task 10 Step 7) før end-to-end-test.
