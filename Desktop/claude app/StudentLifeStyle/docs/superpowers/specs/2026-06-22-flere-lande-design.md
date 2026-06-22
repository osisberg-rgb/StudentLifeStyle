# Flere lande (DK / NO / SE) — design

- **Dato:** 2026-06-22
- **Status:** Godkendt (tilgang B). Afventer spec-review før plan-eksekvering.
- **Emne:** Gør Mit Køkken land-bevidst, så hvert land har sit eget sprog, sine butikker,
  sine tilbudsaviser, sine priser/valuta og sine opskrifter. Denne omgang bygger
  **hele fundamentet** — Danmark er det eneste land med rigtigt indhold. At tilføje
  Norge/Sverige bagefter er **rent indhold** (dictionaries + tilbudsfiler + opskrifter),
  ingen kodeændringer.

## Baggrund

Mit Køkken er i dag 100 % Danmark-specifik på fem lag, alle implicit "DK":

1. **Butikker** — hardkodede danske kæder (`constants/tilbud/*.ts`, onboarding/ProfilScreen).
2. **Priser/valuta** — DKK, basispriser i `constants/basispriser.ts`.
3. **Sprog** — dansk UI-tekst hardkodet i JSX overalt.
4. **Opskrifter** — danske opskrifter + dansk `soeg`-ordforråd.
5. **Tilbuds-pipeline** — `tilbud`-tabellen + `scripts/`/GitHub Action uden land-begreb.

Der findes **intet land-begreb** i koden i dag (`harLandPåPlaner` betyder "landet på
Planer-fanen", ikke et land). Prismotoren bruger allerede modul-niveau singletons med
setter (`sætTilbudskilder`, `fjernKilder`) og cache-tømning — det mønster genbruger vi
til "aktivt land".

## Mål

- **Én bruger = ét land.** Landet vælges i onboarding (nyt **første** trin) og kan
  ændres i Profil. Hele appen lokaliseres til landets sprog, butikker, valuta,
  tilbud og opskrifter.
- **Land som datadimension** på tværs af profil, tilbudstabel, tilbudsfiler,
  basispriser, butiksliste, opskrifter og uge-pipelinen.
- **Sprog-mekanisme bygget helt færdig** (`t()`, valuta/tal-format, dictionaries
  da/no/sv) og **bevist ende-til-ende** på skallen (tab-navigation, onboarding,
  ProfilScreen). Resten af skærmene migreres inkrementalt bagefter.
- **DK = eneste rigtige indhold.** NO/SE er gyldige valg, men starter med tomme
  tilbudsfiler, tom basisprisliste, nul opskrifter og dansk fallback på sprog,
  indtil indholdet fyldes på.
- **`npx tsc --noEmit` forbliver ren.**

## Ikke-mål

- **Ingen norsk/svensk indhold i denne omgang.** Ingen NO/SE-tilbudsaviser,
  -opskrifter eller -oversættelser udfyldes nu (det er den efterfølgende
  indholds-fase, der ikke kræver kodeændringer).
- **Ingen "skift land midt i en session"-rejse-feature.** Brugeren kan ændre land i
  Profil, men appen browser ikke flere lande samtidigt.
- **Ingen separate app-builds.** Én kodebase, ét App Store-listing (land vælges i app).
- **Ingen oversættelse af alle skærme nu.** Kun skallen migreres; mønsteret
  dokumenteres til inkremental videreførelse.
- **Ingen automatisk oversættelse / maskinoversættelse** af opskrifter eller UI.

## Centrale beslutninger

1. **Land bor i `profiles.country`** (`'DK' | 'NO' | 'SE'`, `default 'DK'`). Eksisterende
   brugere backfilles til `'DK'`. Valgt i onboarding, ændres i Profil.
2. **Central land-konfiguration** i `constants/lande.ts` — ét sted der definerer hvert
   lands kode, navn, sprog, valuta, valuta-suffiks, locale, butiksliste og flag-emoji.
   Alt andet slår op her i stedet for at hardkode "Danmark/DKK/Netto…".
3. **`LandContext`** (ny React-context) holder aktivt land, eksponerer `t()` og
   `formatPris()`, og kalder `sætAktivtLand()` ind i prismotoren ved boot/skift.
   Cache i expo-secure-store → øjeblikkeligt korrekt sprog ved opstart (ingen DK-glimt).
4. **Hjemmebygget i18n** (intet tungt bibliotek): `constants/i18n/{da,no,sv}.ts` med en
   fælles `Oversættelser`-nøgletype; `no`/`sv` spreader `da` som base, så manglende
   nøgler **automatisk falder tilbage til dansk**. `t(nøgle, vars?)` interpolerer
   `{navn}`-pladsholdere.
5. **Prismotoren bliver land-skopet via modul-niveau "aktivt land"** (samme mønster som
   `fjernKilder`): tilbudsfiler flyttes til `constants/tilbud/<land>/*`, basispriser til
   `constants/basispriser/<land>.ts`, og `tilbudspriser.ts`/`basispriser/index.ts` læser
   det aktive lands kilder. Cache-nøgler får landet med. DK = nuværende data; NO/SE = tomme.
6. **`tilbud`-tabellen får en `land`-kolonne** (`default 'DK'`); `lib/tilbudSync.ts`
   filtrerer på det aktive land. Pipelinen (`tilbud-core.mjs`, scripts, edge-fn, Action,
   `tilbud_import_job`) bærer `land` igennem.
7. **Opskrifter tagges med land** via et nyt `lande?: LandKode[]`-felt (default `['DK']`);
   `alleOpskrifter()`/`findOpskrift()` filtrerer på aktivt land. NO/SE → nul opskrifter.
   Brugerens egne importerede opskrifter er knyttet til brugeren (ikke land) og vises altid.
8. **Valuta/tal udledes af landet.** `formatPris(kr, land)` bruger landets locale. DKK/NOK/SEK
   vises alle som "kr" men med landets tal-format. Ét format-sted erstatter spredt `${x} kr`.

## Datamodel (migration `007_flere_lande.sql`)

```sql
alter table public.profiles            add column if not exists country text not null default 'DK';
alter table public.tilbud              add column if not exists land    text not null default 'DK';
alter table public.tilbud_import_job   add column if not exists land    text not null default 'DK';
create index if not exists tilbud_land_butik_uge_idx on public.tilbud (land, butik, uge);
```

- `profiles.country` — brugerens land. Backfill: `default 'DK'` dækker alle eksisterende rækker.
- `tilbud.land` — hvilket lands avis tilbuddet kom fra. Synkroniseres ud via `tilbudSync`.
- `tilbud_import_job.land` — så admin kan uploade aviser pr. land.
- **Ikke ændret:** `madplaner`, `bruger_opskrifter`, `favoritter`, `watchlist` er per-bruger
  (`user_id`), så landet er implicit givet af brugeren — ingen kolonne nødvendig.

## Dataflow

1. **Opstart:** `LandContext` læser cachet land fra expo-secure-store (default `'DK'`) →
   sætter sproget + kalder `sætAktivtLand()` ind i prismotoren med det samme. Når
   profilen er hentet, opdateres landet fra `profiles.country` (typisk identisk).
2. **Onboarding:** nyt **første** trin "Vælg land" (flag-chips). Valget driver straks
   butiks-trinnet (landets butikker), opskrift-/favorit-trinnene (landets opskrifter) og
   valuta i payoff. Ved `færdig()` gemmes `country` i `profiles`.
3. **Prisopslag:** `slåEffektivPrisOp()` bruger det aktive lands basispriser + det aktive
   lands tilbudskilder. NO/SE uden data → ingen tilbud, tomme/uændrede priser.
4. **Tilbuds-sync:** `synkroniserTilbud()` henter `tilbud` filtreret på `land = aktivtLand`
   og overskriver fallback-filerne for det land.
5. **Skift land i Profil:** `sætLand(kode)` skriver `profiles.country`, opdaterer
   `LandContext`, kalder `sætAktivtLand()`, tømmer pris-caches og re-synkroniserer tilbud.
   Appen re-renderer på det nye sprog/valuta.
6. **Admin-upload:** upload-skærmen får en land-vælger; jobs og `tilbud`-rækker skrives med
   `land`. (DK fungerer som i dag.)

## Komponenter

Hver enhed har ét formål, et veldefineret interface og kendte afhængigheder.

### `constants/lande.ts`
- **Gør:** definerer `LandKode = 'DK' | 'NO' | 'SE'`, `Sprog = 'da' | 'no' | 'sv'`, typen
  `Land` (`kode`, `navn`, `sprog`, `valuta`, `valutaSuffix`, `locale`, `butikker: string[]`,
  `flag: string`), konstanten `LANDE: Record<LandKode, Land>`, `landFor(kode)` og
  `DEFAULT_LAND = 'DK'`. DK fyldes med de nuværende butikker; NO/SE med tomme/kandidat-lister.
- **Bruges af:** `LandContext`, onboarding, ProfilScreen, prismotor, format.
- **Afhænger af:** intet (ren data).

### `context/LandContext.tsx`
- **Gør:** provider der holder aktivt `LandKode`; loader fra SecureStore-cache → profil;
  `useLand()` returnerer `{ land, sætLand, t, formatPris }`. `sætLand` skriver `profiles.country`,
  cacher, kalder `sætAktivtLand()` (prismotor) og `synkroniserTilbud(true)`, og opdaterer state
  (app re-renderer). `t` er bundet til landets sprog.
- **Bruges af:** App-roden (wrap omkring NavigationContainer), alle skærme via `useLand()`.
- **Afhænger af:** `constants/lande.ts`, `constants/i18n`, `constants/format.ts`,
  `constants/tilbudspriser.ts` (`sætAktivtLand`), `lib/tilbudSync.ts`, `lib/supabase.ts`,
  `expo-secure-store`.

### `constants/i18n/index.ts` + `da.ts` / `no.ts` / `sv.ts`
- **Gør:** `da.ts` er kilde-dictionaryen (typen `Oversættelser` udledes af den). `no.ts`/`sv.ts`
  = `{ ...da, /* overrides */ }`, så uoversatte nøgler falder tilbage til dansk. `index.ts`
  eksponerer `lav(sprog): (nøgle, vars?) => string` med `{var}`-interpolation, og en
  `MANGLER`-markør i `__DEV__` så uoversatte nøgler er synlige under udvikling.
- **Bruges af:** `LandContext` (binder `t`).
- **Afhænger af:** `constants/lande.ts` (Sprog-typen).

### `constants/format.ts`
- **Gør:** `formatPris(kr, land)` → landets tal-format + "kr". Ét sted for prisvisning.
- **Bruges af:** alle skærme der viser priser (via `useLand().formatPris`).
- **Afhænger af:** `constants/lande.ts`.

### `constants/basispriser/{index,dk,no,se}.ts`  *(omdøbt fra `basispriser.ts`)*
- **Gør:** `dk.ts` = nuværende `BASISPRISER`-array. `no.ts`/`se.ts` = tomme arrays (stub).
  `index.ts` beholder den nuværende offentlige API (`BASISPRISER`, `slagBasispris`,
  `slåPrisOp`, `matcherSoegeord`) men slår op i det **aktive lands** array; `sætAktivtLand(kode)`
  skifter kilde og tømmer interne caches.
- **Bruges af:** `constants/tilbudspriser.ts`, modal-estimater (uændrede importstier `./basispriser`).
- **Afhænger af:** `constants/lande.ts`.

### `constants/tilbud/<land>/*.ts`  *(de nuværende filer flyttes til `dk/`)*
- **Gør:** per-land fallback/seed-tilbudsfiler. `dk/` = de 8 nuværende kæder. `no/`/`se/`
  oprettes tomme (kun en `index.ts` der eksporterer `[]`), klar til indhold.
- **Bruges af:** `constants/tilbudspriser.ts`.
- **Afhænger af:** intet.

### `constants/tilbudspriser.ts`  *(ændret)*
- **Gør:** tilføjer `sætAktivtLand(kode)`; `alleKilder()` vælger det aktive lands
  fallback-filer; pris-/tilbuds-cache-nøgler får landet med, så DK- og NO-opslag ikke blandes.
  `sætTilbudskilder()` (DB-overlay) gælder fortsat det aktive land.
- **Bruges af:** prismotor-forbrugere (uændret API udadtil).
- **Afhænger af:** `constants/basispriser`, `constants/tilbud/<land>`.

### `lib/tilbudSync.ts`  *(ændret)*
- **Gør:** `select('land, butik, uge, navn, soeg, pris')` + `.eq('land', aktivtLand)`; grupperer
  som i dag. Tager landet som argument (sat af `LandContext`).
- **Bruges af:** App-opstart, `LandContext.sætLand`.
- **Afhænger af:** `lib/supabase.ts`, `constants/tilbudspriser.ts`.

### `types/opskrift.ts` + opskrift-accessorer  *(ændret)*
- **Gør:** `Opskrift` får `lande?: LandKode[]` (default-fortolkning `['DK']`).
  `alleOpskrifter()`/`findOpskrift()` (i `lib/brugerOpskrifter.ts`) filtrerer statiske
  opskrifter på aktivt land; importerede (bruger-ejede) vises altid. De statiske DK-opskrifter
  behøver ikke ændres (manglende `lande` ⇒ DK).
- **Bruges af:** Home/Planer/onboarding/picker.
- **Afhænger af:** `constants/lande.ts`, `LandContext` (aktivt land).

### `screens/OnboardingScreen.tsx`  *(ændret)*
- **Gør:** nyt `'land'`-trin forrest i `TRIN`-arrayet (flag-chips fra `LANDE`). `BUTIKKER`-
  konstanten bliver `landFor(valgtLand).butikker`; favorit-/plan-trin bruger landets opskrifter;
  payoff bruger `formatPris`. `færdig()` gemmer `country`. Migreres samtidig til `t()` som
  bevis på sprog-mønsteret.
- **Bruges af:** App-onboarding-gate.
- **Afhænger af:** `useLand()`, `constants/lande.ts`.

### `screens/ProfilScreen.tsx`  *(ændret)*
- **Gør:** ny "Land/Country"-række → åbner en land-vælger (genbruger flag-chips); valg kalder
  `sætLand()`. Admin-upload-skærmen får en land-vælger. Migreres til `t()` som del af skallen.
- **Bruges af:** Profil-fanen.
- **Afhænger af:** `useLand()`, `lib/tilbudUpload.ts`.

### `App.tsx`  *(ændret)*
- **Gør:** wrap i `<LandProvider>`; tab-labels/-tekster via `t()`. `synkroniserTilbud` kaldes med
  aktivt land.
- **Afhænger af:** `LandContext`.

### Pipeline: `scripts/tilbud-core.mjs`, `opdater-tilbud*.mjs`, `supabase/functions/start-tilbud-import`, `.github/workflows/tilbud-import.yml`, `lib/tilbudUpload.ts`  *(ændret)*
- **Gør:** `behandlButik({..., land})` skriver `land` i `tilbud` (DELETE/INSERT nøgles nu på
  `land+butik+uge`). Jobs, payloads og `tilbud_import_job` bærer `land`. Default `'DK'` bevarer
  nuværende adfærd.
- **Afhænger af:** migration `007`.

## Fejlhåndtering

- **Ukendt/manglende land** (gammel cache, korrupt værdi) → fald tilbage til `DEFAULT_LAND='DK'`.
- **Manglende oversættelsesnøgle** → `no/sv` falder til `da`; mangler `da` også → returnér
  nøglen selv (synlig i `__DEV__`).
- **Tomme NO/SE-kilder** (tilbud/opskrifter) → appen virker; skærmene viser tomme tilstande.
  **Krav:** de migrerede skærme skal have ærlig tom-tekst ("Ingen tilbud i dit område endnu").
- **Pris-cache pr. land** → skift af land tømmer caches, så et lands priser aldrig lækker til et andet.
- **Profil-skrivning fejler ved landeskift** → behold optimistisk UI-skift, men log; næste opstart
  retter fra profilen. (Samme blød-fejl-stil som `deal_categories`.)

## i18n-strategi (omfang i denne omgang)

- **Byg mekanismen 100 %:** `t()`, `formatPris`, dictionaries med fallback, `LandContext`.
- **Migrér skallen som bevist mønster:** `App.tsx` (tabs), `OnboardingScreen`, `ProfilScreen`.
  Disse skærme henter alle synlige strenge fra `da.ts`.
- **Resten migreres inkrementalt** (Home, Planer, Indkøb, modaler) som ren indholdsopgave —
  dokumenteres i planen med et "sådan migrerer du en skærm"-mønster.
- **no/sv seedes** med de nøgler skallen bruger, værdier = dansk + `// TODO oversæt`, så de
  falder tilbage til dansk indtil en oversætter fylder dem. Det er den honest "fundament bygget,
  indhold senere"-tilstand: vælger man NO i dag, ser man dansk fallback, til no.ts udfyldes.

## Verifikation

- `npx tsc --noEmit` er gaten (intet test-runner). `tsconfig` ekskluderer `supabase/`; scripts er
  `.mjs` → kun app-filer type-tjekkes. Edge-fn/scripts verificeres ved deploy/`node --check`.
- **Manuelt (bruger-drevet, agenten booter ikke emulator):**
  1. Onboarding → vælg NO → butiks-/opskrift-/valuta-trin skifter; afslut; profil viser NO.
  2. Profil → skift mellem DK/NO/SE → app re-localiserer; DK viser tilbud, NO/SE tomme tilstande.
  3. DK-oplevelsen er **uændret** for eksisterende brugere (backfill `'DK'`).
- **DB:** `select country, count(*) from profiles group by country;` og
  `select land, count(*) from tilbud group by land;` efter migration.

## Åbne punkter / fremtid

- **Sprog-gæt fra enhedens locale** ved allerførste opstart (før login) kunne sætte default
  smartere end DK — udeladt nu (DEFAULT_LAND='DK' er nok).
- **NO/SE butikslister** i `lande.ts` er kandidater (Kiwi/Rema NO/Meny; ICA/Coop/Willys/Lidl SE) —
  bekræftes når indholdet bygges.
- **Oversættelse af de resterende skærme** er en selvstændig opgave efter fundamentet.
- **`vigtighed`/`soeg`-ordforråd** er i dag dansk-centreret; NO/SE får brug for eget ordforråd,
  men det hører til indholds-fasen, ikke fundamentet.
