// Effektive priser = basispriser overlejret med ugens tilbud.
// Beregnes i hukommelsen ved hvert opslag — der gemmes aldrig en merged
// kopi, så "reset" sker automatisk når ugen skifter eller tilbudsfilen
// opdateres. Basispriser.ts er kilden og ændres aldrig.
import { slagBasispris, slåPrisOp, matcherSoegeord } from './basispriser';
import { vigtighed } from './vigtighed';
import { REMA1000_TILBUD } from './tilbud/rema1000';
import { NETTO_TILBUD } from './tilbud/netto';
import { FOTEX_TILBUD } from './tilbud/fotex';
import { SUPERBRUGSEN_TILBUD } from './tilbud/superbrugsen';
import { BILKA_TILBUD } from './tilbud/bilka';
import { LIDL_TILBUD } from './tilbud/lidl';
import { MENY_TILBUD } from './tilbud/meny';
import { DISCOUNT365_TILBUD } from './tilbud/365discount';

export type TilbudsKilde = {
  butik: string;
  // Enkelt tal (produktion) eller array (test/kampagner der løber flere uger)
  uge: number | number[];
  varer: Array<{ navn: string; soeg: string[]; pris: number }>;
};

// De hardkodede filer er nu FALLBACK/seed. Den primære kilde er Supabase-
// tabellen `tilbud`, der synkroniseres ind via sætTilbudskilder() (se
// lib/tilbudSync.ts) — så tilbud kan opdateres live uden app-redeploy.
// Indtil synkronisering er sket / hvis den fejler, bruges disse filer.
const TILBUDSKILDER: TilbudsKilde[] = [
  REMA1000_TILBUD,
  NETTO_TILBUD,
  FOTEX_TILBUD,
  SUPERBRUGSEN_TILBUD,
  BILKA_TILBUD,
  LIDL_TILBUD,
  MENY_TILBUD,
  DISCOUNT365_TILBUD,
];

// Fjernkilde (Supabase) overskriver de hardkodede filer, når den er sat med
// gyldige data. sætTilbudskilder(null) eller en tom liste falder tilbage til
// filerne — så appen virker uændret, indtil tabellen er fyldt.
let fjernKilder: TilbudsKilde[] | null = null;

export function sætTilbudskilder(kilder: TilbudsKilde[] | null): void {
  fjernKilder = kilder && kilder.length > 0 ? kilder : null;
  // Tøm caches, så de nye priser slår igennem med det samme
  tilbudCache = null;
  prisCache.clear();
}

// Er live-tilbud aktive (mindst én butik fra DB'en for indeværende uge)?
// Til diagnostik / "live"-badge i UI hvis ønsket.
export function brugerLiveTilbud(): boolean {
  return fjernKilder !== null;
}

function alleKilder(): TilbudsKilde[] {
  if (!fjernKilder) return TILBUDSKILDER;
  // FLET frem for at erstatte: brug DB-tilbud for de butikker der har data for
  // indeværende uge, og de hardkodede filer for resten — så tabellen kan fyldes
  // butik for butik uden at de andre butikkers tilbud forsvinder.
  const uge = aktuelUge();
  const dbButikker = new Set(
    fjernKilder.filter(k => matcherUge(k, uge)).map(k => k.butik),
  );
  return [...fjernKilder, ...TILBUDSKILDER.filter(k => !dbButikker.has(k.butik))];
}

export type EffektivPris = {
  pris: number;            // den pris programmet skal bruge
  normalpris: number;      // basisprisen (til overstreget visning)
  paaTilbud: boolean;
  butik: string | null;    // butikken med tilbuddet
};

// Samme uge-formel som skærmene bruger til madplaner — skal matche,
// ellers rammer tilbudsfilens uge-nr aldrig.
export function aktuelUge(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((((now.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
}

// Cachet pr. uge — kaldes for hvert prisopslag, så den skal være billig.
// `butikker` = brugerens valgte butikker; tom/udeladt betyder alle butikker.
function matcherUge(k: TilbudsKilde, uge: number): boolean {
  return Array.isArray(k.uge) ? k.uge.includes(uge) : k.uge === uge;
}

// Butikker der deler tilbudsavis (samme kæde). Vælger man fx Kvikly, får man
// også SuperBrugsens tilbud — de udgiver samme Coop-avis, og admin uploader
// kun under SuperBrugsen.
const BUTIK_ALIAS: Record<string, string[]> = {
  Kvikly: ['SuperBrugsen'],
};
function udvidMedAlias(butikker: string[]): Set<string> {
  const ud = new Set<string>();
  for (const b of butikker) {
    ud.add(b);
    for (const a of (BUTIK_ALIAS[b] ?? [])) ud.add(a);
  }
  return ud;
}

let tilbudCache: { uge: number; kilder: TilbudsKilde[] } | null = null;
export function aktiveTilbud(butikker?: string[]): TilbudsKilde[] {
  const uge = aktuelUge();
  if (!tilbudCache || tilbudCache.uge !== uge) {
    tilbudCache = { uge, kilder: alleKilder().filter(k => matcherUge(k, uge)) };
  }
  if (!butikker || butikker.length === 0) return tilbudCache.kilder;
  const valgte = udvidMedAlias(butikker);
  return tilbudCache.kilder.filter(k => valgte.has(k.butik));
}

// Tilbud prissat PR. ENHED (fx "Laksefilet pr. 100g", "Okseculotte pr. 1/2 kg",
// "Sliders pr. stk.", "... pr. kuvert") er IKKE en pakkepris — `pris` gælder kun
// 100g/500g/ét stk. Hvis motoren brugte dem som en hel pakke, ville en
// recept-ingrediens blive vildt under-prissat (fx laks til 16,95 i stedet for
// ~40). De udelukkes derfor fra pris-opslag og "bedste tilbud", men bliver
// stadig i tilbuds-browseren, hvor navnet ærligt viser enheden.
const PR_ENHED_RE = /\bpr\.\s*(\d|½|stk|kuvert|kg)/i;
export function erPrEnhed(navn: string): boolean {
  return PR_ENHED_RE.test(navn ?? '');
}

function slåTilbudOp(tekster: string[], butikker?: string[]): { pris: number; butik: string } | null {
  let bedste: { pris: number; butik: string } | null = null;
  for (const kilde of aktiveTilbud(butikker)) {
    for (const vare of kilde.varer) {
      if (erPrEnhed(vare.navn)) continue;   // pr-enhed-pris er ikke en pakkepris
      const matcher = vare.soeg.some(s => tekster.some(t => matcherSoegeord(t, s)));
      if (matcher && (!bedste || vare.pris < bedste.pris)) {
        bedste = { pris: vare.pris, butik: kilde.butik };
      }
    }
  }
  return bedste;
}

// Cache: samme ingrediens slås op tusindvis af gange (fx i anbefalings-
// søgningen) — uden cache fryser JS-tråden. Tømmes når ugen skifter, så
// gamle ugers priser ikke hober sig op i hukommelsen.
const prisCache = new Map<string, EffektivPris>();
let prisCacheUge = 0;

export function slåEffektivPrisOp(ing: {
  estimeret?: boolean;
  estimereretPris?: number;
  soeg?: string[];
  navn: string;
}, butikker?: string[]): EffektivPris {
  const uge = aktuelUge();
  if (uge !== prisCacheUge) {
    prisCacheUge = uge;
    prisCache.clear();
  }
  const butikNøgle = (butikker ?? []).slice().sort().join('+');
  const cacheNøgle = `${butikNøgle}|${ing.navn}|${(ing.soeg ?? []).join(',')}|${ing.estimeret ? ing.estimereretPris : ''}`;
  const cached = prisCache.get(cacheNøgle);
  if (cached) return cached;

  const basis = slåPrisOp(ing);

  // Tilbud gælder også estimerede varer (fx dåsetomater) — krydderier med
  // pris 0 rammes aldrig, da et tilbud aldrig er billigere end 0 kr
  const tekster = [ing.navn.toLowerCase(), ...(ing.soeg ?? []).map(s => s.toLowerCase())];
  const tilbud = slåTilbudOp(tekster, butikker);

  const resultat: EffektivPris =
    tilbud && tilbud.pris < basis
      ? { pris: tilbud.pris, normalpris: basis, paaTilbud: true, butik: tilbud.butik }
      : { pris: basis, normalpris: basis, paaTilbud: false, butik: null };

  prisCache.set(cacheNøgle, resultat);
  return resultat;
}

export type TilbudsVisning = {
  navn: string;
  soeg: string[];
  butik: string;
  normalpris: number;
  tilbudspris: number;
  besparelse: number;
  kilde?: 'watch' | 'favorit' | 'generelt';   // hvorfor vist (til badge)
};

// Til "Bedste tilbud lige nu" på forsiden — størst besparelse først
export function bedsteTilbud(maks = 3, butikker?: string[]): TilbudsVisning[] {
  const ud: TilbudsVisning[] = [];
  for (const kilde of aktiveTilbud(butikker)) {
    for (const vare of kilde.varer) {
      if (erPrEnhed(vare.navn)) continue;   // pr-enhed-pris kan ikke sammenlignes med basis
      const basis = slagBasispris(vare.soeg[0] ?? '') ?? slagBasispris(vare.navn);
      if (basis == null || vare.pris >= basis) continue;
      ud.push({
        navn: vare.navn,
        soeg: vare.soeg,
        butik: kilde.butik,
        normalpris: basis,
        tilbudspris: vare.pris,
        besparelse: basis - vare.pris,
      });
    }
  }
  return ud.sort((a, b) => b.besparelse - a.besparelse).slice(0, maks);
}

// "Tilbud til dig" — personligt udvalg frem for blot størst kr-besparelse.
//  - watchTermer:   søgeord fra brugerens "Mine varer" (Pepsi, oksekød …) →
//                   vises hvis varen er på tilbud i denne uge (uanset basis).
//  - relevanteOrd:  ingrediens-søgeord fra favoritter/madplan → vises når de er
//                   BILLIGERE end basis (en reel besparelse på noget du laver).
//  Rangordning: watch-varer først, derefter favorit-varer (begge billigst/størst
//  besparelse først). Tomt resultat → fallback til generelle bedste tilbud.
export function tilbudTilDig(
  watchTermer: string[],
  relevanteOrd: string[],
  maks = 4,
  butikker?: string[],
): TilbudsVisning[] {
  const watch = watchTermer.map(t => t.toLowerCase().trim()).filter(t => t.length >= 2);
  const rel = relevanteOrd.map(t => t.toLowerCase().trim()).filter(t => t.length >= 2);

  const valgt = new Map<string, TilbudsVisning>();
  for (const kilde of aktiveTilbud(butikker)) {
    for (const vare of kilde.varer) {
      if (erPrEnhed(vare.navn)) continue;
      const tekst = (vare.navn + ' ' + vare.soeg.join(' ')).toLowerCase();
      const watchTerm = watch.find(t => tekst.includes(t));
      const basis = slagBasispris(vare.soeg[0] ?? '') ?? slagBasispris(vare.navn);
      const ingTekster = [vare.navn.toLowerCase(), ...vare.soeg.map(s => s.toLowerCase())];
      const erFavorit = !watchTerm && basis != null && vare.pris < basis
        && rel.some(o => ingTekster.some(t => matcherSoegeord(t, o)));
      if (!watchTerm && !erFavorit) continue;

      // Logisk nøgle PÅ TVÆRS AF BUTIKKER: watch-varer grupperes på det matchede
      // søgeord (fx 'smør'), favorit-varer på deres primære soeg-ord — så samme
      // slags vare i flere butikker samles, og vi beholder den BILLIGSTE.
      const nøgle = (watchTerm ?? vare.soeg[0] ?? vare.navn).toLowerCase();
      const ny: TilbudsVisning = {
        navn: vare.navn, soeg: vare.soeg, butik: kilde.butik,
        normalpris: basis ?? vare.pris, tilbudspris: vare.pris,
        besparelse: basis != null ? Math.max(0, basis - vare.pris) : 0,
        kilde: watchTerm ? 'watch' : 'favorit',
      };
      const eks = valgt.get(nøgle);
      if (!eks) {
        valgt.set(nøgle, ny);
      } else {
        const billigst = ny.tilbudspris <= eks.tilbudspris ? ny : eks;
        if (ny.kilde === 'watch' || eks.kilde === 'watch') billigst.kilde = 'watch';
        valgt.set(nøgle, billigst);
      }
    }
  }

  const liste = [...valgt.values()].sort((a, b) => {
    if (a.kilde !== b.kilde) return a.kilde === 'watch' ? -1 : 1;
    // Vigtighed (mest brugt) først for BEGGE kilder.
    const va = vigtighed(a.soeg), vb = vigtighed(b.soeg);
    if (va !== vb) return vb - va;
    // Tiebreaker: watch → billigste pris; favorit → størst besparelse.
    return a.kilde === 'watch' ? a.tilbudspris - b.tilbudspris : b.besparelse - a.besparelse;
  });
  if (liste.length === 0) {
    return bedsteTilbud(maks, butikker).map(t => ({ ...t, kilde: 'generelt' as const }));
  }
  return liste.slice(0, maks);
}
