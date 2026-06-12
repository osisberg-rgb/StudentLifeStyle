# Plan for i morgen (12. juni 2026)

> Skrevet 11. juni 2026. To opgaver, i denne rækkefølge:
> 1. Fix: indkøbslisten ødelægges når man planlægger uge 25 (bug, diagnose klar)
> 2. Byg: ny onboarding i 6 trin (plan godkendt, se nederst)

## STATUS 12. juni: begge opgaver er bygget ✔ (typecheck + alle tests grønne)

**Tilbage — kræver dig (kan ikke gøres fra koden):**

1. **Deploy edge-funktionen** (upsert-blokken er fjernet i koden, men den
   gamle version kører stadig på serveren!):
   ```
   npx supabase login
   npx supabase functions deploy dynamic-action --project-ref oqolcifpmdybimspnadc
   ```
2. **Kør SQL i Supabase-dashboardet** (SQL Editor) for navne-feltet:
   ```sql
   alter table profiles add column display_name text;
   ```
   (Appen virker uden — navnet bliver bare ikke gemt, alt andet gemmes fint.)
3. **Generér uge 24-planen igen** i appen — rækken blev overskrevet af
   den gamle edge-funktion og skal have den pæne liste tilbage.
4. **Test onboarding-flowet**: opret en ny test-bruger → 6 trin → tjek at
   aha-tallet matcher vælgeren, og at man lander på Planer med retterne valgt.

---

# Opgave 1: Indkøbslisten ødelægges når man planlægger uge 25

> Symptom: Skifter man til uge 25 og laver en ny ugeplan, er madplanen fin,
> men indkøbslisten (på Indkøb-fanen) bliver "mærkelig" og mangler kategori-
> inddelingen, som uge 24 havde.

## Diagnose (bekræftet i koden, ikke testet i appen endnu)

To-skribent-problem. Begge skriver til `madplaner`, men til FORSKELLIGE rækker:

1. **Edge-funktionen** (`supabase/functions/dynamic-action/index.ts`):
   - Linje ~303: `const ugeNr = getWeekNumber();` — ALTID indeværende uge (24).
     Appen sender aldrig den valgte uge med i requesten.
   - Linje ~462-468: upserter sin EGEN plan-JSON (serverens egen indkøbsliste,
     IKKE appens kategori-inddelte) på `uge_nr = 24`.
   - → Planlægger man uge 25, overskrives uge 24-rækken med serverens rå liste.

2. **Appen** (`screens/PlanerScreen.tsx`, `generer()`):
   - Bygger den rigtige liste deterministisk (`bygIndkøbsliste` → kategorier)
     og upserter på `uge_nr = 25` (den valgte uge). Denne række er fin.

3. **Indkøb-fanen** (`screens/IndkøbScreen.tsx`) viser altid indeværende uge
   (24) → brugeren ser den ødelagte liste.

## Løsning (i rækkefølge)

### 1. Reproducér (5 min)
- Skift til uge 25 i appen, generér en plan.
- Kig i Supabase Table Editor → `madplaner`: uge 24-rækkens `plan.indkoebsliste`
  har nu butiksnavne/anden struktur i stedet for kategorierne (Kød, Fisk, ...).

### 2. Hovedfix: fjern edge-funktionens gem (princip: én skribent)
- Slet hele upsert-blokken i `index.ts` (~linje 450-470, inkl. profiles-upsert
  der kun findes af hensyn til foreign key) — appen ejer alle gemte planer og
  gemmer selv EFTER svaret er modtaget.
- Deploy: `npx supabase functions deploy dynamic-action`
- Bekræft: generér en plan → den gemmes stadig korrekt (appens upsert).
- Alternativ (hvis server-gem ønskes bevaret): send `uge` med i request-body
  og brug den i stedet for `getWeekNumber()` — men frarådes; dobbelt-skribent
  var hele problemet.

### 3. Reparér uge 24-data
- Uge 24-rækken er allerede overskrevet. Generér uge 24-planen igen i appen
  (vælg samme retter) — så er den pæne liste tilbage. Ingen migration nødvendig.

### 4. UX-beslutning: Indkøb-fanen er låst til indeværende uge
- Efter fix 2 er uge 24-listen intakt, men en plan for uge 25 kan ikke SES på
  Indkøb-fanen før om en uge.
- Forslag: kopiér uge-vælger-mønstret fra PlanerScreen (‹ Uge 25 ›) ind i
  IndkøbScreen — lille, konsistent, og familien kan handle til næste uge søndag.

### 5. Verifikation
- Planlæg uge 25 → tjek at uge 24-listen FORBLIVER kategori-inddelt.
- Tjek Indkøb-fanen for begge uger (med uge-vælgeren fra punkt 4).
- `npx tsc --noEmit` + `npx tsx scripts/test-tilbud.ts` (alle grønne i dag).

### 6. Relateret teknisk gæld (kun hvis tid)
- `getWeekNumber()` er dubleret i 4+ filer (HomeScreen, PlanerScreen,
  IndkøbScreen, edge-funktionen) og er upræcis ved årsskifte — samme
  fejlfamilie rammer igen nytårsaften. Saml i én delt funktion der matcher
  `aktuelUge()` i tilbudspriser.ts. (Står også i ROADMAP teknisk gæld.)

---

# Opgave 2: Ny onboarding (6 trin, slutter i værdi)

Mål: < 60 sekunder, personlig, og slutter med et ÆGTE besparelses-tal —
beviset kommer FØR indsatsen. Det er brugerens første møde med appen.

## Tre fejl i den nuværende onboarding, der skal væk

1. **Kost-mulighederne matcher ikke motoren**: OnboardingScreen tilbyder
   Alt/Vegetar/Vegansk/Glutenfri — men motoren kender kun
   Alt/Kylling/Oksekød/Svinekød. Svarene gemmes i `diet` og er meningsløse.
2. **Progress-baren er fake**: `useState(3)` — sidder fast på trin 3 af 4.
3. **Gating er kun i hukommelsen**: `showOnboarding`-state i App.tsx sættes ved
   signup og forsvinder ved genstart — en bruger der lukker appen midt i
   onboardingen ser den aldrig igen. Gate i stedet på profil-data
   (fx `onboarding_completed`-kolonnen, som allerede upsertes).

## Flowet (godkendt 11. juni — se mockup i chat-historikken)

| Trin | Skærm | Gemmes | Noter |
|---|---|---|---|
| 1 | Velkomst: "Familier som jeres sparer typisk 400–700 kr/md" + 3 ikoner (vælg retter → indkøbsliste → spar) + "Sæt os op — under 1 minut" | — | Forventning + commitment |
| 2 | "Hvad skal vi kalde dig?" — fornavn, valgfrit (Spring over) | `display_name` (NY kolonne i profiles!) | Forsiden siger "Hej Mette" i stedet for email-prefix |
| 3 | "Hvor mange skal mætte?" — stepper, default 4, store knapper | `household_size` | Mikrotekst reagerer på svaret ("Vi skalerer opskrifter og pakker til 4") |
| 4 | "Hvor handler I?" — chips med ægte butiksfarver, min. 1 | `stores` | "Vi tjekker tilbuddene i jeres butikker hver uge" |
| 5 | "Hvad spiser I derhjemme?" — Alt/Kylling/Oksekød/Svinekød | `diet` | Default Alt. SKAL matche motorens kost-model |
| 6 | Aha: "Jeres første uge er klar[, Navn]" — stort tal "I kan spare X kr" + 7 måltider + ca.-pris + "Se jeres madplan" | `onboarding_completed: true` + budget | Se regler nedenfor |

**Budget er IKKE et trin**: sættes automatisk til personer × 90 kr, rundet til
nærmeste 50 (4 pers → 350). Kan justeres i Profil. Tre spørgsmål, ikke fire.

## Regler for aha-trinnet (vigtigst!)

- Tallet beregnes LOKALT med `findAnbefaledeRetter` (deterministisk,
  øjeblikkeligt, intet AI-kald) — skaleret til husstanden, ugens ægte tilbud.
- **Tallet skal holde**: "Se jeres madplan" skal lande i VælgRetterModal med
  PRÆCIS de samme retter præ-valgt (kræver ny prop `forvalgte?: string[]` på
  modalen), så brugeren ser samme tal igen. Ét tryk på "Generer madplan" = plan.
- **Aldrig "spar 0 kr"**: hvis ugens tilbud ikke rammer (ingen tilbudsdata
  eller forkerte butikker), drop besparelses-vinklen og vis i stedet:
  "Jeres uge er klar — 7 aftensmåltider for ca. X kr".
- Ingen notifikations-popup eller andre tilladelser i onboardingen.

## Teknisk huskeliste

- [ ] SQL i Supabase-dashboardet: `alter table profiles add column display_name text;`
- [ ] OnboardingScreen.tsx omskrives til multi-step (state-machine i én fil,
      ægte progress-bar, tilbage-navigation)
- [ ] App.tsx: gate på profil i stedet for in-memory state — hent
      `onboarding_completed` ved session-start; vis onboarding hvis false/null
- [ ] HomeScreen + ProfilScreen: brug `display_name` når den findes, ellers
      email-prefix som nu
- [ ] VælgRetterModal: ny prop `forvalgte?: string[]` der seeder valgte retter
      når modalen åbnes
- [ ] LoginScreen-headline genovervejes til familie-tonen (fx "Aftensmad til
      hele familien — uden hovedbrud") — lille ting, tag den til sidst
- [ ] Verifikation: `npx tsc --noEmit` + `npx tsx scripts/test-tilbud.ts`,
      og test hele flowet: ny bruger → 6 trin → plan på under 2 minutter
- [ ] ROADMAP: afkryds onboarding-punktet i Milepæl 4 + beslutningslog
