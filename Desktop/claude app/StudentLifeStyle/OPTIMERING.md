# Optimerings-backlog — Mit Køkken

Prioriteret liste over forbedringer. Impact: 🔴 høj · 🟡 mellem · ⚪ lav.
Afkryds når et punkt er bygget. Hører sammen med `ROADMAP.md` (den overordnede plan).

> Kontekst: niche er **familier / 30+ der gemmer opskrifter**. Budget- og
> kostpræferencer er udfaset (juni 2026). Tilbud kan nu opdateres via
> `tilbud`-tabellen + `scripts/opdater-tilbud.ps1` (Fase 0+1 bygget); de hardkodede
> `constants/tilbud/*.ts` er fallback. Se også `README.md`, `ROADMAP.md`, `LANCERING.md`.

## Top 3 (gør disse først)
- [~] 🔴 Udvid opskriftsbiblioteket + **tag desserter** — 5 desserter tilføjet (pandekager, æblekage, chokoladekage, havregrynskugler, risalamande), så 🍰-kategorien ikke længere er tom. **Rest:** flere retter generelt + dessert-billeder (kører på emoji-fallback nu)
- [ ] 🔴 Tests af pris-motoren mod den ÆGTE kode (i dag JS-spejle i `scripts/test-matchning.mjs`)
- [ ] 🟡 Polish af tilbuds-automatiseringen: bedre soeg-tagging (prompt) eller et review-trin før data går live

> **Stort leveret juni 2026** (detaljer: ROADMAP §"Opdatering" + beslutningslog):
> niche-skifte, "Tilbud til dig" (Mine varer + favoritter + vigtighed + billigste
> butik), tilbudsaviser hostet + in-app, central +-ark, favorit-handlinger
> (madplan/indkøb), tilbuds-automatisering Fase 0+1, pris-motor hærdet, død kode ryddet.
>
> **Tilbuds-notifikationer (18. jun): Fase A+B bygget & verificeret** — overvåg
> specifikke varer (🔔 + fritekst) → push på tilbud, fuldt automatisk (pg_cron →
> idempotent edge-funktion → Expo Push). **Mangler kun Fase C:** EAS dev build +
> ægte push-runtime-test (kræver MacBook). Plan: `docs/superpowers/plans/2026-06-18-*`.

---

## 1. Pris- & tilbudsmotoren
- [~] 🔴 **Automatisér tilbuds-opdatering** (ingen butiks-API tilgængeligt → PDF-baseret):
  - [x] **Fase 0** (juni 2026): `public.tilbud`-tabel oprettet (`butik, uge, navn, soeg[], pris`, RLS: alle kan læse). Tom = appen bruger fortsat de hardkodede filer (ingen regression). `lib/tilbudSync.ts` aktiverer overlay når den fyldes.
  - [x] **Fix (juni 2026):** `tilbudSync`/`alleKilder` FLETTER nu DB-tilbud oven på filerne — DB bruges for butikker med data i indeværende uge, filer for resten. Tabellen kan fyldes butik for butik. (No-op indtil tabellen fyldes.)
  - [x] **Fase 1 — BYGGET & verificeret (juni 2026):** edge-funktion `importer-tilbud` (deployet) tager én avis-side (billede) → GPT-vision → `{varer:[{navn,pris,soeg}]}` (soeg fra fast vokabular). Lokalt script `scripts/opdater-tilbud.ps1` (+ `.mjs`) gør i ét hug: upload PDF + side-1-cover til Storage, render hver side → kald funktionen → skriv til `tilbud` for (butik, uge). Røg-testet (2 sider/butik): priser korrekte, soeg-ord sat. **Ugentligt: `pwsh scripts/opdater-tilbud.ps1`.**
  - **Rest/forbehold:** (a) fuld kørsel = alle sider (35/32/83…) → ~150 GPT-kald, ~10-15 min + lidt API-omkostning; (b) soeg-tagging er ~80% — nogle varer får `[]` (usynlige for prismotoren) eller mangler tag (fx "Hakket okse-/kylling" → ingen soeg). Forbedr evt. prompten i `importer-tilbud`. (c) Overvej en review-fane før data går live for indeværende uge.
- [ ] 🟡 **Næste forbedring af tilbuds-automatiseringen** (oven på den fungerende Fase 1): enten **bedre soeg-tagging** (prompt-tuning i `importer-tilbud` så færre varer får `[]`/forkert tag) eller et **review-trin** (se/ret de udtrukne tilbud før de går live for indeværende uge). Selve maskinen kører — dette er polish.
- [x] 🔴 **Tag-fejl-klasse, 1. runde** (juni 2026) — auditeret alle 5 aktive tilbudsfiler. Rettet specialvarer tagget med generiske ord der underbyder (samme klasse som oksekød-buggen):
  - Bløde/special-oste (`flødeost`/`smelteost`/`burrata`/`dessertost`/`salatost`) tagget `ost` → retagget specifikt (underbød `revet ost`/`ost`-opskrifter til 9-18 kr).
  - Røget/gravad laks (100g) tagget `laks` → `røget laks` (underbød frisk laks, base 40, til 22-35).
  - Forkert fisk: kuller-loins tagget `laks` → `fiskefileter`.
  - Tapas-/snack-platter tagget `ost`/`skinke` → `[]`.
  - **Pr-100g-varer** (grydeklare kartofler 2,95, laksefilet 16,95) tagget som hele pakker → `[]` (under-pris pga. enheds-mismatch).
- [x] 🟡 **Strammere `matcherSoegeord`** (juni 2026) — korte generiske søgeord (≤3 tegn: is, æg, ost, mel, løg, tun, ris …) kræver nu et HELT ord-match i stedet for substring/forstavelse, så `mel`→`melon`, `is`→`iste`, `løg`→`løgismose` ikke længere giver forkerte priser. Længere ord (okse, gris, svin, laks, kylling …) må stadig være starten af et ord. Verificeret med 14 enheds-cases. Forebygger fejlklassen fremover.
- [x] 🟡 **Pr-enhed-håndtering** (juni 2026) — `erPrEnhed()` i `tilbudspriser.ts` detekterer tilbud prissat pr. enhed ("pr. 100g", "pr. 1/2 kg", "pr. stk.", "pr. kuvert") og udelukker dem fra pris-opslag (`slåTilbudOp`) og forsidens "bedste tilbud" (`bedsteTilbud`), så de ikke under-prissætter recepter (fx laks 16,95/100g → recept bruger nu basis 40). De bliver stadig i tilbuds-browseren, hvor navnet ærligt viser enheden. Verificeret med 19 enheds-cases.
- [ ] ⚪ **Tag-audit, rest**: ready-meals/færdigretter tagget med protein-ord er harmløse i dag fordi pris > basis (intet undercut), men bør strammes hvis basispriser stiger. *(Lav prioritet.)*
- [ ] 🟡 **Tilbud bliver forældede ugentligt** — kun uge 25 er sat; `lidl/365discount/kvikly` står på `uge: 0`. Brug for fast ugentlig opdatering (manuel rutine, scraping eller butiks-API).
- [x] 🟡 **Egne/skrevne/importerede ingredienser uden `soeg` → usynlige for tilbud** (juni 2026) — `gætSoeg(navn)` i `basispriser.ts` slår frit indtastede navne op i basispris-vokabularet (genbruger `matcherSoegeord`, ordnet specifik→generel). Udfyldes centralt i `gemBrugerOpskrift`/`opdaterBrugerOpskrift` (`medGættedeSoeg`), så ALLE gem-veje — manuel indtastning, "skriv selv" OG importerede retter edge-funktionen ikke kunne tagge — bliver synlige for pris-/tilbuds-motoren. Eksisterende `soeg` bevares, så et match aldrig går tabt ved redigering.

## 2. Opskrifter (kerne-niche)
- [~] 🟡 **~43 opskrifter, 5 desserter** (`supabase/functions/dynamic-action/opskrifter.ts`). 🍰-kategorien er nu fyldt (juni 2026); udvid fortsat biblioteket bredt (flere hverdagsretter, salater, suppe).
- [ ] 🟡 **Manuel indtastning mangler billede** — tilføj foto/upload i `RedigerOpskriftModal` (ny opskrift får kun emoji-fallback i dag).
- [ ] 🟡 **Styrk gem/saml-oplevelsen**: samlinger/mapper, "lav madplan ud fra favoritter", del en opskrift. Det er det 30+-brugeren kommer for.

## 3. Indkøbsliste
- [x] 🟡 **Hel-pakke-listen udvidet** (juni 2026) — `HEL_PAKKE_ORD` i `constants/indkoeb.ts` dækker nu også ris/pasta/spaghetti/nudler/couscous/bulgur, gryn/melis/kakao/bagepulver/natron/gær, mandler/nødder/chokolade. Tørvarer vises som "1 pakke" i stedet for misvisende køkkenmål. Word-suffix-match (endsWith) → ingen falske hits (fx kokosmælk forbliver væske).
- [ ] ⚪ Tydeligere "saml ens varer på tværs af retter" + evt. "del listen"-knap.

## 4. Kode-oprydning (teknisk gæld)
- [x] 🟡 **Død kode efter niche-skift** — fjernet (juni 2026): `kost`/`budget`/`onGenerer`-props i `VælgRetterModal`, `kost`/`generating`-state + `generer()` + `byggUgeplan`-wiring i `PlanerScreen`, og `diet`-indlæsning. *(Tilbage: onboarding-kost-trinnet — brugervendt UX, separat opgave herunder.)*
- [x] ⚪ **Onboarding ombygget** (juni 2026) — fjernet det vestigielle kost-trin (+ `diet`/`budget`-gemning) og besparelses-tal-payoff'en. Ny rejse: velkomst → navn → husstand → butikker → **vælg favoritter** → payoff "Din samling er klar". Udnytter IKEA-effekten (brugeren bygger sin egen samling), og favoritterne gemmes (`sætFavorit`) + seeder første madplan, så forsidens favorit-stribe straks er fyldt.
- [ ] 🟡 **Legacy `dynamic-action`-edge-funktion + `README.md` er forældet** (jf. `CLAUDE.md`) — slet eller markér tydeligt.
- [ ] ⚪ **Pakkeversioner matcher ikke SDK 54** (`@react-native-community/slider` 5.2.0 vs 5.0.1, `expo-font` 56 vs ~14) — kør `npx expo install` for at aligne.
- [ ] ⚪ **SecureStore-advarsel** (session > 2048 bytes) — harmløs, men værd at rydde op.

## 5. Kvalitet & robusthed
- [~] 🔴 **Tests, 1. runde** (juni 2026) — `scripts/test-matchning.mjs` (kør: `node scripts/test-matchning.mjs`) dækker `matcherSoegeord` + `erPrEnhed` med 20 cases, app-uafhængigt. **Rest:** det er JS-spejle (skal holdes i synk med kilden); ideelt isolér de rene pris-funktioner i en RN-fri modul, så `slåEffektivPrisOp`/`bedsteTilbud` kan testes mod den ægte kode.
