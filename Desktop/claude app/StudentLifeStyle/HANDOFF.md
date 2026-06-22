# HANDOFF — Mit Køkken (fortsæt herfra på den nye Mac)

> Skrevet 18. juni 2026. Formål: gøre det nemt at fortsætte udviklingen fra en ny
> computer (MacBook). Læs denne fil først, derefter `README.md` (arkitektur/niche),
> `CLAUDE.md` (instruktioner til AI-instanser), `ROADMAP.md` (plan + beslutningslog)
> og `OPTIMERING.md` (backlog).

---

## TL;DR — hvor er vi

**Mit Køkken** er en dansk madplanlægger (React Native + Expo SDK 54 + Supabase) for
**familier/30+ der gemmer opskrifter** og vil spare med ugens supermarkeds-tilbud.
Al UI-tekst er dansk; mange filnavne bruger `æøå`.

Appen er funktionel og testes i **Expo Go**. Den **aktive store-feature** er
**tilbuds-notifikationer** (push når en overvåget vare er på tilbud): backend +
klient er bygget og verificeret; mangler kun et **EAS dev build** (kræver Mac) for
at sende rigtige push.

## Kom i gang på den nye Mac

```bash
git clone https://github.com/osisberg-rgb/StudentLifeStyle.git
cd StudentLifeStyle           # projektet ligger i repo-roden
npm install
npx expo start                # test i Expo Go (al funktionalitet UNDTAGEN push)
```

**Verifikations-gate (kør efter hver ændring):**
```bash
npx tsc --noEmit              # skal være ren
node scripts/test-matchning.mjs    # 20 cases — pris/match-logik
node scripts/test-watchlist.mjs    # 8 cases — term-normalisering
```

**Supabase-adgang på Mac:** kør `supabase login` én gang (CLI-tokenet på Windows
lå i Credential Manager; på Mac ligger det i `~/.supabase`). Projekt-ref:
`oqolcifpmdybimspnadc`. Deploy edge-funktion:
`npx supabase functions deploy <navn> --project-ref oqolcifpmdybimspnadc`.
> De Windows-specifikke hjælpescripts (`scripts/sb-sql.ps1`, `sb-token.ps1`,
> `opdater-tilbud.ps1`) bruger Win32 Credential Manager og virker **ikke** på Mac —
> brug `supabase` CLI'en direkte, eller skriv en lille bash-pendant.

## Hvad appen kan (features)

**Bund-tabs:** Hjem · Uge plan · central **+** · Indkøb · Profil.

- **Hjem:** "I aften"-forslag · ❤️ favoritter (tryk → læg på madplan/indkøb) ·
  **Tilbud til dig** (personligt: Mine varer-watchlist + favoritter + vigtighed +
  billigste butik på tværs) · 🔔 overvåg en vare · **Ugens aviser** (PDF-covers, in-app).
- **Uge plan:** byg ugen dag for dag; flere retter pr. dag; byt/slet pr. ret.
- **+ (central):** halvskærms-ark → foto / screenshot / link / skriv selv. Samme ark
  åbnes også fra "Tilføj opskrift"-kortet i opskrifts-vælgeren.
- **Indkøb:** kategoriseret liste, kryds-af, blå **+** (tilføj tilbudsvare), 🔔 pr. vare.
- **Profil:** butikker, antal personer, opskrifts-tal, **Notifikationer** (kontakt +
  "overvåg en vare"-felt + liste), besparelses-historik, log ud.
- **Opskrifter:** statiske + brugerens egne (link/foto/skriv-selv), kategorier inkl.
  **🍰 desserter**, søgning, rediger/slet egne, favoritter.

## Arkitektur (kort — detaljer i CLAUDE.md)

- **Pris-motoren (3 lag):** `constants/basispriser.ts` (fast vokabular, ændres aldrig)
  → `constants/tilbud/*.ts` (ugens tilbud pr. butik) → live-overlay `lib/tilbudSync.ts`
  (fletter Supabase `tilbud`-tabellen oven på filerne). Sammenfletning i
  `constants/tilbudspriser.ts`. Priser er hel-pakke. `matcherSoegeord` = ord-start,
  korte ord (≤3 tegn) som hele ord. `gætSoeg(navn)` auto-tagger frit skrevne ingredienser.
- **Opskrifter:** statiske i `supabase/functions/dynamic-action/opskrifter.ts`;
  brugerens i `bruger_opskrifter`-tabellen. Samlet accessor `lib/brugerOpskrifter.ts`
  (`alleOpskrifter()`/`findOpskrift()`).
- **Madplan/indkøb:** bygges klient-side (`constants/ugeplan.ts`, `constants/indkoeb.ts`,
  `lib/indkøbsliste.ts`). Indkøbslisten fyldes aldrig automatisk.
- **Edge-funktioner (Deno):** `importer-opskrift` (opskrift fra url/billede),
  `importer-tilbud` (avis-side → varer), `send-tilbud-notifikationer` (push),
  `dynamic-action` (legacy, ikke i brug).

## Tilbuds-notifikationer (den aktive feature) — status

**Spec:** `docs/superpowers/specs/2026-06-18-tilbuds-notifikationer-design.md`
**Plan (trin-for-trin):** `docs/superpowers/plans/2026-06-18-tilbuds-notifikationer.md`

Bruger overvåger **specifikke varer** (🔔 på tilbud/indkøb/ingredienser + fritekst-felt
i Profil) → **push når varen er på tilbud, også når appen er lukket**.

**✅ Fase A — Backend (bygget OG verificeret live):**
- Tabeller `watchlist`, `push_tokens`, `notifikationer_sendt` (+ RLS) — migration
  `supabase/migrations/20260618_watchlist_push.sql`.
- Edge-funktion `send-tilbud-notifikationer` (deployet, `--no-verify-jwt`, beskyttet med
  `CRON_SECRET`-header). Matcher watchlist mod ugens `tilbud` i brugerens `profiles.stores`,
  dedup via ledger, sender via **Expo Push API**. `?dry_run=1` returnerer planen uden at sende.
  Verificeret: dry_run gav korrekt match/besked.
- **`pg_cron`** kalder funktionen dagligt 08:00 via `pg_net` — verificeret med status 200.
  Migration `supabase/migrations/20260618_cron_notifikationer.sql` (secret er placeholder i git).
- Cron'en er LIVE men sender **intet** indtil der findes push-tokens (først efter dev build).

**✅ Fase B — Klient (alt tsc-rent):** `lib/watchlist.ts`, `lib/notifikationer.ts`
(blød i Expo Go via lazy `require`), `components/KlokkeKnap.tsx`, 🔔 i Hjem/Se alle/
Indkøb/OpskriftDetalje, Profil-sektion, token-registrering ved opstart.

**⏳ Fase C — MANGLER (kræver Mac + EAS):**
1. `npx expo install expo-notifications expo-device`
2. `eas login` + `eas init` (sætter `expo.extra.eas.projectId` i `app.json`)
3. Tilføj `expo-notifications`-plugin i `app.json`; opret `eas.json` med en `development`-profil
4. `eas build --profile development --platform ios` (og/eller android)
5. End-to-end test: tillad notifikationer → token i `push_tokens` → indsæt et matchende
   `tilbud` for indeværende uge → kald funktionen rigtigt (med `x-cron-secret`) → push lander.
   (Detaljerede trin: planens Task C1–C2.)

## Kendte problemer / teknisk gæld

- **Repo'et var længe ucommittet:** før denne commit lå hele niche-skiftet + meget app-kode
  ukommitteret i arbejdstræet. Nu er ALT committet. Historikken er derfor grovkornet for det
  ældre arbejde (få store commits), men koden er komplet.
- **Tilbud bliver forældede ugentligt:** kun uge 25 er sat i filerne; `lidl/365discount/kvikly`
  står på `uge: 0`. Ugentlig opdatering er manuel (PDF-pipeline). Tilbuds-soeg-tagging er ~80%.
- **`CRON_SECRET` er IKKE i git** (kun i Supabase-secret + Postgres-cron + `scripts/.cron-secret`
  som er gitignored). På Mac: hent den fra Supabase-dashboardet (Edge Functions → secrets) eller
  generér en ny og opdatér både funktions-secret og cron-jobbet.
- **Windows-only scripts:** `scripts/*.ps1` virker ikke på Mac (Win32 Credential Manager).
- **Pakkeversioner:** enkelte afviger fra SDK 54 (kør `npx expo install` for at aligne).
- **Manuel opskrift mangler billede-upload** (kun emoji-fallback). Dessert-kategorien har
  opskrifter men ingen billeder endnu.

## Hvad mangler / næste skridt (prioriteret)

1. **Fase C:** EAS dev build + ægte push-test (det første du gør på Mac'en).
2. **App Store:** Apple Developer-konto (99 USD/år), EAS Submit/TestFlight. Se `LANCERING.md`.
3. **Opskriftsbibliotek:** flere retter bredt + dessert-billeder.
4. **Tilbuds-automatisering polish:** bedre soeg-tagging eller et review-trin før data går live.
5. **Pris-motor-tests mod ægte kode** (i dag JS-spejle i `scripts/test-*.mjs`).

## Vigtige pegepinde

- `CLAUDE.md` — instruktioner + arkitektur for AI-instanser (læs før større ændringer).
- `ROADMAP.md` — beslutningslog (HVORFOR ting er som de er).
- `OPTIMERING.md` — prioriteret backlog.
- `LANCERING.md` — test/App Store/marketing-playbook.
- `docs/superpowers/` — spec + plan for notifikationer.
