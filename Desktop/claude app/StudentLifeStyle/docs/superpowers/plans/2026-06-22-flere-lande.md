# Flere lande (DK / NO / SE) — Implementeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gør MadUgen land-bevidst (DK/NO/SE) — hvert land får eget sprog, butikker, tilbudsaviser, valuta og opskrifter — med Danmark som det eneste land med rigtigt indhold. At tilføje NO/SE bagefter bliver rent indhold (dictionaries + tilbudsfiler + opskrifter), ingen kodeændringer.

**Architecture:** Et aktivt land (`profiles.country`) styres via en delt modul-singleton (`constants/aktivtLand.ts`, samme mønster som `fjernKilder` i prismotoren) + en `LandContext`. Prismotor, basispriser og opskrift-accessorer læser det aktive land og rydder caches ved skift. Tilbud filtreres på `tilbud.land`. UI lokaliseres via en hjemmebygget `t()` med dansk fallback. Skallen (tabs, onboarding, profil) migreres som bevist mønster; resten inkrementalt.

**Tech Stack:** React Native + Expo SDK 54 (TypeScript strict), Supabase (Postgres+RLS, Edge Functions/Deno, Storage), `expo-secure-store` (land-cache — ingen ny afhængighed), Node ESM-scripts, GitHub Actions.

---

## Vigtige projekt-konventioner (læs først)

- **Intet test-runner.** Verifikationsgaten er `npx tsc --noEmit`. Konkret kommando (undgår `cd`):
  ```
  node "C:/Users/gust5/claude/StudentLifeStyle/Desktop/claude app/StudentLifeStyle/node_modules/typescript/bin/tsc" -p "C:/Users/gust5/claude/StudentLifeStyle/Desktop/claude app/StudentLifeStyle/tsconfig.json" --noEmit
  ```
  Forventet: ingen output, exit 0. `tsconfig` ekskluderer `supabase/`; `scripts/*.mjs` er ikke TypeScript. Edge-funktioner/scripts verificeres ved deploy/`node --check`.
- **Git:** repo-rod er `C:/Users/gust5/claude/StudentLifeStyle`, app ligger nested i `Desktop/claude app/StudentLifeStyle`. Commit altid med `git -C "C:/Users/gust5/claude/StudentLifeStyle" ...`. Arbejd på `main`. **Push kun når brugeren beder om det.** Afslut commit-beskeder med `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **App-smoketest er bruger-drevet.** Boot IKKE emulator/`expo start` uopfordret. Efter app-kode: kør tsc, og lad brugeren genindlæse selv.
- **Supabase uden interaktiv login:** SQL via `pwsh scripts/sb-sql.ps1 -Query "..."` eller `-File <fil>`; token læses fra Windows Credential Manager (`Supabase CLI:supabase`). Projekt-ref: `oqolcifpmdybimspnadc`. Repo-slug: `osisberg-rgb/StudentLifeStyle`.
- **Filflytninger** bevarer historik med `git -C <rod> mv "<gammel>" "<ny>"`. Brug app-relative stier under `Desktop/claude app/StudentLifeStyle/`.

## Filstruktur

**Nye filer**
- `supabase/migrations/007_flere_lande.sql` — `country`/`land`-kolonner + index.
- `constants/lande.ts` — central land-konfiguration (kode, sprog, valuta, butikker, flag).
- `constants/aktivtLand.ts` — delt "aktivt land"-singleton + lytter-mekanisme.
- `constants/i18n/da.ts` / `no.ts` / `sv.ts` / `index.ts` — dictionaries + `t()` med fallback.
- `constants/format.ts` — `formatPris(kr, land)`.
- `constants/basispriser/index.ts` / `dk.ts` / `no.ts` / `se.ts` — land-skopede basispriser (omdøbt fra `basispriser.ts`).
- `constants/tilbud/dk/*` (flyttet) + `constants/tilbud/{dk,no,se}/index.ts` + `constants/tilbud/index.ts` — per-land tilbudsfiler.
- `context/LandContext.tsx` — provider: aktivt land, `t`, `formatPris`, `sætLand`.

**Ændrede filer**
- `constants/tilbudspriser.ts` — læs aktivt lands kilder; ryd caches ved landeskift.
- `lib/tilbudSync.ts` — filtrér `tilbud` på `land`.
- `types/opskrift.ts` — `lande?: LandKode[]`.
- `lib/brugerOpskrifter.ts` — filtrér statiske opskrifter på aktivt land; bump version ved skift.
- `App.tsx` — wrap i `LandProvider`; tab-labels via `t()`.
- `screens/OnboardingScreen.tsx` — nyt land-trin forrest; butikker/opskrifter/valuta følger landet.
- `screens/ProfilScreen.tsx` — "Land"-række + land-vælger.
- Pipeline: `scripts/tilbud-core.mjs`, `scripts/opdater-tilbud.mjs`, `scripts/opdater-tilbud-cloud.mjs`, `supabase/functions/start-tilbud-import/index.ts`, `.github/workflows/tilbud-import.yml`, `lib/tilbudUpload.ts`, `components/UploadTilbudModal.tsx` — `land`-dimension.
- `ROADMAP.md` — milepæl + beslutningslog.

---

## Task 1: DB-migration — `country`/`land`-kolonner

**Files:**
- Create: `Desktop/claude app/StudentLifeStyle/supabase/migrations/007_flere_lande.sql`

- [ ] **Step 1: Skriv migrationen**

```sql
-- Flere lande (DK/NO/SE): land som datadimension.
--   profiles.country          = brugerens land (styrer hele app-oplevelsen)
--   tilbud.land               = hvilket lands avis tilbuddet kom fra
--   tilbud_import_job.land    = hvilket lands avis et upload-job hører til
-- default 'DK' backfiller alle eksisterende rækker, så DK-oplevelsen er uændret.

alter table public.profiles add column if not exists country text not null default 'DK';
alter table public.tilbud   add column if not exists land    text not null default 'DK';

-- tilbud_import_job blev oprettet i migration 006 (sky-pipeline). Hvis tabellen
-- mod forventning ikke findes, så spring denne linje over.
alter table public.tilbud_import_job add column if not exists land text not null default 'DK';

create index if not exists tilbud_land_butik_uge_idx on public.tilbud (land, butik, uge);
```

- [ ] **Step 2: Kør migrationen**
```
pwsh "C:/Users/gust5/claude/StudentLifeStyle/Desktop/claude app/StudentLifeStyle/scripts/sb-sql.ps1" -File "C:/Users/gust5/claude/StudentLifeStyle/Desktop/claude app/StudentLifeStyle/supabase/migrations/007_flere_lande.sql"
```
Forventet: JSON-svar uden `error`.

- [ ] **Step 3: Verificér kolonnerne**
```
pwsh "C:/Users/gust5/claude/StudentLifeStyle/Desktop/claude app/StudentLifeStyle/scripts/sb-sql.ps1" -Query "select count(*) as n from information_schema.columns where (table_name='profiles' and column_name='country') or (table_name='tilbud' and column_name='land') or (table_name='tilbud_import_job' and column_name='land');"
```
Forventet: `n` = 3. (Hvis `tilbud_import_job` ikke findes: `n` = 2 — fint, kolonnen tilføjes når tabellen oprettes.)

- [ ] **Step 4: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "Desktop/claude app/StudentLifeStyle/supabase/migrations/007_flere_lande.sql"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(db): country/land-kolonner til flere lande\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 2: `constants/lande.ts` — central land-konfiguration

**Files:**
- Create: `Desktop/claude app/StudentLifeStyle/constants/lande.ts`

- [ ] **Step 1: Skriv filen**

```ts
// Central land-konfiguration. ALT land-specifikt (sprog, valuta, butikker, flag)
// slås op her — ingen anden fil hardkoder "Danmark/DKK/Netto". At tilføje et land
// senere er primært at fylde indhold (dictionary + tilbudsfiler + opskrifter) på.
export type LandKode = 'DK' | 'NO' | 'SE';
export type Sprog = 'da' | 'no' | 'sv';

export type Land = {
  kode: LandKode;
  navn: string;          // vist på landets eget sprog
  sprog: Sprog;
  valuta: 'DKK' | 'NOK' | 'SEK';
  valutaSuffix: string;  // 'kr'
  locale: string;        // til Intl.NumberFormat
  flag: string;          // emoji
  butikker: string[];    // kæder i landet (onboarding/Profil)
};

export const DEFAULT_LAND: LandKode = 'DK';

export const LANDE: Record<LandKode, Land> = {
  DK: {
    kode: 'DK', navn: 'Danmark', sprog: 'da', valuta: 'DKK', valutaSuffix: 'kr',
    locale: 'da-DK', flag: '🇩🇰',
    butikker: ['Netto', 'Rema 1000', 'Føtex', 'SuperBrugsen', 'Bilka'],
  },
  NO: {
    kode: 'NO', navn: 'Norge', sprog: 'no', valuta: 'NOK', valutaSuffix: 'kr',
    locale: 'nb-NO', flag: '🇳🇴',
    // Kandidat-kæder — bekræftes når NO-indhold bygges.
    butikker: ['Kiwi', 'Rema 1000', 'Meny', 'Coop Extra'],
  },
  SE: {
    kode: 'SE', navn: 'Sverige', sprog: 'sv', valuta: 'SEK', valutaSuffix: 'kr',
    locale: 'sv-SE', flag: '🇸🇪',
    // Kandidat-kæder — bekræftes når SE-indhold bygges.
    butikker: ['ICA', 'Coop', 'Willys', 'Lidl'],
  },
};

export const ALLE_LANDE: Land[] = [LANDE.DK, LANDE.NO, LANDE.SE];

// Robust opslag: ukendt/manglende kode → default-landet.
export function landFor(kode: string | null | undefined): Land {
  return (kode && LANDE[kode as LandKode]) || LANDE[DEFAULT_LAND];
}
```

- [ ] **Step 2: tsc** — kør tsc-kommandoen. Forventet: ingen fejl.

- [ ] **Step 3: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "Desktop/claude app/StudentLifeStyle/constants/lande.ts"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(lande): central land-konfiguration (DK/NO/SE)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 3: `constants/aktivtLand.ts` — delt "aktivt land"-singleton

**Files:**
- Create: `Desktop/claude app/StudentLifeStyle/constants/aktivtLand.ts`

- [ ] **Step 1: Skriv filen**

```ts
// Delt kilde til "aktivt land" på modul-niveau — samme mønster som fjernKilder i
// tilbudspriser.ts. LandContext kalder sætAktivtLand(); prismotor, basispriser og
// opskrift-accessorer LÆSER aktivtLand() og rydder deres caches via påLandSkift().
// Holdt adskilt fra LandContext, så ikke-React-moduler (constants/, lib/) kan læse
// landet synkront uden at importere React.
import { DEFAULT_LAND, LANDE, type LandKode } from './lande';

let _land: LandKode = DEFAULT_LAND;
const lyttere = new Set<() => void>();

export function aktivtLand(): LandKode {
  return _land;
}

export function sætAktivtLand(kode: LandKode): void {
  const gyldigt = LANDE[kode] ? kode : DEFAULT_LAND;
  if (gyldigt === _land) return;
  _land = gyldigt;
  lyttere.forEach(f => f());
}

// Registrér en lytter (typisk cache-tømning). Returnerer en afmeld-funktion.
export function påLandSkift(fn: () => void): () => void {
  lyttere.add(fn);
  return () => { lyttere.delete(fn); };
}
```

- [ ] **Step 2: tsc** — Forventet: ingen fejl.

- [ ] **Step 3: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "Desktop/claude app/StudentLifeStyle/constants/aktivtLand.ts"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(lande): delt aktivt-land singleton med lytter-mekanisme\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 4: i18n — dictionaries + `t()` med dansk fallback

**Files:**
- Create: `Desktop/claude app/StudentLifeStyle/constants/i18n/da.ts`
- Create: `Desktop/claude app/StudentLifeStyle/constants/i18n/no.ts`
- Create: `Desktop/claude app/StudentLifeStyle/constants/i18n/sv.ts`
- Create: `Desktop/claude app/StudentLifeStyle/constants/i18n/index.ts`

- [ ] **Step 1: Skriv `da.ts` (kilde-dictionaryen — definerer nøgletypen)**

```ts
// Dansk kilde-dictionary. Typen Oversættelser udledes herfra, så no/sv har præcis
// samme nøgler (eller arver dansk som fallback). Nøgler er flade "skærm.element".
// {var} interpoleres af t(). Tilføj nye nøgler her FØRST; så fanger tsc manglende
// brug. Skallen (tabs, onboarding-land, profil-land, tomme tilstande) er dækket;
// resten af skærmene migreres inkrementalt ved at flytte deres strenge hertil.
export const da = {
  // Tabs
  'tab.hjem': 'Hjem',
  'tab.planer': 'Uge plan',
  'tab.indkøb': 'Indkøb',
  'tab.profil': 'Profil',

  // Fælles
  'fælles.fortsæt': 'Fortsæt',
  'fælles.vælgMindstEn': 'Vælg mindst én',
  'fælles.færdig': 'Færdig',

  // Onboarding — land (nyt trin)
  'onboard.land.titel': 'Hvor handler du?',
  'onboard.land.under': 'Vælg dit land — så viser vi butikker, tilbud og opskrifter for dig.',

  // Onboarding — butikker
  'onboard.butikker.titel': 'Hvor handler I?',
  'onboard.butikker.hjælp': 'Vi tjekker tilbuddene i jeres butikker hver uge.',

  // Profil — land
  'profil.land.label': 'Land',
  'profil.land.titel': 'Vælg land',

  // Tomme tilstande (NO/SE uden indhold endnu)
  'tom.tilbud': 'Ingen tilbud i dit område endnu.',
  'tom.opskrifter': 'Ingen opskrifter for dit land endnu.',
} as const;

export type Nøgle = keyof typeof da;
export type Oversættelser = Record<Nøgle, string>;
```

- [ ] **Step 2: Skriv `no.ts`**

```ts
import { da } from './da';
import type { Oversættelser } from './da';

// Norsk: arver dansk som fallback. Erstat værdier med norske efterhånden som de
// oversættes (det er "indholds"-fasen — ingen kodeændring nødvendig her).
export const no: Oversættelser = {
  ...da,
  // TODO oversæt: fx 'tab.hjem': 'Hjem', 'onboard.land.titel': 'Hvor handler du?'
};
```

- [ ] **Step 3: Skriv `sv.ts`**

```ts
import { da } from './da';
import type { Oversættelser } from './da';

// Svensk: arver dansk som fallback. Erstat værdier med svenske ved oversættelse.
export const sv: Oversættelser = {
  ...da,
  // TODO översätt: fx 'tab.hjem': 'Hem', 'onboard.land.titel': 'Var handlar du?'
};
```

- [ ] **Step 4: Skriv `index.ts`**

```ts
import { da, type Nøgle } from './da';
import { no } from './no';
import { sv } from './sv';
import type { Sprog } from '../lande';

const DICTS = { da, no, sv } as const;

// Returnerer en t() bundet til ét sprog. Manglende nøgle → dansk → nøglen selv
// (så uoversatte/forkerte nøgler er synlige i stedet for at crashe).
export function lav(sprog: Sprog) {
  const dict = DICTS[sprog] ?? da;
  return function t(nøgle: Nøgle, vars?: Record<string, string | number>): string {
    let s: string = dict[nøgle] ?? da[nøgle] ?? nøgle;
    if (vars) {
      for (const k of Object.keys(vars)) {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k]));
      }
    }
    return s;
  };
}

export type T = ReturnType<typeof lav>;
export type { Nøgle };
```

- [ ] **Step 5: tsc** — Forventet: ingen fejl.

- [ ] **Step 6: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "Desktop/claude app/StudentLifeStyle/constants/i18n"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(i18n): t() med da/no/sv dictionaries og dansk fallback\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 5: `constants/format.ts` — valuta/pris-format

**Files:**
- Create: `Desktop/claude app/StudentLifeStyle/constants/format.ts`

- [ ] **Step 1: Skriv filen**

```ts
import { landFor, type LandKode } from './lande';

// Pris-visning for et land. DKK/NOK/SEK vises alle som "kr", men med landets
// tal-format (komma-decimaler i da/no/sv). Heltal vises uden decimaler.
// Intl er tilgængelig i Hermes (RN 0.81); try/catch giver et sikkert fallback.
export function formatPris(kr: number, land: LandKode): string {
  const L = landFor(land);
  const heltal = Number.isInteger(kr);
  try {
    const tal = new Intl.NumberFormat(L.locale, {
      minimumFractionDigits: heltal ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(kr);
    return `${tal} ${L.valutaSuffix}`;
  } catch {
    const tal = heltal ? String(kr) : kr.toFixed(2).replace('.', ',');
    return `${tal} ${L.valutaSuffix}`;
  }
}
```

- [ ] **Step 2: tsc** — Forventet: ingen fejl.

- [ ] **Step 3: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "Desktop/claude app/StudentLifeStyle/constants/format.ts"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(format): land-baseret formatPris (DKK/NOK/SEK)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 6: Land-skopede basispriser (omdøb `basispriser.ts` → mappe)

**Files:**
- Create: `Desktop/claude app/StudentLifeStyle/constants/basispriser/dk.ts` (flyttet data)
- Create: `Desktop/claude app/StudentLifeStyle/constants/basispriser/no.ts`
- Create: `Desktop/claude app/StudentLifeStyle/constants/basispriser/se.ts`
- Create: `Desktop/claude app/StudentLifeStyle/constants/basispriser/index.ts`
- Delete: `Desktop/claude app/StudentLifeStyle/constants/basispriser.ts`

> Import-stier som `'../constants/basispriser'` og `'./basispriser'` peger nu på mappens `index.ts` og virker uændret. Eneste in-app-importører: `constants/tilbudspriser.ts` (`slagBasispris`, `slåPrisOp`, `matcherSoegeord`) og `lib/brugerOpskrifter.ts` (`gætSoeg`). `scripts/test-tilbud.ts` importerer `BASISPRISER` (back-compat-eksport bevares).

- [ ] **Step 1: Flyt den nuværende fil til `dk.ts` (bevarer historik)**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" mv "Desktop/claude app/StudentLifeStyle/constants/basispriser.ts" "Desktop/claude app/StudentLifeStyle/constants/basispriser/dk.ts"
```

- [ ] **Step 2: Reducér `dk.ts` til KUN data**

I `constants/basispriser/dk.ts`: behold KUN `BASISPRISER`-array-literalen, omdøb den til `DK_BASISPRISER`, og SLET funktionerne (`matcherSoegeord`, `gætSoeg`, `slagBasispris`, `slåPrisOp`) — de flytter til `index.ts` i Step 5. Resultatet er:
```ts
// DK-basispriser — den oprindelige liste (uændret indhold), nu land-skopet.
// Søgeord er lowercase, pris er pakkepris i kr.
export const DK_BASISPRISER: Array<{ soeg: string[]; pris: number }> = [
  { soeg: ["havregryn"], pris: 8 },
  // ←  HELE det eksisterende array, uændret (ca. 70 linjer)  →
  { soeg: ["piskefløde", "piskeflode", "fløde", "flode"], pris: 20 },
];
```

- [ ] **Step 3: Skriv `no.ts`**
```ts
// Norske basispriser (NOK). Tom indtil NO-indhold bygges — uden basispris bruger
// motoren et fast estimat (15) i slåPrisOp, hvilket er acceptabelt for fundamentet.
export const NO_BASISPRISER: Array<{ soeg: string[]; pris: number }> = [];
```

- [ ] **Step 4: Skriv `se.ts`**
```ts
// Svenske basispriser (SEK). Tom indtil SE-indhold bygges.
export const SE_BASISPRISER: Array<{ soeg: string[]; pris: number }> = [];
```

- [ ] **Step 5: Skriv `index.ts` (samme offentlige API, men land-skopet)**
```ts
// Land-skopet basispris-opslag. Samme offentlige API som den gamle basispriser.ts,
// men funktionerne itererer det AKTIVE lands array (aktivBasis()) i stedet for ét
// globalt array. Skift af land tømmer ikke noget her (opslag er stateless), men
// caches i tilbudspriser.ts tømmes via påLandSkift.
import { aktivtLand } from '../aktivtLand';
import { DK_BASISPRISER } from './dk';
import { NO_BASISPRISER } from './no';
import { SE_BASISPRISER } from './se';

export type Basispris = { soeg: string[]; pris: number };

function aktivBasis(): Basispris[] {
  const l = aktivtLand();
  return l === 'NO' ? NO_BASISPRISER : l === 'SE' ? SE_BASISPRISER : DK_BASISPRISER;
}

// Bagudkompatibilitet: scripts/test-tilbud.ts importerer { BASISPRISER }. Det er
// DK-listen (testen er DK-specifik). Ny app-kode bør IKKE iterere denne direkte.
export const BASISPRISER = DK_BASISPRISER;

// Matcher søgeord ved ord-START: 'ris' rammer "ris"/"risengrød", men ikke
// "grisekød". Korte ord (≤3 tegn) skal matche et HELT ord. (Uændret fra original.)
export function matcherSoegeord(tekst: string, soegeord: string): boolean {
  const norm = (s: string) =>
    ' ' + s.toLowerCase().replace(/[^a-z0-9æøåé]+/g, ' ').trim() + ' ';
  const t = norm(tekst);
  const k = norm(soegeord);
  if (k.trim().length <= 3) return t.includes(k);
  return t.includes(k.substring(0, k.length - 1));
}

export function gætSoeg(navn: string): string[] {
  if (!navn.trim()) return [];
  for (const entry of aktivBasis()) {
    if (entry.soeg.some(s => matcherSoegeord(navn, s))) return entry.soeg;
  }
  return [];
}

export function slagBasispris(navn: string): number | null {
  for (const entry of aktivBasis()) {
    if (entry.soeg.some(s => matcherSoegeord(navn, s))) return entry.pris;
  }
  return null;
}

export function slåPrisOp(ing: {
  estimeret?: boolean;
  estimereretPris?: number;
  soeg?: string[];
  navn: string;
}): number {
  if (ing.estimeret && ing.estimereretPris != null) return ing.estimereretPris;
  for (const s of (ing.soeg ?? [])) {
    const p = slagBasispris(s);
    if (p != null) return p;
  }
  const p = slagBasispris(ing.navn);
  if (p != null) return p;
  return 15;
}
```

- [ ] **Step 6: tsc** — Forventet: ingen fejl. (Hvis tsc klager over en uafsluttet `dk.ts` efter Step 2-redigeringen, så tjek at kun array-literalen + dens `export const` står tilbage, intet hængende funktions-fragment.)

- [ ] **Step 7: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "Desktop/claude app/StudentLifeStyle/constants/basispriser"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'refactor(priser): land-skopede basispriser (dk/no/se + index)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 7: Per-land tilbudsfiler + land-skopet prismotor

**Files:**
- Move: `constants/tilbud/{rema1000,netto,fotex,superbrugsen,bilka,lidl,kvikly,365discount}.ts` → `constants/tilbud/dk/`
- Create: `Desktop/claude app/StudentLifeStyle/constants/tilbud/dk/index.ts`
- Create: `Desktop/claude app/StudentLifeStyle/constants/tilbud/no/index.ts`
- Create: `Desktop/claude app/StudentLifeStyle/constants/tilbud/se/index.ts`
- Create: `Desktop/claude app/StudentLifeStyle/constants/tilbud/index.ts`
- Modify: `Desktop/claude app/StudentLifeStyle/constants/tilbudspriser.ts`

- [ ] **Step 1: Flyt de 8 tilbudsfiler til `dk/`**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" mv "Desktop/claude app/StudentLifeStyle/constants/tilbud/rema1000.ts"    "Desktop/claude app/StudentLifeStyle/constants/tilbud/dk/rema1000.ts"
git -C "C:/Users/gust5/claude/StudentLifeStyle" mv "Desktop/claude app/StudentLifeStyle/constants/tilbud/netto.ts"       "Desktop/claude app/StudentLifeStyle/constants/tilbud/dk/netto.ts"
git -C "C:/Users/gust5/claude/StudentLifeStyle" mv "Desktop/claude app/StudentLifeStyle/constants/tilbud/fotex.ts"       "Desktop/claude app/StudentLifeStyle/constants/tilbud/dk/fotex.ts"
git -C "C:/Users/gust5/claude/StudentLifeStyle" mv "Desktop/claude app/StudentLifeStyle/constants/tilbud/superbrugsen.ts" "Desktop/claude app/StudentLifeStyle/constants/tilbud/dk/superbrugsen.ts"
git -C "C:/Users/gust5/claude/StudentLifeStyle" mv "Desktop/claude app/StudentLifeStyle/constants/tilbud/bilka.ts"       "Desktop/claude app/StudentLifeStyle/constants/tilbud/dk/bilka.ts"
git -C "C:/Users/gust5/claude/StudentLifeStyle" mv "Desktop/claude app/StudentLifeStyle/constants/tilbud/lidl.ts"        "Desktop/claude app/StudentLifeStyle/constants/tilbud/dk/lidl.ts"
git -C "C:/Users/gust5/claude/StudentLifeStyle" mv "Desktop/claude app/StudentLifeStyle/constants/tilbud/kvikly.ts"      "Desktop/claude app/StudentLifeStyle/constants/tilbud/dk/kvikly.ts"
git -C "C:/Users/gust5/claude/StudentLifeStyle" mv "Desktop/claude app/StudentLifeStyle/constants/tilbud/365discount.ts" "Desktop/claude app/StudentLifeStyle/constants/tilbud/dk/365discount.ts"
```

- [ ] **Step 2: Skriv `constants/tilbud/dk/index.ts` (barrel — samme 5 kilder som i dag)**
```ts
// DK-fallback/seed-tilbudsfiler. Samme 5 kæder som den oprindelige TILBUDSKILDER
// i tilbudspriser.ts. (lidl/kvikly/365discount findes som filer men var ikke wired
// — uændret; tilføj dem her hvis de skal med.)
import type { TilbudsKilde } from '../../tilbudspriser';
import { REMA1000_TILBUD } from './rema1000';
import { NETTO_TILBUD } from './netto';
import { FOTEX_TILBUD } from './fotex';
import { SUPERBRUGSEN_TILBUD } from './superbrugsen';
import { BILKA_TILBUD } from './bilka';

export const DK_TILBUDSFILER: TilbudsKilde[] = [
  REMA1000_TILBUD, NETTO_TILBUD, FOTEX_TILBUD, SUPERBRUGSEN_TILBUD, BILKA_TILBUD,
];
```

- [ ] **Step 3: Skriv `constants/tilbud/no/index.ts` og `se/index.ts` (tomme)**

`no/index.ts`:
```ts
// Norske fallback-tilbudsfiler. Tom indtil NO-indhold bygges — DB-tabellen (tilbud
// med land='NO') overlejrer alligevel disse via tilbudSync.
import type { TilbudsKilde } from '../../tilbudspriser';
export const NO_TILBUDSFILER: TilbudsKilde[] = [];
```
`se/index.ts`:
```ts
// Svenske fallback-tilbudsfiler. Tom indtil SE-indhold bygges.
import type { TilbudsKilde } from '../../tilbudspriser';
export const SE_TILBUDSFILER: TilbudsKilde[] = [];
```

- [ ] **Step 4: Skriv `constants/tilbud/index.ts` (per-land vælger)**
```ts
import type { TilbudsKilde } from '../tilbudspriser';
import type { LandKode } from '../lande';
import { DK_TILBUDSFILER } from './dk';
import { NO_TILBUDSFILER } from './no';
import { SE_TILBUDSFILER } from './se';

export function tilbudsfilerFor(land: LandKode): TilbudsKilde[] {
  return land === 'NO' ? NO_TILBUDSFILER : land === 'SE' ? SE_TILBUDSFILER : DK_TILBUDSFILER;
}
```

- [ ] **Step 5: Opdatér `constants/tilbudspriser.ts` — læs aktivt lands kilder + ryd cache ved skift**

Erstat de fem direkte imports (linje 7–11):
```ts
import { REMA1000_TILBUD } from './tilbud/rema1000';
import { NETTO_TILBUD } from './tilbud/netto';
import { FOTEX_TILBUD } from './tilbud/fotex';
import { SUPERBRUGSEN_TILBUD } from './tilbud/superbrugsen';
import { BILKA_TILBUD } from './tilbud/bilka';
```
med:
```ts
import { tilbudsfilerFor } from './tilbud';
import { aktivtLand, påLandSkift } from './aktivtLand';
```

Erstat `const TILBUDSKILDER` (linje 24–30):
```ts
const TILBUDSKILDER: TilbudsKilde[] = [
  REMA1000_TILBUD,
  NETTO_TILBUD,
  FOTEX_TILBUD,
  SUPERBRUGSEN_TILBUD,
  BILKA_TILBUD,
];
```
med en kommentar (kilderne hentes nu dynamisk pr. land):
```ts
// Fallback-kilderne hentes nu pr. aktivt land via tilbudsfilerFor() i alleKilder().
```

I `alleKilder()` (linje 50–60), erstat de to referencer til `TILBUDSKILDER` med `tilbudsfilerFor(aktivtLand())`. Den nye funktion:
```ts
function alleKilder(): TilbudsKilde[] {
  const filer = tilbudsfilerFor(aktivtLand());
  if (!fjernKilder) return filer;
  const uge = aktuelUge();
  const dbButikker = new Set(
    fjernKilder.filter(k => matcherUge(k, uge)).map(k => k.butik),
  );
  return [...fjernKilder, ...filer.filter(k => !dbButikker.has(k.butik))];
}
```

Tilføj nederst i filen (efter de eksisterende eksporter) en lytter der tømmer caches ved landeskift, så DK-priser aldrig lækker til NO/SE:
```ts
// Skift af aktivt land → tøm tilbuds- og pris-caches (de er bygget pr. land).
påLandSkift(() => {
  fjernKilder = null;     // DB-overlay gælder ét land; re-synkes af LandContext
  tilbudCache = null;
  prisCache.clear();
});
```

- [ ] **Step 6: tsc** — Forventet: ingen fejl. (`TilbudsKilde` eksporteres allerede fra `tilbudspriser.ts`; barrel-filerne bruger `import type`, så ingen runtime-cyklus.)

- [ ] **Step 7: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "Desktop/claude app/StudentLifeStyle/constants/tilbud" "Desktop/claude app/StudentLifeStyle/constants/tilbudspriser.ts"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'refactor(tilbud): per-land tilbudsfiler + land-skopet prismotor\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 8: `lib/tilbudSync.ts` — filtrér tilbud på land

**Files:**
- Modify: `Desktop/claude app/StudentLifeStyle/lib/tilbudSync.ts`

- [ ] **Step 1: Filtrér queryen på aktivt land**

Erstat importerne øverst og selve hentningen. Tilføj efter `import type { TilbudRække } from './tilbudGrupper';`:
```ts
import { aktivtLand } from '../constants/aktivtLand';
```

Erstat select-blokken (linje 21–24):
```ts
    const { data, error } = await supabase
      .from('tilbud')
      .select('butik, uge, navn, soeg, pris');
```
med (filtrér på aktivt land):
```ts
    const { data, error } = await supabase
      .from('tilbud')
      .select('butik, uge, navn, soeg, pris, land')
      .eq('land', aktivtLand());
```

- [ ] **Step 2: tsc** — Forventet: ingen fejl. (`TilbudRække` får et ekstra `land`-felt fra DB, men grupperingen i `tilbudGrupper.ts` bruger kun `butik/uge/navn/soeg/pris` — uændret. Hvis tsc kræver `land` i `TilbudRække`-typen, tilføj `land?: string` dér.)

- [ ] **Step 3: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "Desktop/claude app/StudentLifeStyle/lib/tilbudSync.ts"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(tilbud): synk filtrerer paa aktivt land\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 9: Opskrifter — land-tag + filtrering

**Files:**
- Modify: `Desktop/claude app/StudentLifeStyle/types/opskrift.ts`
- Modify: `Desktop/claude app/StudentLifeStyle/lib/brugerOpskrifter.ts`

- [ ] **Step 1: Tilføj `lande`-feltet til `Opskrift`**

I `types/opskrift.ts`, tilføj importeret type øverst (efter linje 6's kommentarblok, før `export type OpskriftIngrediens`):
```ts
import type { LandKode } from '../constants/lande';
```
Og i `Opskrift`-typen, tilføj feltet efter `importeret?: boolean;`:
```ts
  // Hvilke lande opskriften vises i. Mangler/tom ⇒ DK (de statiske er danske).
  lande?: LandKode[];
```

- [ ] **Step 2: Filtrér statiske opskrifter på aktivt land i accessorerne**

I `lib/brugerOpskrifter.ts`, tilføj imports (efter linje 11 `import type { Opskrift } ...`):
```ts
import { aktivtLand, påLandSkift } from '../constants/aktivtLand';
import type { LandKode } from '../constants/lande';
```

Tilføj en hjælpefunktion lige efter `const STATISKE = ...` (linje 27):
```ts
// En opskrift hører til et land hvis lande mangler/er tom (⇒ DK) eller indeholder
// landet. Brugerens egne (importerede) opskrifter er IKKE land-filtreret — de er
// knyttet til brugeren og vises altid.
function gælderILand(o: Opskrift, land: LandKode): boolean {
  const l = o.lande;
  return !l || l.length === 0 ? land === 'DK' : l.includes(land);
}
```

Erstat `alleOpskrifter()` (linje 38–40):
```ts
export function alleOpskrifter(): Opskrift[] {
  const land = aktivtLand();
  const statiske = STATISKE.filter(o => gælderILand(o, land));
  return importerede.length ? [...statiske, ...importerede] : statiske;
}
```

Lad `findOpskrift()` være UÆNDRET (opslag pr. id skal stadig kunne finde en opskrift selv hvis brugeren har skiftet land — fx en gemt madplan der peger på en DK-opskrift). Tilføj kun en lytter nederst i filen, så pris-/opskrift-caches bumpes ved landeskift:
```ts
// Skift af aktivt land ændrer hvilke statiske opskrifter der er synlige (og deres
// priser) — bump version, så caches (fx opskriftPriser) regner om for det nye land.
påLandSkift(() => { version++; });
```

- [ ] **Step 3: tsc** — Forventet: ingen fejl.

- [ ] **Step 4: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "Desktop/claude app/StudentLifeStyle/types/opskrift.ts" "Desktop/claude app/StudentLifeStyle/lib/brugerOpskrifter.ts"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(opskrifter): land-tag + land-filtrering af statiske opskrifter\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 10: `context/LandContext.tsx` — provideren der binder det hele

**Files:**
- Create: `Desktop/claude app/StudentLifeStyle/context/LandContext.tsx`

- [ ] **Step 1: Skriv provideren**

```tsx
// Provider for aktivt land. Loader fra en SecureStore-cache (øjeblikkeligt korrekt
// sprog ved opstart, intet DK-glimt) og derefter fra profiles.country (autoritativ).
// sætLand() skriver profilen, opdaterer engine (sætAktivtLand) og re-synkroniserer
// tilbud. Eksponerer t() og formatPris() bundet til det aktive land.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { DEFAULT_LAND, landFor, type LandKode } from '../constants/lande';
import { sætAktivtLand } from '../constants/aktivtLand';
import { lav, type T } from '../constants/i18n';
import { formatPris as fmt } from '../constants/format';
import { synkroniserTilbud } from '../lib/tilbudSync';

const CACHE_NØGLE = 'aktivt_land';

type LandCtx = {
  land: LandKode;
  sætLand: (kode: LandKode) => Promise<void>;
  t: T;
  formatPris: (kr: number) => string;
};

const Ctx = createContext<LandCtx | null>(null);

export function LandProvider({ children }: { children: React.ReactNode }) {
  const [land, setLandState] = useState<LandKode>(DEFAULT_LAND);

  // Anvend et land i hukommelsen: opdater prismotoren + React-state (gemmer ikke).
  const anvend = useCallback((kode: LandKode) => {
    sætAktivtLand(kode);     // engine + lyttere (caches tømmes)
    setLandState(kode);      // re-render
  }, []);

  // Opstart: cache → engine, derefter profil (overstyrer hvis sat).
  useEffect(() => {
    let aktiv = true;
    (async () => {
      try {
        const cachet = await SecureStore.getItemAsync(CACHE_NØGLE);
        if (aktiv && cachet) anvend(cachet as LandKode);
      } catch {}
      try {
        const { data } = await supabase.from('profiles').select('country').maybeSingle();
        if (aktiv && data?.country) {
          anvend(data.country as LandKode);
          SecureStore.setItemAsync(CACHE_NØGLE, data.country).catch(() => {});
          // Vigtigt: hent det korrekte lands tilbud ind. App.tsx's opstart-sync kører
          // før profilen er læst (med default-landet), så uden dette ville fx en
          // NO-bruger mangle sine tilbud indtil næste sync.
          synkroniserTilbud(true);
        }
      } catch {}
    })();
    return () => { aktiv = false; };
  }, [anvend]);

  const sætLand = useCallback(async (kode: LandKode) => {
    anvend(kode);
    try { await SecureStore.setItemAsync(CACHE_NØGLE, kode); } catch {}
    synkroniserTilbud(true);   // hent det nye lands tilbud
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('profiles').update({ country: kode }).eq('id', user.id);
    } catch {}
  }, [anvend]);

  const t = lav(landFor(land).sprog);
  const formatPris = useCallback((kr: number) => fmt(kr, land), [land]);

  return <Ctx.Provider value={{ land, sætLand, t, formatPris }}>{children}</Ctx.Provider>;
}

export function useLand(): LandCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLand skal bruges inden i <LandProvider>');
  return v;
}
```

- [ ] **Step 2: tsc** — Forventet: ingen fejl.

- [ ] **Step 3: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "Desktop/claude app/StudentLifeStyle/context/LandContext.tsx"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(land): LandContext (aktivt land, t, formatPris, saetLand)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 11: `App.tsx` — wrap i LandProvider + tab-labels via t()

**Files:**
- Modify: `Desktop/claude app/StudentLifeStyle/App.tsx`

- [ ] **Step 1: Importér provideren + useLand**

Efter `import { Colors } from './constants/theme';` (linje 22), tilføj:
```ts
import { LandProvider, useLand } from './context/LandContext';
```

- [ ] **Step 2: Brug t() til tab-labels**

I `MainTabs()` (starter linje 97), efter `const [erNy, setErNy] = useState(false);`, tilføj:
```ts
const { t } = useLand();
```
Sæt `title` via t() på de fire rigtige faner (Tilføj-fanen har ingen label). Skift `<Tab.Screen name="Hjem" component={HomeScreen} />` m.fl. til:
```tsx
<Tab.Screen name="Hjem" component={HomeScreen} options={{ title: t('tab.hjem') }} />
<Tab.Screen name="Planer" component={PlanerScreen} options={{ title: t('tab.planer') }} />
```
og tilsvarende for Indkøb/Profil:
```tsx
<Tab.Screen name="Indkøb" component={IndkøbScreen} options={{ title: t('tab.indkøb') }} />
<Tab.Screen name="Profil" component={ProfilScreen} options={{ title: t('tab.profil') }} />
```
(`tabBarLabel` i `screenOptions` viser `children` = route `title`, så dette slår igennem. Lad `TabIcon`/`name` være uændret — navnene bruges til navigation/ikon-opslag.)

- [ ] **Step 3: Wrap app-træet i `<LandProvider>`**

I `export default function App()` (linje 256), skift retur-blokken så `LandProvider` ligger inde i `AuthProvider` (så den kan læse session/profil) og uden om `NavigationContainer`:
```tsx
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <LandProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </LandProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
```

- [ ] **Step 4: tsc** — Forventet: ingen fejl.

- [ ] **Step 5: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "Desktop/claude app/StudentLifeStyle/App.tsx"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(app): LandProvider + tab-labels via t()\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 12: Onboarding — nyt land-trin forrest

**Files:**
- Modify: `Desktop/claude app/StudentLifeStyle/screens/OnboardingScreen.tsx`

> Mønster for resten af strengene: denne task migrerer det NYE land-trin (via `t()`) og gør butiks-/opskrift-/valuta-data land-afhængige. De øvrige danske strenge på skærmen kan migreres inkrementalt ved at flytte hver streng til `da.ts` og kalde `t('...')` — ingen arkitektur-ændring.

- [ ] **Step 1: Importér land-API**

Efter `import { sætLandPåPlaner } from '../constants/onboardingHandoff';` (linje 33), tilføj:
```ts
import { useLand } from '../context/LandContext';
import { ALLE_LANDE, landFor, type LandKode } from '../constants/lande';
```

- [ ] **Step 2: Gør butikslisten land-afhængig**

Slet den hardkodede konstant (linje 40):
```ts
const BUTIKKER = ['Netto', 'Rema 1000', 'Føtex', 'SuperBrugsen', 'Bilka'];
```
(Den erstattes af `butikkerForLand` i komponenten i Step 4.)

- [ ] **Step 3: Tilføj `'land'` forrest i trin-rækkefølgen**

I `type Trin` (linje 93–95), tilføj `'land'` som første medlem:
```ts
type Trin =
  | 'land' | 'social' | 'maal' | 'bekraeft' | 'vaerdi' | 'import' | 'kilde'
  | 'navn' | 'husstand' | 'butikker' | 'kategorier' | 'favoritter' | 'plan3' | 'notif' | 'payoff';
```
Og i `TRIN`-arrayet (linje 96–103), sæt `'land'` forrest:
```ts
const TRIN: Trin[] = [
  'land',
  'social', 'maal', 'bekraeft', 'vaerdi', 'import', 'favoritter', 'plan3',
  'navn', 'husstand', 'butikker', 'kategorier', 'kilde', 'notif', 'payoff',
];
```

- [ ] **Step 4: State + land-handler i komponenten**

I `OnboardingScreen` (efter `const [trin, setTrin] = useState(0);`, linje 108), tilføj:
```ts
const { t, sætLand } = useLand();
const [valgtLand, setValgtLand] = useState<LandKode>('DK');
const butikkerForLand = landFor(valgtLand).butikker;
```
Skift butik-default (linje 117) fra:
```ts
const [butikker, setButikker] = useState<string[]>(['Netto', 'Rema 1000']);
```
til (tom — sættes når land vælges):
```ts
const [butikker, setButikker] = useState<string[]>([]);
```
Tilføj en handler (ved siden af de andre `toggle*`-funktioner):
```ts
// Vælg land: opdatér engine/sprog straks (så butiks-/opskrift-/valuta-trin følger
// landet) og forvælg landets to første butikker.
function vælgLand(kode: LandKode) {
  setValgtLand(kode);
  sætLand(kode);
  setButikker(landFor(kode).butikker.slice(0, 2));
}
```

- [ ] **Step 5: Render-blok for land-trinnet**

Lige FØR `{/* Social proof / velkomst ... */}`-blokken (linje 308, `{aktuel === 'social' && (`), indsæt:
```tsx
{/* Vælg land — nyt FØRSTE trin; styrer sprog, butikker, valuta og opskrifter */}
{aktuel === 'land' && (
  <>
    <Text style={styles.titel}>{t('onboard.land.titel')}</Text>
    <Text style={styles.broedtekstSmal}>{t('onboard.land.under')}</Text>
    <View style={{ gap: 12, marginTop: 4 }}>
      {ALLE_LANDE.map(l => (
        <ValgKort
          key={l.kode}
          emoji={l.flag}
          tekst={l.navn}
          valgt={valgtLand === l.kode}
          onPress={() => vælgLand(l.kode)}
        />
      ))}
    </View>
  </>
)}
```

- [ ] **Step 6: Brug landets butikker i butiks-trinnet**

I `{aktuel === 'butikker' && ...}` (linje 476), skift `{BUTIKKER.map(b => {` til:
```tsx
{butikkerForLand.map(b => {
```

- [ ] **Step 7: Gem landet ved afslutning**

I `færdig()` (linje 163), i `profiles.upsert`-objektet (linje 168–172), tilføj `country`:
```ts
        await supabase.from('profiles').upsert({
          id: user.id,
          household_size: personer,
          stores: butikker,
          country: valgtLand,
        });
```
(`sætLand()` i Step 4 har allerede skrevet `country` undervejs; her sikres det også i upsert-stien sammen med de øvrige kerne-felter.)

- [ ] **Step 8: Land-trinnet kræver et valg for at gå videre**

I `kanVidere` (linje 232–238), tilføj en linje så land-trinnet er gyldigt (valgtLand har altid en default, så det er reelt altid sandt — men gør det eksplicit):
```ts
  const kanVidere =
    aktuel === 'maal' ? maal.length > 0 :
    aktuel === 'butikker' ? butikker.length > 0 :
    aktuel === 'kategorier' ? tilbudsKategorier.length > 0 :
    aktuel === 'favoritter' ? favoritter.length > 0 :
    aktuel === 'plan3' ? dagsRetter.length > 0 :
    true;
```
(Ingen ændring nødvendig — `land` falder i `true`-grenen. Bekræft blot at blokken stadig ser sådan ud.)

- [ ] **Step 9: tsc** — Forventet: ingen fejl.

- [ ] **Step 10: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "Desktop/claude app/StudentLifeStyle/screens/OnboardingScreen.tsx"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(onboarding): land-trin forrest styrer butikker/opskrifter/valuta\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 13: Profil — "Land"-række + land-vælger

**Files:**
- Modify: `Desktop/claude app/StudentLifeStyle/screens/ProfilScreen.tsx`

> Læs `screens/ProfilScreen.tsx` først for at se de faktiske style-navne (`styles.kort`, `styles.række`, `styles.sektionLabel`, `styles.rækkeLabel`, `styles.værditekst` el.lign.) — brug dem der matcher filen. Stinavnene nedenfor følger mønsteret fra sky-pipeline-planens admin-række.

- [ ] **Step 1: Importér land-API**

Tilføj blandt de øvrige imports i toppen:
```ts
import { useLand } from '../context/LandContext';
import { ALLE_LANDE, landFor, type LandKode } from '../constants/lande';
```

- [ ] **Step 2: Hent land + lokal modal-state**

I komponenten, ved siden af de øvrige `useState`-kald, tilføj:
```ts
const { land, sætLand, t } = useLand();
const [landVælgerÅben, setLandVælgerÅben] = useState(false);
```

- [ ] **Step 3: Tilføj "Land"-rækken**

Indsæt en række i en passende sektion (fx lige før "ANDET"-sektionen), i samme stil som de øvrige rækker på skærmen:
```tsx
<TouchableOpacity style={styles.række} onPress={() => setLandVælgerÅben(true)}>
  <Text style={styles.rækkeIkon}>{landFor(land).flag}</Text>
  <Text style={styles.rækkeLabel}>{t('profil.land.label')}</Text>
  <Text style={styles.værditekst}>{landFor(land).navn}  ›</Text>
</TouchableOpacity>
```

- [ ] **Step 4: Tilføj land-vælger-modalen**

Lige før den afsluttende `</SafeAreaView>` (sammen med de øvrige modaler på skærmen), indsæt:
```tsx
<Modal visible={landVælgerÅben} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setLandVælgerÅben(false)}>
  <SafeAreaView style={{ flex: 1, backgroundColor: Colors.paper }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.line }}>
      <Text style={{ fontSize: 20, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink }}>{t('profil.land.titel')}</Text>
      <TouchableOpacity onPress={() => setLandVælgerÅben(false)}>
        <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.green }}>{t('fælles.færdig')}</Text>
      </TouchableOpacity>
    </View>
    <View style={{ padding: 20, gap: 12 }}>
      {ALLE_LANDE.map(l => {
        const valgt = l.kode === land;
        return (
          <TouchableOpacity
            key={l.kode}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
              backgroundColor: Colors.card, borderRadius: Radii.card,
              borderWidth: 1.5, borderColor: valgt ? Colors.green : Colors.line,
            }}
            onPress={() => { sætLand(l.kode); setLandVælgerÅben(false); }}
          >
            <Text style={{ fontSize: 22 }}>{l.flag}</Text>
            <Text style={{ flex: 1, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: valgt ? Colors.green : Colors.ink }}>{l.navn}</Text>
            {valgt && <Text style={{ color: Colors.green, fontFamily: 'Inter_700Bold' }}>✓</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  </SafeAreaView>
</Modal>
```
> Sørg for at `Modal`, `Radii` og `Colors` er importeret (de fleste er allerede; tilføj `Modal` til `react-native`-importen og `Radii` til `../constants/theme`-importen hvis de mangler).

- [ ] **Step 5: tsc** — Forventet: ingen fejl. Ret style-/import-navne til de faktiske i filen hvis tsc klager.

- [ ] **Step 6: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "Desktop/claude app/StudentLifeStyle/screens/ProfilScreen.tsx"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(profil): land-vaelger der re-lokaliserer appen\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 14: Pipeline — `land`-dimension i upload + udtræk

**Files:**
- Modify: `Desktop/claude app/StudentLifeStyle/scripts/tilbud-core.mjs`
- Modify: `Desktop/claude app/StudentLifeStyle/scripts/opdater-tilbud.mjs`
- Modify: `Desktop/claude app/StudentLifeStyle/scripts/opdater-tilbud-cloud.mjs`
- Modify: `Desktop/claude app/StudentLifeStyle/supabase/functions/start-tilbud-import/index.ts`
- Modify: `Desktop/claude app/StudentLifeStyle/lib/tilbudUpload.ts`
- Modify: `Desktop/claude app/StudentLifeStyle/components/UploadTilbudModal.tsx`

> Mål: tilbud-rækker og import-jobs skrives med `land`. Default `'DK'` overalt bevarer nuværende adfærd. (Workflow-filen `.github/workflows/tilbud-import.yml` behøver ingen ændring — den videresender hele payloaden, der nu også bærer `land`.)

- [ ] **Step 1: `tilbud-core.mjs` — skriv `land` i `tilbud`**

I `behandlButik({ slug, butik, uge, pdfBuffer, ... })`, tilføj `land = 'DK'` til parametrene og før det videre til `skrivTilbud`. Skift signaturen:
```js
export async function behandlButik({ slug, butik, uge, land = 'DK', pdfBuffer, maxSider = Infinity, log = () => {} }) {
```
og kaldet til `skrivTilbud` nederst i funktionen:
```js
  await skrivTilbud(butik, uge, land, varer);
  return { antal: varer.length };
```
Opdatér `skrivTilbud` så den nøgler DELETE/INSERT på `land`:
```js
async function skrivTilbud(butik, uge, land, varer) {
  await fetch(`${REST}/tilbud?land=eq.${encodeURIComponent(land)}&butik=eq.${encodeURIComponent(butik)}&uge=eq.${uge}`, {
    method: 'DELETE', headers: svcHead(),
  });
  if (varer.length === 0) return;
  const rows = varer.map(v => ({ land, butik, uge, navn: v.navn, soeg: v.soeg ?? [], pris: v.pris }));
  for (let i = 0; i < rows.length; i += 500) {
    const r = await fetch(`${REST}/tilbud`, {
      method: 'POST',
      headers: { ...svcHead(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(rows.slice(i, i + 500)),
    });
    if (!r.ok) throw new Error(`insert tilbud: ${r.status} ${await r.text()}`);
  }
}
```

- [ ] **Step 2: `opdater-tilbud.mjs` (lokal) — sæt land pr. butik**

Tilføj `land: 'DK'` til hvert objekt i `BUTIKKER`-arrayet, og send `land` videre til `behandlButik`. Eksempel for arrayet:
```js
const BUTIKKER = [
  { butik: 'Netto',     slug: 'netto',    land: 'DK', pdf: 'C:/Users/gust5/Downloads/netto uge 25-compressed.pdf' },
  { butik: 'Rema 1000', slug: 'rema1000', land: 'DK', pdf: 'C:/Users/gust5/Downloads/rema1000 uge 25-compressed.pdf' },
  { butik: 'Føtex',     slug: 'fotex',    land: 'DK', pdf: 'C:/Users/gust5/Downloads/Føtex uge 25_compressed.pdf' },
];
```
og kaldet i løkken:
```js
    const { antal } = await behandlButik({
      slug: b.slug, butik: b.butik, uge: UGE, land: b.land ?? 'DK',
      pdfBuffer: readFileSync(b.pdf), maxSider: MAX_SIDER, log: console.log,
    });
```

- [ ] **Step 3: `opdater-tilbud-cloud.mjs` — læs `land` fra payloaden**

I job-løkken, hent `land` fra job og send videre + brug i status-id (uændret id-skema, men land bæres med):
```js
for (const job of JOBS) {
  const { slug, butik, land = 'DK' } = job;
  const sti = job.sti || `inbox/${slug}-uge${UGE}.pdf`;
  console.log(`\n=== ${butik} ${land} (uge ${UGE}) ===`);
  try {
    await sætStatus(slug, { status: 'kører', fejl: null });
    const pdfBuffer = await hentPdf(sti);
    const { antal } = await behandlButik({ slug, butik, uge: UGE, land, pdfBuffer, log: console.log });
    await sletInbox(sti);
    await sætStatus(slug, { status: 'færdig', antal });
    console.log(`  ✓ ${antal} tilbud gemt for ${butik} (${land})`);
  } catch (e) {
    await sætStatus(slug, { status: 'fejl', fejl: String(e?.message ?? e) });
    console.error(`  FEJL (${butik}): ${e?.message ?? e}`);
  }
}
```

- [ ] **Step 4: `start-tilbud-import/index.ts` — videresend `land` i payloaden**

Funktionen videresender allerede `jobs` uændret i `client_payload`. Sørg for at `land` på hvert job bevares (ingen kode-ændring nødvendig hvis jobs spreades direkte). Tilføj blot en valgfri validering efter `const jobs = ...`:
```ts
  // land er valgfrit pr. job (default 'DK' sættes i cloud-scriptet) — ingen ændring
  // af dispatch-formen; jobs (inkl. land) sendes videre som de er.
```
(Hvis funktionen i forvejen kopierer felter eksplicit fra hvert job, så tilføj `land: j.land ?? 'DK'` til den kopiering.)

- [ ] **Step 5: `lib/tilbudUpload.ts` — bær `land` gennem upload + job**

Tilføj `land` til `UploadFil`-typen og til job-objekterne. Skift typen:
```ts
export type UploadFil = { uri: string; navn: string; butik: ButikValg; land: LandKode };
```
Tilføj importen øverst:
```ts
import type { LandKode } from '../constants/lande';
```
I `uploadOgStart`, medtag `land` på job-rækken og i jobs-arrayet til edge-fn'en:
```ts
    const ins = await supabase.from('tilbud_import_job').upsert({
      id: `${slug}-uge${uge}`, user_id: user.id, butik: f.butik, slug, uge,
      land: f.land, status: 'afventer', antal: 0, fejl: null,
    }, { onConflict: 'id' });
    ...
    jobs.push({ slug, butik: f.butik, land: f.land, sti });
```

- [ ] **Step 6: `UploadTilbudModal.tsx` — land-vælger pr. upload-batch**

Tilføj en land-vælger (chips) øverst i modalen og sæt `land` på filerne. Tilføj imports:
```ts
import { ALLE_LANDE, type LandKode } from '../constants/lande';
```
Tilføj state:
```ts
const [land, setLand] = useState<LandKode>('DK');
```
Sæt `land` når filer vælges (i `vælgFiler`):
```ts
    const nye = res.assets.map(a => ({ uri: a.uri, navn: a.name, butik: gætButik(a.name), land }));
```
Indsæt en land-chip-række øverst i `ScrollView` (før uge-rækken):
```tsx
<View style={styles.chips}>
  {ALLE_LANDE.map(l => (
    <Chip key={l.kode} label={`${l.flag} ${l.navn}`} active={land === l.kode}
      onPress={() => { setLand(l.kode); setFiler(prev => prev.map(f => ({ ...f, land: l.kode }))); }} />
  ))}
</View>
```

- [ ] **Step 7: Verificér scripts + tsc**
```
node --check "C:/Users/gust5/claude/StudentLifeStyle/Desktop/claude app/StudentLifeStyle/scripts/tilbud-core.mjs"
node --check "C:/Users/gust5/claude/StudentLifeStyle/Desktop/claude app/StudentLifeStyle/scripts/opdater-tilbud.mjs"
node --check "C:/Users/gust5/claude/StudentLifeStyle/Desktop/claude app/StudentLifeStyle/scripts/opdater-tilbud-cloud.mjs"
```
Forventet: exit 0 for alle tre. Kør derefter tsc-kommandoen for app-filerne (`lib/tilbudUpload.ts`, `components/UploadTilbudModal.tsx`). Forventet: ingen fejl.

- [ ] **Step 8: Deploy edge-funktionen (hvis ændret i Step 4)**
```
pwsh -Command "& { . 'C:/Users/gust5/claude/StudentLifeStyle/Desktop/claude app/StudentLifeStyle/scripts/sb-token.ps1'; npx supabase functions deploy start-tilbud-import --no-verify-jwt --project-ref oqolcifpmdybimspnadc }"
```
Forventet: `Deployed Function start-tilbud-import`. (Spring over hvis Step 4 ikke ændrede koden.)

- [ ] **Step 9: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "Desktop/claude app/StudentLifeStyle/scripts/tilbud-core.mjs" "Desktop/claude app/StudentLifeStyle/scripts/opdater-tilbud.mjs" "Desktop/claude app/StudentLifeStyle/scripts/opdater-tilbud-cloud.mjs" "Desktop/claude app/StudentLifeStyle/supabase/functions/start-tilbud-import/index.ts" "Desktop/claude app/StudentLifeStyle/lib/tilbudUpload.ts" "Desktop/claude app/StudentLifeStyle/components/UploadTilbudModal.tsx"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'feat(pipeline): land-dimension i tilbuds-upload og -udtraek\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Task 15: ROADMAP + end-to-end verifikation

**Files:**
- Modify: `Desktop/claude app/StudentLifeStyle/ROADMAP.md`

- [ ] **Step 1: Opdater ROADMAP**

Læs `ROADMAP.md`. Tilføj et afkrydset milepæls-punkt:
```
- [x] Flere lande-fundament (DK/NO/SE): land i profil + tilbud + pipeline, central land-konfig, i18n med dansk fallback, land-skopet prismotor/opskrifter, land-vælger i onboarding + profil. DK = eneste indhold; NO/SE klar til indhold.
```
Og en linje i beslutningsloggen (dagens dato):
```
- **2026-06-22:** MadUgen gjort land-bevidst (tilgang B). Ét land pr. bruger (profiles.country), central constants/lande.ts, hjemmebygget t() med dansk fallback, prismotor/basispriser/opskrifter land-skopet via constants/aktivtLand.ts. Kun fundamentet — norsk/svensk indhold (tilbudsaviser, opskrifter, oversættelser) fyldes på uden kodeændringer. Spec/plan i docs/superpowers/.
```

- [ ] **Step 2: Commit**
```
git -C "C:/Users/gust5/claude/StudentLifeStyle" add "Desktop/claude app/StudentLifeStyle/ROADMAP.md"
git -C "C:/Users/gust5/claude/StudentLifeStyle" commit -m "$(printf 'docs(roadmap): flere lande-fundament + beslutningslog\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

- [ ] **Step 3: Fuld tsc-gate**

Kør tsc-kommandoen fra "Vigtige projekt-konventioner". Forventet: ingen output, exit 0.

- [ ] **Step 4: DB-røgtest**
```
pwsh "C:/Users/gust5/claude/StudentLifeStyle/Desktop/claude app/StudentLifeStyle/scripts/sb-sql.ps1" -Query "select country, count(*) from profiles group by country;"
pwsh "C:/Users/gust5/claude/StudentLifeStyle/Desktop/claude app/StudentLifeStyle/scripts/sb-sql.ps1" -Query "select land, count(*) from tilbud group by land;"
```
Forventet: alle eksisterende rækker har `country='DK'` / `land='DK'` (backfill).

- [ ] **Step 5: App-røgtest (bruger-drevet — agenten booter ikke emulator)**

Brugeren genindlæser appen og bekræfter:
1. **Ny bruger:** onboarding starter med land-valg → vælg Norge → butiks-trinnet viser norske kæder, valuta er "kr" (NOK-format), opskrift-trin er tomme (NO har ingen opskrifter endnu). Afslut → Profil viser "Land: Norge".
2. **Skift land:** Profil → Land → skift DK↔NO↔SE → appen re-lokaliserer; DK viser tilbud/opskrifter, NO/SE viser tomme tilstande.
3. **Eksisterende DK-bruger:** oplevelsen er UÆNDRET (backfill `'DK'`), tilbud og opskrifter som før.

---

## Afhængigheds-rækkefølge

2 (`lande`) → 3 (`aktivtLand`) → 4 (i18n), 5 (`format`) er uafhængige men bygger på 2. 6 (basispriser) og 7 (tilbud/prismotor) bygger på 3. 8 (tilbudSync) bygger på 3. 9 (opskrifter) bygger på 2+3. 10 (`LandContext`) bygger på 2/3/4/5/8. 11 (App) bygger på 10. 12 (onboarding) + 13 (profil) bygger på 10. 14 (pipeline) bygger på 1 (`tilbud.land`-kolonnen) + 2. 1 (DB) kan køres når som helst først, men SKAL være kørt før 8/10/14 testes mod databasen. 15 til sidst.

**Anbefalet eksekverings-rækkefølge:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15.
