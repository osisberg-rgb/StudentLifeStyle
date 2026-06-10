# Mæt 🍽️

AI-drevet madplanlægger til studerende i Danmark. Appen genererer en ugentlig madplan (3 måltider × 7 dage) baseret på **aktuelle tilbud fra danske supermarkeder**, brugerens budget, valgte butikker og kødpræferencer — og laver en indkøbsliste grupperet pr. butik.

> **Dette README er skrevet så en anden Claude-instans (eller udvikler) kan fortsætte arbejdet uden tidligere kontekst.**

---

## Tech stack

| Lag | Teknologi |
|---|---|
| App | React Native + Expo SDK 54 (testes via Expo Go på iOS), TypeScript strict |
| Navigation | React Navigation (native-stack + bottom-tabs) |
| Backend | Supabase: Auth, PostgreSQL (RLS), Storage, Edge Functions (Deno) |
| AI | OpenAI GPT-4o via edge function `dynamic-action` |
| Fonte | BricolageGrotesque (700/800) til overskrifter, Inter (400/600/700) til brødtekst |

`npx tsc --noEmit` skal altid være ren.

## Kom i gang

```bash
npm install
# Opret .env med:
# EXPO_PUBLIC_SUPABASE_URL=...
# EXPO_PUBLIC_SUPABASE_ANON_KEY=...
npx expo start
```

OpenAI-nøglen ligger som secret i Supabase (ikke i appen). Edge function deployes med Supabase CLI:

```bash
supabase functions deploy dynamic-action
```

(På udviklingsmaskinen ligger CLI'en under `%LOCALAPPDATA%\npm-cache\_npx\...\supabase.exe`.)

## Arkitektur og dataflow

1. **Bruger** vælger i ProfilScreen: butikker (fx Netto, Rema 1000), ugebudget, antal personer og kødpræference (`Alt` / `Kylling` / `Oksekød` / `Svinekød`).
2. **HomeScreen** kalder edge functionen `dynamic-action` med disse præferencer.
3. **Edge functionen** (`supabase/functions/dynamic-action/index.ts`):
   - Indeholder `TEST_TILBUD` — en indbygget tekstkonstant med **rigtige tilbudsdata fra Rema 1000 og Netto**, manuelt indtastet og organiseret i kategorier (kød, mejeri, grønt …). Dette er en bevidst test-løsning, fordi AI'en ikke pålideligt kunne læse tilbudsavis-billeder.
   - `filtrerTilbudTilButikker()` fjerner sektioner for butikker brugeren IKKE har valgt, før teksten sendes til AI'en.
   - Sender systemprompt + opskriftsbog + filtrerede tilbud til GPT-4o (`max_tokens: 16000`, `temperature: 0.2`).
   - **Genberegner deterministisk** `butik.subtotal` og `indkoebspris` ud fra `varer[].pris`, så indkøbsliste og forside altid stemmer (AI'ens egne totaler er upålidelige).
   - Gemmer planen i tabellen `madplaner` (kolonner: `uge_nr`, `plan` som JSONB).
4. **Appen** viser planen i PlanerScreen, indkøbslisten i IndkøbScreen og opskrifter i OpskriftModal.

## Opskriftsbog-tilgangen (vigtigste designvalg)

AI'en opfinder IKKE retter. Den **matcher faste opskrifter** fra `supabase/functions/dynamic-action/opskrifter.ts` mod de aktuelle tilbud og vælger de billigste pr. portion. Hver opskrift har:

- `koed`: kategori (`Oksekød` / `Kylling` / `Svinekød` / `Alt`) — filtreres mod brugerens kødvalg
- `portioner`: antal portioner opskriften giver
- Ingredienser med `soeg`-nøgleord (til at matche tilbudslinjer) og `vaelgBilligstPerKg`-flag

Der er pt. 10 opskrifter. **Brugeren vil tilføje flere** — de skrives ud fra hvad der typisk er på tilbud.

## Pris-regler (hårdt lært)

- **Altid hel-pakke-priser, aldrig gram-priser.** Hvis en ret bruger 150 g kylling af en 900 g-pakke til 39 kr, koster ingrediensen 39 kr — resten ryger i restlager.
- `pris_pr_portion` = samlet ingredienspris / portioner.
- Restlager (`restlager[]`) markerer overskydende varer som `gemt_til_naeste_gang` eller `spild`.
- **"Sparet"-beløbet på forsiden = budget − indkoebspris** (ikke tilbudsrabat). `Math.max(0, budget - indkoebspris)`.

## Filoversigt

| Fil | Indhold |
|---|---|
| `types/madplan.ts` | Alle delte typer: `Madplan`, `Dag`, `Maltid`, `Ingrediens`, `IndkoebsButik`, `RestlagerVare` |
| `supabase/functions/dynamic-action/index.ts` | Edge function: prompt, TEST_TILBUD, butiksfiltrering, subtotal-genberegning |
| `supabase/functions/dynamic-action/opskrifter.ts` | Opskriftsbogen (10 opskrifter pr. kødkategori) |
| `screens/HomeScreen.tsx` | Forside: budget, sparet-kort, "Generer madplan"-knap |
| `screens/PlanerScreen.tsx` | Ugeplan med 3 måltider/dag, protein-ankre, restlager-række |
| `screens/IndkøbScreen.tsx` | Indkøbsliste grupperet pr. butik, viser `antal_pakker × pakkestoerrelse`, checkboxes |
| `screens/ProfilScreen.tsx` | Butikker, budget, antal personer, kødvalg (`KOED_VALG`) |
| `components/OpskriftModal.tsx` | Opskriftsdetalje: ingredienser m. pakkepris, fremgangsmåde, portioner-badges ("X portioner · Y kr / portion") |
| `components/ButiksPill.tsx` | Lille butiks-badge |
| `constants/theme.ts` | `Colors`, `Radii` — brug altid disse, aldrig hardcodede farver |

## Løste problemer (gentag ikke fejlene)

1. **Kun 2 dage genereret** → `max_tokens` var for lav (6000); nu 16000 + eksplicit "Du SKAL generere alle 7 dage"-regel i prompten.
2. **Forkerte priser** (150 g kylling = 6,5 kr) → AI regnede gram-pris; prompten kræver nu pakkepris.
3. **Indkøbsliste ≠ forside-total** → subtotaler genberegnes deterministisk i edge functionen, stol aldrig på AI'ens tal.
4. **AI valgte ikke-valgte butikker** → to lag: tekstfiltrering før prompt + "BUTIKKER — ABSOLUT REGEL" i prompten.

## Status / næste skridt

- ✅ Login, onboarding, madplan, indkøbsliste, opskriftsmodal, profil — alt virker
- 🔜 Flere opskrifter i `opskrifter.ts` (brugeren laver dem ud fra tilbudsaviserne)
- 🔜 Erstatte `TEST_TILBUD` med rigtig tilbudsdata-pipeline (scraping/API) på sigt
- Alt UI-tekst er på **dansk** — fortsæt med det
