# Spec: Kogebøger ("Saml opskrifter i navngivne samlinger + importér flere fra fotos")

**Dato:** 2026-06-19
**Status:** Godkendt design → klar til implementeringsplan
**Niche-kontekst:** familier / 30+ der gemmer opskrifter. Se `README.md`, `ROADMAP.md`, `CLAUDE.md`.

## Mål

Brugeren kan oprette navngivne **kogebøger** (samlinger) og lægge opskrifter i dem — både
app'ens indbyggede og brugerens egne importerede. Derudover kan man **bulk-importere** flere
opskrifter på én gang ved at tage/​vælge flere sidefotos af en fysisk kogebog; hvert foto
bliver til én opskrift, og de samles automatisk i én kogebog.

Eksempel: bruger opretter "Min mors kogebog" → tager 8 fotos af bogens sider → app'en læser
hver side til en opskrift → bruger retter/​gemmer dem alle → de 8 opskrifter ligger nu i
"Min mors kogebog" og kan planlægges, prissættes og lægges på indkøbslisten som alle andre.

## Beslutninger (truffet i brainstorm 2026-06-19)

1. **Kernen er organisering** — navngivne samlinger man putter opskrifter i. Bulk-import er en
   tilføjelse oven på, ikke selve pointen.
2. **Tilhørsforhold: én kogebog pr. opskrift** (mappe-model, ikke tags). At flytte en opskrift
   er at skifte hvilken kogebog den ligger i.
3. **Hvad må med: egne + indbyggede.** Da indbyggede opskrifter ikke er brugerens egne DB-rækker,
   bruges en separat **medlemskabs-tabel** (samme mønster som `favoritter`), så `opskrift_id`
   som tekst dækker begge slags id'er.
4. **Bulk-import = fotos i v1.** Hjemmeside-crawl er teknisk tungt og holdes ude (se Uden for scope).
5. **Foto-opdeling: ét billede = én opskrift.** Spænder en opskrift over to sider, tager man
   ét billede der får begge med. Bygger direkte oven på den eksisterende vision-import.
6. **Bulk-mekanik: klient-side løkke.** App'en kalder den eksisterende edge-funktion
   `importer-opskrift` én gang pr. billede (med fremgang), frem for en ny edge-funktion der
   tager alle billeder på én gang — genbruger den deployede funktion og undgår dens tidsgrænse.
7. **Browsing i den eksisterende ret-vælger** (`VælgRetterModal`), ikke en ny fane — lavest
   risiko, ingen ændring af tab-baren. En dedikeret "Kogebøger"-fane kan komme senere.

## Datamodel (Supabase — ny migration, RLS slået til)

To tabeller, begge per-bruger, præcis som `favoritter` (003).

### `kogeboeger` (selve samlingerne)
| Felt | Type | Note |
|---|---|---|
| `id` | text (pk) | app-genereret, fx `kogebog-<rand>` (samme stil som `bruger-...`) |
| `user_id` | uuid (FK auth.users, on delete cascade) | |
| `navn` | text not null | fx "Min mors kogebog" |
| `emoji` | text default `'📕'` | lille ikon-/farve-accent (valgfri) |
| `created_at` | timestamptz default now() | |

### `kogebog_medlemskab` (hvilken opskrift ligger hvor)
| Felt | Type | Note |
|---|---|---|
| `user_id` | uuid (FK auth.users, on delete cascade) | |
| `opskrift_id` | text not null | statisk ELLER `bruger-...` id |
| `kogebog_id` | text not null (FK `kogeboeger(id)` on delete cascade) | |
| `created_at` | timestamptz default now() | |

**Primærnøgle `(user_id, opskrift_id)`** — håndhæver "én kogebog pr. opskrift". At flytte en
opskrift er en `upsert` der overskriver `kogebog_id`. `on delete cascade` på `kogebog_id`
rydder medlemskaber når en kogebog slettes (opskrifterne selv røres ikke).

RLS på begge: bruger kan kun se/​ændre egne rækker (`auth.uid() = user_id`), kopieret 1:1 fra
`favoritter`-policyerne.

## Klient — stores (`lib/kogebøger.ts`, ny)

Spejler `lib/favoritter.ts`: in-memory + version-tæller, så opslag er synkrone i vælgeren og
caches kan invalidere sig selv.

- `hentKogebøger()` / `hentMedlemskaber()` — kaldes ved opstart i `App.tsx` sammen med
  `hentFavoritter()`/`hentBrugerOpskrifter()`. Fejler de (ingen tabel, offline, ikke logget
  ind), røres storen ikke — appen kører uændret videre.
- Opslag: `kogebøger(): Kogebog[]`, `kogebogForOpskrift(opskriftId): Kogebog | undefined`,
  `opskrifterIKogebog(kogebogId): string[]`, `antalIKogebog(kogebogId): number`,
  `kogebøgerVersion(): number`.
- Mutationer: `opretKogebog(navn, emoji?)`, `omdøbKogebog(id, navn)`, `sletKogebog(id)`,
  `sætKogebogForOpskrift(opskriftId, kogebogId | null)` (upsert ved id, delete ved `null`).
  Alle bumper `version` og opdaterer storen optimistisk-venligt (rul tilbage ved fejl), som
  `sætFavorit`.

Ny type i `types/` (eller i `lib/kogebøger.ts`): `Kogebog = { id, navn, emoji, antal? }`.

## UI — browse & organisér (i den eksisterende vælger)

`components/VælgRetterModal.tsx`:

1. **Ny chip "📚 Kogebøger"** i chip-rækken (ved siden af Alle / ❤️ Favoritter / 🔗 Dine
   opskrifter). Vælges den, skifter griddet fra opskriftskort til en **reol** af kogebogs-kort
   (emoji + navn + antal opskrifter) plus et "+ Ny kogebog"-kort.
2. **Drill-in:** tryk på en kogebog → samme opskrifts-grid, filtreret til den kogebogs
   `opskrifterIKogebog(id)`. En tilbage-/​"Alle kogebøger"-affordance øverst. Tom kogebog viser
   en hjælpe-tekst ("Læg opskrifter i denne kogebog fra en opskrift").
3. **Administration:** "+ Ny kogebog" (navn via `Alert.prompt`/lille modal). Omdøb/​slet via et
   lille menu-/​long-press-valg på kogebogs-kortet (slet med bekræftelse, som `sletEgenOpskrift`).

`components/OpskriftDetaljeModal.tsx`:

4. **"Læg i kogebog"-knap** der åbner en **enkelt-vælger** (én kogebog pr. opskrift) med
   brugerens kogebøger + "+ Ny kogebog" + "Fjern fra kogebog". Virker for både indbyggede og
   egne opskrifter (begge har et `opskrift_id`). Viser hvilken kogebog opskriften ligger i nu.

Filter-typen i vælgeren udvides fra `KategoriId | 'favoritter' | 'mine'` til også at dække
`'kogeboeger'` (reol-tilstand) + en valgt-kogebog-id-tilstand.

## Foto-bulk import — nyt flow

1. **Nyt valg i `components/TilføjOpskriftSheet.tsx`:** "📚 Importér fra kogebog (flere fotos)"
   (ny `TilføjMetode`, fx `'kogebog'`).
2. **Ny komponent `components/ImportKogebogModal.tsx`:**
   - Vælg/​tag **flere** billeder: `expo-image-picker` med `allowsMultipleSelection: true` og
     `selectionLimit` (loft, se nedenfor). Galleri til v1; kamera-serie kan komme senere.
   - Vælg/​opret **mål-kogebog** (genbruger enkelt-vælgeren fra detalje-modalen).
   - Hvert billede nedskaleres klient-side med `expo-image-manipulator` (samme som dagens
     `vælgBillede`: resize 1024 px, compress 0.6, base64).
   - **Sekventiel løkke:** for hvert billede → `supabase.functions.invoke('importer-opskrift',
     { body: { billede } })`, med fremgangs-tæller ("Læser 3 af 8…"). Sekventielt for at undgå
     rate-limits og at holde flere MB base64 i hukommelsen samtidig.
   - **Batch-review:** liste af de normaliserede opskrifter; hver kan foldes ud, rettes
     (genbrug preview-rækkerne/​felterne fra `ImportOpskriftModal`) eller fravælges.
   - **"Gem alle":** for hver valgt opskrift → `gemBrugerOpskrift(...)` → derefter
     `sætKogebogForOpskrift(nyId, målKogebogId)`. Luk → vælgeren gen-læser `alleOpskrifter()`.

## Grænser, pris og fejl

- **Loft:** maks **10 billeder pr. batch** (`selectionLimit: 10`). Binder tid/​pris og undgår
  misbrug. Hvert billede = ét billigt gpt-4o-mini vision-kald (samme som dagens enkelt-import).
- **Delvis fejl:** fejler ét billede (ulæseligt, timeout), fortsætter løkken; review-skærmen
  markerer de billeder der ikke kunne læses, så de kan tages om — resten gemmes fint.
- **Optimistisk UI med tilbagerulning** på alle store-mutationer (samme mønster som
  forsidens tilbuds-`+` og `sætFavorit`).
- **Ingen ny edge-funktion** — `importer-opskrift` bruges uændret (både `{ url }`- og
  `{ billede }`-vejen er allerede deployet).

## Test

- **tsc:** `npx tsc --noEmit` skal være ren (projektets eneste verifikations-gate; intet
  test-runner).
- **Migration:** kør den nye migration mod projektet (`POST .../database/query` med
  service-token, se `CLAUDE.md`); verificér at de to tabeller + RLS-policyer findes.
- **Manuel røgtest:** opret kogebog → læg en indbygget OG en egen opskrift i den → bekræft de
  vises under "📚 Kogebøger" → flyt en opskrift til en anden kogebog (forsvinder fra den første,
  jf. én-pr-opskrift) → slet en kogebog (medlemskaber ryddes, opskrifter består).
- **Bulk-røgtest:** vælg 2–3 sidefotos → bekræft fremgangs-tæller, batch-review, og at alle
  havner i mål-kogebogen efter "Gem alle". Test også ét bevidst ulæseligt billede (delvis fejl).

## Uden for scope (v1)

- **Hjemmeside-crawl** (peg på et site → find og hent alle opskrift-links). Teknisk tungt
  (rate-limits, pris, ToS); datamodellen spærrer ikke for det senere.
- **Deling** af kogebøger mellem brugere.
- **Flere kogebøger pr. opskrift** (tags) — bevidst valgt mappe-model.
- **Cover-fotos** på kogebøger (kun emoji-accent i v1).
- **Dedikeret "Kogebøger"-fane** i bundmenuen (browsing bor i vælgeren i v1).
- **AI-opdeling** af fotos på tværs af flere billeder (ét billede = én opskrift).

## Berørte/nye filer (forventet)

**Nye:** `lib/kogebøger.ts`, `components/ImportKogebogModal.tsx`,
`supabase/migrations/*_kogeboeger.sql`.
**Ændrede:** `App.tsx` (hent kogebøger/​medlemskaber ved opstart),
`components/VælgRetterModal.tsx` (chip + reol-view + drill-in), `components/TilføjOpskriftSheet.tsx`
(nyt "kogebog"-valg + `TilføjMetode`), `components/OpskriftDetaljeModal.tsx` ("Læg i kogebog"),
evt. `types/` (Kogebog-type). Ingen ændring til edge-funktioner.
