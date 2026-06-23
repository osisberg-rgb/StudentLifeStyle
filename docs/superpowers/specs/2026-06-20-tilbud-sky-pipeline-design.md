# Tilbuds-pipeline i skyen — design

- **Dato:** 2026-06-20
- **Status:** Godkendt (afventer spec-review før plan)
- **Emne:** Flyt den ugentlige tilbuds-udtrækning fra brugerens PC til skyen, udløst af en in-app upload.

## Baggrund

I dag opdateres tilbuddene af et lokalt script (`scripts/opdater-tilbud.ps1` →
`scripts/opdater-tilbud.mjs`): det læser PDF'er fra disken, renderer hver side,
kalder edge-funktionen `importer-tilbud` (GPT-vision) pr. side, og skriver til
`tilbud`-tabellen. Appen henter `tilbud` **live** via `lib/tilbudSync.ts`, så
nye tilbud rammer alle brugere **uden ny app-version** — den del er allerede løst.

Det eneste der stadig binder pipelinen til PC'en er: at PDF'erne ligger lokalt,
og at render-/udtræks-løkken køres manuelt på maskinen.

## Mål

- Brugeren finder selv PDF'erne (manuelt — det er fint) og uploader dem **inde i
  MadUgen-appen** via en admin-skærm.
- Hele renderingen + AI-udtrækningen kører **i skyen i baggrunden** — ikke på
  PC'en — og skriver til `tilbud`.
- Brugeren ser status pr. butik i appen.
- Ingen ugentlig app-opdatering (allerede tilfældet via `tilbudSync`).

## Ikke-mål

- **Intet butiks-API.** Vi henter ikke aviser automatisk fra Tjek/Salling/etc.
- Ingen omskrivning af selve GPT-udtrækningen (`importer-tilbud` er uændret).
- Ingen offentlig upload til andre end admin.

## Centrale beslutninger

1. **Upload-sted:** in-app admin-skærm i MadUgen (ikke Storage-dashboard, ikke
   selvstændig webside).
2. **Compute:** GitHub Actions kører det eksisterende, velafprøvede Node-udtræk i
   skyen (ikke en Deno-edge-renderer, ikke OpenAI PDF-input). Lavest risiko,
   genbruger den tunede GPT-prompt og søg-ordforråd.
3. **Admin-gate:** e-mail-allowlist (`os.isberg@gmail.com`). Håndhæves
   **server-side** i edge-funktionen; UI'et skjuler blot indgangen.
4. **Status-feedback:** en lille `tilbud_import_job`-tabel som skærmen poller.

## Dataflow

1. Admin åbner **Profil → "Upload tilbudsavis"** (rækken vises kun for admin).
2. Skærmen: vælg 1–N PDF'er, sæt **butik** pr. fil (Netto / Rema 1000 / Føtex /
   Superbrugsen / Bilka), sæt **uge** (default = indeværende uge, samme formel som
   appen; kan rettes). Tryk **"Send til sky"**.
3. Appen uploader hver PDF til Storage `tilbudsaviser/inbox/<slug>-uge<NN>.pdf`
   og opretter en `tilbud_import_job`-række pr. (butik, uge) med status `afventer`.
4. Appen kalder edge-funktionen `start-tilbud-import` med `{ uge, jobs:[{slug,
   butik, sti}] }`. Funktionen verificerer admin (JWT), affyrer en GitHub
   `repository_dispatch` (event `tilbud-import`) og svarer straks.
5. GitHub Action (`tilbud-import.yml`) kører: for hvert job → hent PDF fra Storage
   `inbox/` → render sider (`pdf-to-img`) → kald `importer-tilbud` pr. side →
   saml `varer` → DELETE+INSERT i `tilbud` for (butik, uge) → upload `cover.png`
   → flyt PDF til arkivnavn `<slug>-uge<NN>.pdf` → opdater job-status
   `kører` → `færdig` (med `antal`) eller `fejl` (med besked).
6. Skærmen poller `tilbud_import_job` og viser status pr. butik. Appen henter
   `tilbud` live via `tilbudSync` — nye tilbud vises for alle brugere.

## Komponenter

Hver enhed har ét formål, et veldefineret interface og kendte afhængigheder.

### `lib/admin.ts`
- **Gør:** `erAdmin(session): boolean` mod en `ADMIN_EMAILS`-konstant.
- **Bruges af:** UI (skjul/vis upload-indgang). Den **rigtige** gate er i edge-fn.
- **Afhænger af:** `session` fra `AuthContext`.

### `screens/UploadTilbudScreen.tsx`
- **Gør:** fil-vælger (`expo-document-picker`, kun `application/pdf`), butik-vælger
  pr. fil, uge-felt, "Send til sky"-knap, status-liste pr. butik.
- **Bruges af:** Profil-skærmen (admin-række → navigation/modal).
- **Afhænger af:** `lib/tilbudUpload.ts`, `lib/admin.ts`, `constants/theme.ts`.

### `lib/tilbudUpload.ts`
- **Gør:** `uploadOgStart(filer, uge)` — uploader PDF'er til Storage `inbox/`,
  opretter job-rækker, kalder `start-tilbud-import`. `hentJobStatus(uge)` —
  henter job-rækker til polling.
- **Bruges af:** `UploadTilbudScreen`.
- **Afhænger af:** `lib/supabase.ts`.

### `supabase/migrations/006_tilbud_import.sql`
- **Gør:** opretter `tilbud_import_job`-tabel, RLS-policies, og Storage-policy så
  kun admin må skrive til `tilbudsaviser/inbox/`.
- **Datamodel:**
  - `tilbud_import_job(id text pk, user_id uuid, butik text, slug text, uge int,
    status text check in ('afventer','kører','færdig','fejl'), antal int default 0,
    fejl text, created_at timestamptz default now(), updated_at timestamptz)`.
  - Unik på `(butik, uge)` (gentaget upload overskriver job-rækken).
- **RLS:** admin (via `auth.jwt() ->> 'email'` i allowlist) kan læse/skrive egne
  rækker; service-role (Action) kan opdatere alle.

### `supabase/functions/start-tilbud-import/index.ts`
- **Gør:** verificér admin via JWT-email → POST GitHub `repository_dispatch`
  (`event_type: 'tilbud-import'`, `client_payload: { uge, jobs }`). `?dry_run=1`
  returnerer payloaden uden at affyre (samme mønster som
  `send-tilbud-notifikationer`).
- **Hemmelighed:** `GITHUB_DISPATCH_TOKEN` (fine-grained PAT, kun denne repo,
  rettighed til at affyre workflows) som Supabase edge-secret. Repo-slug som
  konstant/secret.
- **Deploy:** med JWT-verifikation TIL (appen sender brugerens token).

### `.github/workflows/tilbud-import.yml`
- **Gør:** `on: repository_dispatch: types: [tilbud-import]` → checkout → setup
  node → `npm ci` → `node scripts/opdater-tilbud-cloud.mjs` med
  `${{ github.event.client_payload }}` og repo-secrets `SB_SERVICE`, `SB_ANON`.
- **Secrets (GitHub repo):** `SB_SERVICE`, `SB_ANON`. (OpenAI-nøglen er IKKE nødig
  her — udtrækningen sker via edge-fn'en `importer-tilbud`.)

### `scripts/tilbud-core.mjs`
- **Gør:** den fælles render+udtræk+skriv-logik, udtrukket fra det nuværende
  `opdater-tilbud.mjs`: `behandlButik({ slug, butik, uge, pdfBuffer })` →
  render sider, kald `importer-tilbud`, upload cover, DELETE+INSERT `tilbud`.
- **Bruges af:** BÅDE det lokale launcher-script OG cloud-scriptet (ingen
  kode-dublering). Det lokale script bevares som fallback.

### `scripts/opdater-tilbud-cloud.mjs`
- **Gør:** læs `jobs` + `uge` fra dispatch-payloaden (env/args), hent hver PDF fra
  Storage `inbox/`, kald `tilbud-core.behandlButik`, opdatér
  `tilbud_import_job`-status (`kører` → `færdig`/`fejl`), flyt PDF til arkivnavn.
- **Afhænger af:** `SB_SERVICE`, `SB_ANON` fra env; `tilbud-core.mjs`.

## Fejlhåndtering

- **Pr. butik try/catch** (som i dag): én butik der fejler stopper ikke de andre;
  job-rækken sættes `fejl` med besked.
- **Upload fejler:** job forbliver `afventer`, skærmen viser fejl, brugeren prøver
  igen.
- **Tom side / ingen varer:** bidrager bare ingenting (eksisterende adfærd).
- **Idempotent:** gentaget (butik, uge) er DELETE+INSERT igen; inbox-PDF
  overskrives via `x-upsert`.
- **Edge-fn:** ikke-admin → 403; GitHub-dispatch fejler → fejl returneres til app.

## Sikkerhed

- Admin-allowlist håndhæves **server-side** i edge-fn'en (JWT-email), ikke kun i
  UI.
- Storage-policy: kun admin må skrive til `tilbudsaviser/inbox/`.
- GitHub-token bor som Supabase edge-secret — **aldrig i app-bundlen**.
- `SB_SERVICE`/`SB_ANON` som GitHub repo-secrets.
- `importer-tilbud` beholder OpenAI-nøglen server-side (uændret).

## Verifikation

- `npx tsc --noEmit` er gaten (intet test-runner i projektet).
- `?dry_run=1` på edge-fn'en til at se payloaden uden at affyre.
- Manuelt (brugeren, ikke agenten): upload én lille PDF → se job → `færdig` →
  bekræft at tilbuddene dukker op. In-app upload kræver `expo-document-picker` +
  en **ny EAS dev-build** for at teste på telefon.

## Åbne punkter / fremtid

- Senere kunne en `pg_cron`-/Storage-trigger erstatte det app-initierede kald,
  men app→edge→dispatch er nok og mest eksplicit nu.
- Hvis flere admins bliver relevant, kan allowlisten flyttes til et
  `profiles.is_admin`-flag uden at ændre arkitekturen.
