# Mæt — Roadmap & forretningsguide

> Sidst opdateret: 12. juni 2026
> Levende dokument — opdatér status-procenter og afkryds punkter løbende.
> Brug det som dagsorden: "hvad er det næste?" = øverste uafkrydsede punkt i den aktive milepæl.

---

## Nordstjernen

**En familie på 4 kan lave ugens madplan på under 3 minutter, mængderne passer,
børnene kan lide maden, og appen kan dokumentere mindst 300 kr sparet om måneden.**

Alt i dette dokument findes kun for at opfylde den sætning.

## Strategi i én sætning

Studerende er testbanen (gratis adgang, tilgiver fejl) — **familier er forretningen**
(flest penge, madplan-vanen findes allerede, betalingsvilje bevist af måltidskasserne).

---

## Status pr. søjle

| Søjle | Status | Største mangel |
|---|---|---|
| Prismotor & tilbudslogik | 95 % | Kode færdig (7 butikker, billigste vinder) — mangler kun drift |
| Ugesløjfen (planlæg → handl → lav) | 80 % | Delbar liste |
| Klar til App Store | 45 % | Ikon, tomme tilstande, beta (onboarding ✓) |
| Opskrifter (indholdet) | 25 % | 32 testopskrifter (alle med tid) → mål 100+, alle med foto |
| Synligt værdibevis | 90 % | Besparelse vises pr. uge, pr. ret, akkumuleret og over tid |
| Tilbudsdata i drift | 20 % | 7 butiksfiler klar, men kun testdata i én — ægte aviser hver uge |
| Portions-skalering | 100 % | Færdig — sættes i Profil (gemmes), kan justeres pr. plan i Ny plan |

**Samlet: ca. 40 % familie-klar.**

---

## Milepæl 1 — Familie-klar motor (først!)

Det tekniske fundament der adskiller studie-app fra familie-app.

- [x] **Portions-skalering hele kæden igennem**: personer-vælger (1-8) i Ny plan,
      initialiseret fra `household_size`. Pakke-antal og priser skalerer i
      opskriftskort, detalje-modal, anbefaling og indkøbsliste. Delte ingredienser
      på tværs af retter deler pakker (0,5 + 0,5 behov = 1 pakke).
- [x] **En uge = 5-7 aftensmåltider**: loftet er nu 7 retter / 7 dækkede måltider.
      Tælleren måler dækkede aftensmåltider (4 portioner / 2 pers = 2 aftener — bevidste
      rester tæller med). Anbefalingen er en grådig "fyld ugen"-algoritme (billigste
      pris pr. måltid først, inden for budget) i constants/anbefaling.ts.
      Rest-TILBAGE: dag-fordelingen (hvilken dag rester spises) ligger stadig hos AI'en.
- [x] **Tilberedningstid på alle opskrifter** (`minutter`-felt på alle 32) + "⏱ Maks
      30 min"-filter i vælgeren. Tiden vises som badge på kortene og i detalje-visningen.

**MILEPÆL 1 FÆRDIG** ✔ (jun 2026) — accepttest bestået: familie på 4 kan lave en
7-dages plan, mængder og priser passer.

**Accepttest:** En familie på 4 laver en 7-dages plan, og indkøbslisten passer i mængder og pris.

## Milepæl 2 — Indholdet (løbende, deadline før beta)

Koden er færdig før indholdet — det er indholdet, der ER produktet.

- [ ] 100 opskrifter (fra 32) — alle med tid, kategorier og søgeord
- [ ] Minimum 25 opskrifter i Børnefavoritter
- [ ] Foto på minimum 60 opskrifter (24 findes)
- [x] Filstruktur for 7 butikker klar: Rema 1000, Netto, Lidl, 365discount,
      Føtex, SuperBrugsen, Kvikly — alle med samme skabelon. Motor vælger
      automatisk billigste pris på tværs af valgte butikker. Indkøbslisten
      viser farvet butiksbadge pr. tilbudsvare. Tilføj blot ægte varer i
      den respektive tilbudsfil og ret uge-nummeret.
- [ ] Tilbudsdata i drift: udfyld alle 7 butiksfiler med ægte ugetilbud
- [ ] Driftstest: hold 3+ butikker opdateret 4 uger i træk på < 2 timer/uge
      — ellers find datakilde (fx Tjek/eTilbudsavis API) før lancering

## Milepæl 3 — Friktionsfri ugesløjfe

Hver gang planen er besværlig, vinder takeaway.

- [x] Byt en ret i planen med 2 tryk (uden at lave hele planen om): "Byt"-knap
      på hver valgt ret → vælg erstatning (med ca.-prisforskel pr. alternativ)
      → dage, indkøbsliste, pris og besparelse genberegnes deterministisk.
      Dag-lås: passerede dage i indeværende uge er låst 🔒 (maden er købt),
      i dag og frem kan byttes; fremtidige uger frit, tidligere uger aldrig.
      Afkrydsede varer på indkøbslisten bevares for varer der overlever byttet.
- [ ] Delbar indkøbsliste — én forælder planlægger, den anden handler
- [x] **Akkumuleret besparelse på forsiden + profilen**: "Du har sparet X kr i alt".
      Summen af `total_spar` over alle gemte madplaner (fallback: plan-JSON for gamle
      rækker). Fælles hook `hooks/useSamletBesparelse.ts` — samme tal begge steder.
      (Det tal er det stærkeste argument mod opsigelse.)
- [x] **Besparelse over tid (graf + historik)**: tappbart "Sparet i alt"-kort på
      forsiden med søjlediagram (uge for uge), og en historik-modal med det
      akkumulerede tal + større graf + uge-for-uge-liste (pris og besparelse).
      Samme modal åbnes fra Profil. Søjlediagram er ren View-baseret (intet
      chart-bibliotek). Data via ÉT DB-kald (udvidet useSamletBesparelse).
- [~] Plan-historik (se tidligere uger): tallene pr. uge findes nu i historik-
      modalen; at åbne selve den gamle plan gøres via uge-vælgeren på Planer/Indkøb.

## Milepæl 4 — Butiksklar

- [x] Onboarding < 60 sekunder: 6 trin (velkomst → navn → husstand → butikker →
      kost → aha-skærm med ÆGTE besparelses-tal). Budget sættes automatisk
      (personer × 90, rundet til 50). "Se jeres madplan" lander i vælgeren med
      samme retter præ-valgt — tallet holder. Gate på `household_size` i
      profilen (overlever genstart). NB: `display_name`-kolonnen kræver én SQL
      i dashboardet — se PLAN-IMORGEN.md.
- [ ] App-ikon, navn, screenshots, privatlivspolitik
- [ ] Alle tomme tilstande og fejltilstande designet (ingen blanke skærme)
- [ ] TestFlight / Play-beta klar
- [ ] **Beta: 10 rigtige familier i 3 uger**

**Beta-succeskriterier (de eneste tal der betyder noget):**
- ≥ 50 % af familierne laver stadig en plan i uge 3 (ugentlig tilbagevenden)
- Gennemsnitlig dokumenteret besparelse ≥ 300 kr/md

---

## Forretningsmodellen

**Pris:** 39 kr/md eller 249 kr/år (fremhæv årsplanen — "kun 21 kr/md, spar 218 kr").
**Prøveperiode:** 14 dage gratis med alt åbent — appen skal nå at VISE besparelsen
("du har sparet 130 kr på to uger") inden betalingsvæggen.
**Salgsargument:** "Sparer din familie ~500 kr om måneden — koster 21 kr."
Lov 500 (midten af det realistiske interval 400-800), lever 700 → ambassadør.
Lov 1.500, lever 400 → opsigelse.

**Enhedsøkonomi (efter moms 25 % + App Store 15 %):**
- Månedskunde: ~26 kr/md, men typisk kun 4-6 mdr. levetid ≈ 105-160 kr i alt
- Årskunde: ~170 kr garanteret + likviditet med det samme → **årsplanen er den man sælger**

**Tragten (realistisk, ikke drømmen):** marked → ~10 % kender appen → ~20 % af dem
downloader → 3-5 % af downloads betaler. Få tusinde brugere ≈ 2-3.000 kr/md.
Tallet flyttes af brugerantal og fastholdelse — ikke af prisen.

**Senere muligheder:** familie-pris 49/349 for nye kunder; kommissionsmodel
(indkøbskurv → Nemlig/REMA online, 1-3 % af kurven — Jow-modellen).

---

## De to eksistentielle risici

1. **Tilbudsdata-driften.** Motoren er bygget — men hvis ugens aviser ikke kommer ind
   hver uge, er kerneløftet dødt. Bevis driften (4 uger i træk) eller automatisér den,
   FØR der bruges penge på markedsføring.
2. **Planen sparer kun penge, hvis den følges.** Derfor er friktion (milepæl 3)
   lige så vigtig som prismotoren. Mål altid på uge-3-tilbagevenden, ikke downloads.

## Kvalitetsprincipper

- Familier skal ikke have MERE design — de skal have FÆRRE huller: ingen tomme skærme,
  ingen uforklarede fejl, ingen tal der ikke stemmer på tværs af faner. Konsistens er kvalitet.
- **Designet er til en forælder med én hånd fri**: aftensmaden først (forsiden svarer på
  "hvad skal vi have i aften?"), tryk-mål ≥ 44 pt på indkøbslisten, brugertekster min.
  12 px, og ingen teknologi-snak ("AI" nævnes aldrig i UI'et — forældre vil have
  aftensmad, ikke teknologi).
- Alle priser beregnes deterministisk i appen (basispriser + tilbud) — AI'en må aldrig
  igen eje et tal, brugeren ser. På sigt: lav også uge-layoutet uden AI (øjeblikkeligt,
  gratis, offline) med AI som valgfrit krydderi.
- Værdien skal være synlig i kroner, altid: pr. vare, pr. ret, pr. uge, akkumuleret.

## Teknisk gæld (ikke akut, men kendt)

- [ ] `getWeekNumber()` er dubleret i 3+ filer og er upræcis ved årsskift → saml i én
      delt funktion (skal matche `aktuelUge()` i tilbudspriser.ts)
- [ ] Edge-funktionen har egne kopier af basispriser/opskrifter → holdes manuelt i sync
- [ ] `tilbudsaviser`-storage-bucket er død — app-koden er renset (jun 2026:
      MadplanScreen slettet, storage-kald fjernet fra plan-generering) →
      slet selve bucket'en i Supabase-dashboardet
- [ ] 8 opskrifter mangler foto
- [ ] `components/SparSegl.tsx` er ubrugt efter familie-først-forsiden (jun 2026) —
      genbrug på tilbudskort eller slet

---

## Beslutningslog

| Dato | Beslutning |
|---|---|
| Jun 2026 | Tilbud = manuel ugentlig fil pr. butik + deterministisk merge i hukommelsen (aldrig en gemt kopi) |
| Jun 2026 | Ordgrænse-matching i prisopslag (fiksede grisekød=ris-buggen) |
| Jun 2026 | 5 kategorier som tags på opskrifter; "Billigt" = kun ≤13 kr/portion |
| Jun 2026 | Plan-generering samlet ét sted (Planer-fanen); forsiden er rent overblik |
| Jun 2026 | Målgruppe: byg familie-klart, beta-test på studerende, markedsfør mod familier |
| Jun 2026 | Pris: 39 kr/md / 249 kr/år, 14 dages prøve, årsplan fremhævet |
| Jun 2026 | Pakke-baseret skalering: behov i pakke-andele (personer/portioner) aggregeres på tværs af retter og rundes op til hele pakker — man kan ikke købe en halv dåse |
| Jun 2026 | Ugeplan måles i dækkede aftensmåltider (mål: 7), ikke antal retter. Anbefaling = grådig fyld-ugen efter pris pr. måltid — erstattede kombinations-søgningen der ikke skalerer til 7 retter |
| Jun 2026 | Akkumuleret besparelse = sum af `total_spar` (ægte tilbuds-besparelse) over alle gemte planer — IKKE den gamle `budget − indkøbspris`-model. Gamle rækker: fallback til plan.besparelse → udledt af indkøbslisten → 0 |
| Jun 2026 | Familie-først UI: forsiden = "I aften"-kort + samlet sparekort (uge + i alt); morgenmad/frokost kun på Planer-fanen; "I dag"-fremhævning på dag-kort; rigtige tab-ikoner (@expo/vector-icons); indkøbsliste med fremdrift og store tryk-mål; AI nævnes ikke i brugertekster |
| 12. jun 2026 | Edge-funktionen gemmer IKKE længere madplaner (én skribent: appen) — dens eget gem skrev altid til indeværende uge og overskrev appens kategori-liste, når man planlagde en fremtidig uge. Indkøb-fanen fik uge-vælger |
| 12. jun 2026 | Onboarding slutter i værdi: aha-tallet beregnes deterministisk med findAnbefaledeRetter og overleveres til vælgeren (samme retter præ-valgt) — tallet brugeren ser, SKAL holde. Aldrig "spar 0 kr": fallback uden tilbuds-vinkel. Budget er ikke et spørgsmål (auto: personer × 90 kr) |
| 12. jun 2026 | Byt-en-ret med dag-lås: en rets dag = første dag den står som aftensmad (rester følger med ved byt). Passerede dage er låst — planen er et dokument over hvad der ER købt, ikke kun hvad der skal købes |
| 12. jun 2026 | Besparelse over tid: søjlediagram uden chart-bibliotek (rene Views, samme flade stil som progress-barerne) — holder bundlen lille. Per-uge serie og akkumuleret sum kommer fra ÉT DB-kald (udvidet useSamletBesparelse), så forsiden ikke laver ekstra queries |
| 12. jun 2026 | Flerbutiksarkitektur: én TypeScript-fil pr. butik (constants/tilbud/<butik>.ts). Motor merger alle valgte butikskilder i hukommelsen og vælger billigste pris pr. ingrediens. Uge-nr tjekkes automatisk — forkert nr = filen ignoreres. Ugeopdatering: kun `uge:` og `varer[]` ændres, ingen kode. Indkøbslisten viser farvet butiksbadge på varer der er på tilbud. |
