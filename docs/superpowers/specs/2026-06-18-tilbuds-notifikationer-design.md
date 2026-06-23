# Spec: Tilbuds-notifikationer ("Giv besked når en vare er på tilbud")

**Dato:** 2026-06-18
**Status:** Godkendt design → klar til implementeringsplan
**Niche-kontekst:** familier / 30+ der gemmer opskrifter. Se `README.md`, `ROADMAP.md`, `OPTIMERING.md`.

## Mål

Brugeren kan overvåge **specifikke varer** (fx "Faxe Kondi Booster") og få en **push-notifikation
— også når appen er lukket** — når varen kommer på tilbud i en af deres valgte butikker.

Eksempel: bruger overvåger "Faxe Kondi" → ugens tilbud importeres → bruger får
`🏷️ Faxe Kondi er på tilbud` / `8 kr i Netto denne uge`.

## Beslutninger (truffet i brainstorm 2026-06-18)

1. **Leveringsmåde:** ægte push mens appen er lukket (ikke kun in-app/ved opstart).
   → Kræver et **EAS development build** (Expo Go kan ikke sende push pålideligt, SDK 53+).
2. **Hvad kan overvåges:** **specifikke varer** via BÅDE en 🔔-knap på eksisterende
   varer/tilbud OG et frit "Overvåg en vare"-søgefelt.
3. **Hvor sender vi fra:** **fuldt automatisk server-side** — `pg_cron` (dagligt) kalder en
   **idempotent** edge-funktion, der gør al matchning/dedup/afsendelse. Cron vælges frem for
   en row-trigger, fordi den ugentlige opdatering laver `DELETE`+bulk-`INSERT` (en row-trigger
   ville fyre hundredvis af gange).
4. **Push drives kun af de specifikke `watchlist`-varer** — IKKE de 16 brede kategorier i
   `profiles.watch_items` (de driver fortsat "Tilbud til dig" på forsiden). Kan foldes ind senere.
5. **Cron-frekvens:** dagligt kl. 08:00 (idempotent → frekvensen er ufarlig).
6. **🔔-placering i v1:** på tilbud (forside + "Se alle") + indkøbsvarer + opskrift-ingredienser.

## Dataflow

```
[Bruger]  🔔 på en vare / "Overvåg en vare"-felt
   │  (første gang: bed om notifikations-tilladelse → gem Expo push-token)
   ▼
Supabase:  watchlist (HVAD overvåges)  +  push_tokens (HVORHEN)
   ▲                                          │
   │  tilbud-tabellen fyldes (ugentlig PDF-pipeline, uændret)
   │                                          │
pg_cron (dagligt 08:00) ──► edge-funktion `send-tilbud-notifikationer`
                              │  match watchlist mod ugens tilbud (i brugerens butikker)
                              │  spring allerede-sendte over (notifikationer_sendt-ledger)
                              ▼
                         Expo Push API ──► 📲 push (også når appen er lukket)
```

Cron'en er kun den automatiske "tikker". **Al logik (matchning, dedup, afsendelse) bor i
edge-funktionen**, som er idempotent: en `notifikationer_sendt`-ledger på `(user_id, term, uge)`
sikrer at en bruger højst får ÉN push pr. overvåget vare pr. uge, uanset hvor mange gange cron'en kører.

## Datamodel (3 nye tabeller, RLS slået til)

### `push_tokens`
| Felt | Type | Note |
|---|---|---|
| `user_id` | uuid (FK auth.users) | |
| `token` | text | Expo push-token (`ExponentPushToken[...]`) |
| `platform` | text | `ios` / `android` |
| `updated_at` | timestamptz | |

Primærnøgle `(user_id, token)`. Én række pr. enhed. Opdateres (`upsert`) ved app-start.
RLS: bruger kan kun se/ændre egne rækker. Edge-funktionen læser på tværs via service-role.

### `watchlist`
| Felt | Type | Note |
|---|---|---|
| `id` | uuid (pk, default gen_random_uuid) | |
| `user_id` | uuid (FK) | |
| `term` | text | Normaliseret søgeord, fx `faxe kondi` (lowercase, trimmet) |
| `label` | text | Pænt visningsnavn, fx `Faxe Kondi` |
| `kilde` | text | `klokke` / `fritekst` (analytics/UX) |
| `created_at` | timestamptz | |

Unik på `(user_id, term)` (ingen dubletter). RLS: kun egne rækker.

### `notifikationer_sendt` (ledger / idempotens)
| Felt | Type | Note |
|---|---|---|
| `user_id` | uuid | |
| `term` | text | |
| `uge` | int | ISO-ugenummer |
| `sendt_at` | timestamptz | |

Unik på `(user_id, term, uge)`. Skrives af edge-funktionen efter en vellykket push.
RLS: kun service-role skriver/læser (ingen klient-adgang nødvendig).

> `profiles.watch_items` (16 kategorier) er **uændret** og driver fortsat "Tilbud til dig".

## Klient (app)

### Forudsætning: EAS development build
- Skift fra Expo Go til et **dev build** (`eas build --profile development`). Skal alligevel
  bruges til App Store.
- Nye pakker: `expo-notifications`, `expo-device` (via `npx expo install`).
- `app.json`: `expo.extra.eas.projectId`, notifikations-config (ikon/lyd valgfrit).
- Push-credentials: APNs (iOS) + FCM (Android) styres af EAS.

### Tilladelse + token-registrering
- `lib/notifikationer.ts` (ny): `registrérForPush()` →
  `Notifications.getPermissionsAsync()` → ved behov `requestPermissionsAsync()` →
  `getExpoPushTokenAsync({ projectId })` → `upsert` i `push_tokens`.
- Kaldes (a) ved app-start hvis tilladelse allerede er givet (opdaterer token), og
  (b) første gang brugeren tilføjer en overvågning (beder om tilladelse i kontekst).
- Profil-kontakt "Notifikationer" til at slå til/fra (sletter token ved fra).

### Overvågnings-lag
- `lib/watchlist.ts` (ny): `hentWatchlist()`, `tilføjWatch(label)`, `fjernWatch(id)`,
  `erOvervåget(term)`. `term` = navnet **normaliseret** (lowercase + trim, flerord bevares,
  fx `Faxe Kondi Booster` → `faxe kondi booster`; evt. afkort til de første par ord ved 🔔 på et
  langt tilbudsnavn). Selve matchningen mod tilbud sker server-side med
  `matcherSoegeord(tilbudsnavn, term)` — samme funktion som pris-motoren, så `term` IKKE skal være
  et basispris-vokabularord (en specifik vare som "faxe kondi" matcher fint på tilbuddets navn).
- In-memory cache + version-bump (samme mønster som `lib/favoritter.ts`), så 🔔-ikoner
  synkront viser korrekt til/fra-tilstand.

### UI
1. **🔔-knap** på:
   - tilbudskort (forside "Tilbud til dig" + `AlleTilbudModal`/"Se alle"),
   - indkøbsvarer (`IndkøbScreen`),
   - opskrift-ingredienser (`OpskriftDetaljeModal`).
   Tryk → `tilføjWatch`/`fjernWatch`; første gang også `registrérForPush()`.
2. **"Overvåg en vare"-felt** (Profil): tast fx "Faxe Kondi" → `tilføjWatch`.
3. **Overvågnings-liste** (Profil): se/fjern overvågede varer.

## Server

### Edge-funktion `send-tilbud-notifikationer` (Deno, `supabase/functions/`)
1. Læs alle `watchlist`-rækker, `push_tokens`, indeværende uges `tilbud`, og brugernes
   valgte butikker (`profiles`).
2. For hver bruger: match hver watch-`term` mod ugens tilbud **i deres butikker** med den
   eksisterende matchnings-logik (`matcherSoegeord`) + `erPrEnhed`-filter (spring pr-enhed-tilbud over).
3. Frafiltrér match der allerede står i `notifikationer_sendt` for `(user_id, term, uge)`.
4. Byg besked og send via **Expo Push API** (`https://exp.host/--/api/v2/push/send`, batch op til 100).
   - Titel: `🏷️ <label> er på tilbud`
   - Body: `<pris> kr i <butik> denne uge`
   - `data`: `{ skærm: 'tilbud' }` (deep-link til "Tilbud til dig").
5. Ved success: skriv `(user_id, term, uge)` til `notifikationer_sendt`.
6. Ugyldige tokens (`DeviceNotRegistered` i Expo-svaret) → slet fra `push_tokens`.
7. **`?dry_run=1`**: returnér hvad der VILLE sendes (uden at sende eller skrive ledger) — til test.

### pg_cron + pg_net
- Aktivér extensions: `pg_cron`, `pg_net` (via SQL/Management API).
- Job: dagligt 08:00 → `net.http_post` til edge-funktionens URL med en delt hemmelighed
  (header) så kun cron kan udløse den.

## Fejlhåndtering

- **Ingen token / tilladelse afvist:** overvågningen gemmes stadig (vises på forsiden), men
  ingen push. 🔔 vises som "til", men Profil-kontakten viser at notifikationer er slået fra.
- **Ugyldige/afmeldte tokens:** ryddes op fra `push_tokens` ud fra Expo-svaret.
- **Offline/fejl ved tilføj-watch:** optimistisk UI, rul tilbage ved fejl (samme mønster som
  forsidens tilbuds-`+`).
- **Idempotens:** ledger gør gentagne cron-kørsler ufarlige.

## Test

- **Klient:** `npx tsc --noEmit` ren. Manuel røgtest i dev build (tilladelse, token gemt,
  🔔 til/fra, fritekst-tilføj).
- **Server:** kald edge-funktionen med `?dry_run=1` mod en uge-99-testrække i `tilbud`
  (samme mønster som tilbuds-importeren) + en test-watchlist-række → verificér korrekt match
  og besked-tekst uden at sende. Slet testdata bagefter.
- **Matchnings-regression:** udvid `scripts/test-matchning.mjs` hvis term-normaliseringen
  tilføjer ny ren logik.

## Uden for scope (v1)

- Kategori-baseret push (de 16 `watch_items`) — kun specifikke varer i v1.
- Pris-tærskler ("kun hvis under X kr" / "kun hvis >20% rabat").
- Deep-link helt ned til den specifikke vare (v1 åbner "Tilbud til dig").
- "Snooze"/frekvensstyring ud over én push pr. vare pr. uge.

## Berørte/nye filer (forventet)

**Nye:** `lib/notifikationer.ts`, `lib/watchlist.ts`, `components/KlokkeKnap.tsx`,
`supabase/functions/send-tilbud-notifikationer/index.ts`, `supabase/migrations/*_watchlist_push.sql`.
**Ændrede:** `App.tsx` (token ved opstart), `screens/HomeScreen.tsx`, `components/AlleTilbudModal.tsx`,
`screens/IndkøbScreen.tsx`, `components/OpskriftDetaljeModal.tsx`, `screens/ProfilScreen.tsx`,
`app.json`/`eas.json` (dev build + projectId), `package.json` (expo-notifications, expo-device).
