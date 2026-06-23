# MadUgen 🍽️

Madplanlægger til **danske familier (30+) der gemmer opskrifter** og vil spare på
aftensmaden med ugens supermarkeds-tilbud. Saml dine favoritopskrifter ét sted,
byg ugens madplan på få tryk, og få en indkøbsliste med ugens tilbud regnet ind —
i den billigste butik.

> Niche-skifte (juni 2026): fra studie-budget-app → familie-/opskrifts-app.
> Budget- og kostpræferencer er udfaset; værdien er **din samling + tilbud**.
> Levende plan: se `ROADMAP.md`; backlog: `OPTIMERING.md`. Dybere arkitektur for
> AI-instanser: `CLAUDE.md`.

---

## Tech stack
| Lag | Teknologi |
|---|---|
| App | React Native + Expo SDK 54 (Expo Go), TypeScript strict |
| Navigation | React Navigation (native-stack + bottom-tabs) |
| Backend | Supabase: Auth, Postgres (RLS), Storage, Edge Functions (Deno) |
| AI | OpenAI gpt-4o-mini (kun i edge-funktioner — nævnes ALDRIG i UI'et) |
| Fonte | Bricolage Grotesque (overskrifter), Inter (brødtekst) |

**Verifikations-gate:** `npx tsc --noEmit` skal altid være ren. Plus en hurtig
regressions-test: `node scripts/test-matchning.mjs`.

## Kom i gang
```bash
npm install
npx expo start          # --clear efter dependency-ændringer
```
Supabase-URL + publishable key ligger i `lib/supabase.ts`. OpenAI-nøglen er en
secret i Supabase (ikke i appen). Projekt-ref: `oqolcifpmdybimspnadc`.

## Skærme (bund-tabs)
**Hjem** · **Uge plan** · stor central **+** (tilføj opskrift) · **Indkøb** · **Profil**

- **Hjem:** "I aften"-forslag, **❤️ Dine favoritter** (vandret stribe — tryk → læg på madplan / tilføj til indkøbsliste), **Tilbud til dig** (se nedenfor), **Ugens aviser** (forsider af butikkernes tilbudsaviser, åbnes in-app).
- **Uge plan:** byg ugen dag for dag; vælg én eller flere retter til samme dag; byt/slet pr. ret.
- **Indkøb:** kategoriseret liste, kryds-af, blå **+** (tilføj tilbudsvare).
- **+ (central):** halvskærms-ark → foto / screenshot / link / skriv selv.

## Pris-motoren (kernen, 3 lag)
1. `constants/basispriser.ts` — basispriser for et fast søgeords-vokabular. **Ændres aldrig.**
2. `constants/tilbud/*.ts` — ugens tilbud pr. butik (netto, rema1000, superbrugsen, bilka, fotex), hver med et `uge`-nr.
3. **Live-overlay:** `lib/tilbudSync.ts` henter Supabase-tabellen `tilbud` og **fletter** den oven på filerne pr. butik for indeværende uge (tom tabel → filerne bruges).

`constants/tilbudspriser.ts` merger i hukommelsen: effektiv pris = basis, erstattet
af et tilbud kun når det er billigere. Priser er **hel-pakke**. `matcherSoegeord`
matcher korte generiske ord (≤3 tegn) som HELE ord (så `mel`≠`melon`), længere ord
som ord-start. Pr-enhed-tilbud ("pr. 100g/stk") udelukkes fra prissætning (`erPrEnhed`).

### "Tilbud til dig" (personligt)
`tilbudTilDig` viser tilbud relevante for brugeren frem for blot størst kr-besparelse:
- **⭐ Mine varer** (watchlist gemt i `profiles.watch_items`, vælges i `MineVarerModal`)
- **❤️ Favoritter + madplan** (ingrediens-søgeord fra favoritopskrifter/ugens plan)
- Rangordnes efter **vigtighed** (`constants/vigtighed.ts` = kurateret stapel-vægt + opskrifts-frekvens), så hverdagsvarer slår billige nichevarer, og **billigste butik** vinder på tværs af butikker.

## Opskrifter (statiske + brugerens)
- Statiske: `supabase/functions/dynamic-action/opskrifter.ts` (re-eksporteret via `constants/opskrifter.ts`). Kategorier: aftensmad/suppe/salat/broed/**dessert**.
- Brugerens: `bruger_opskrifter`-tabellen (`importeret: true`). Tilføjes via link, foto/screenshot eller skrives/redigeres manuelt.
- **Samlet accessor:** `lib/brugerOpskrifter.ts` (`alleOpskrifter()`/`findOpskrift()`) bruges overalt, så importerede får priser, badges, billeder og kan planlægges.
- Favoritter: `lib/favoritter.ts` + `favoritter`-tabel.

## Tilbudsaviser (automatisering)
- **Hosting:** komprimerede PDF'er + side-1-cover i Supabase Storage-bucket `tilbudsaviser` (offentlig). Forsidens "Ugens aviser" viser coverne og åbner avisen in-app (`expo-web-browser`).
- **Data:** edge-funktionen `importer-tilbud` (GPT-vision) udtrækker `{navn, pris, soeg}` fra én avis-side. Det lokale script **`scripts/opdater-tilbud.ps1`** gør det hele på én gang: upload PDF+cover + render hver side → `importer-tilbud` → skriv til `tilbud`-tabellen for ugen. (Fuld kørsel ~10-15 min/uge; se `OPTIMERING.md`.)

## Notifikationer (overvåg en vare → push på tilbud)
Brugeren kan overvåge **specifikke varer** (🔔 på tilbud/indkøbsvarer/ingredienser, eller et
fritekst-felt i Profil) og få **push når varen er på tilbud** — også når appen er lukket.
- **Backend (bygget):** tabeller `watchlist`/`push_tokens`/`notifikationer_sendt`; `pg_cron`
  kalder dagligt den idempotente edge-funktion `send-tilbud-notifikationer`, der matcher mod
  ugens `tilbud` i brugerens butikker og sender via Expo Push API (én push pr. vare pr. uge).
- **Forudsætning:** ægte push kræver et **EAS development build** (ikke Expo Go). Se
  `docs/superpowers/plans/2026-06-18-tilbuds-notifikationer.md` (Fase C) + spec'en i `specs/`.

## Edge-funktioner (Deno, `supabase/functions/`)
- `importer-opskrift` — opskrift fra `{url}` eller `{billede}` → appens skema med `soeg`-ord.
- `importer-tilbud` — én avis-side (billede) → `{varer:[{navn,pris,soeg}]}`.
- `send-tilbud-notifikationer` — match watchlist mod ugens tilbud → Expo Push (kaldes af `pg_cron`).
- `dynamic-action` — legacy plan-generator; ikke længere i brug (plan bygges klient-side).

## Konventioner
- Al UI-tekst er **dansk**; mange filnavne bruger `æøå`.
- Brug altid `Colors`/`Radii` fra `constants/theme.ts` (grøn brand; blå = sekundær handling).
- AI nævnes aldrig i brugertekster.
- Deploy edge-funktion: `npx supabase functions deploy <navn> --project-ref oqolcifpmdybimspnadc`.
