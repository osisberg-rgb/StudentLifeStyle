// Effektive priser = basispriser overlejret med ugens tilbud.
// Beregnes i hukommelsen ved hvert opslag — der gemmes aldrig en merged
// kopi, så "reset" sker automatisk når ugen skifter eller tilbudsfilen
// opdateres. Basispriser.ts er kilden og ændres aldrig.
import { slagBasispris, slåPrisOp, matcherSoegeord } from './basispriser';
import { REMA1000_TILBUD } from './tilbud/rema1000';
import { NETTO_TILBUD } from './tilbud/netto';
import { LIDL_TILBUD } from './tilbud/lidl';
import { DISCOUNT365_TILBUD } from './tilbud/365discount';
import { FOTEX_TILBUD } from './tilbud/fotex';
import { SUPERBRUGSEN_TILBUD } from './tilbud/superbrugsen';
import { KVIKLY_TILBUD } from './tilbud/kvikly';
import { BILKA_TILBUD } from './tilbud/bilka';

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
  LIDL_TILBUD,
  DISCOUNT365_TILBUD,
  FOTEX_TILBUD,
  SUPERBRUGSEN_TILBUD,
  KVIKLY_TILBUD,
  BILKA_TILBUD,
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
  return fjernKilder ?? TILBUDSKILDER;
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

let tilbudCache: { uge: number; kilder: TilbudsKilde[] } | null = null;
export function aktiveTilbud(butikker?: string[]): TilbudsKilde[] {
  const uge = aktuelUge();
  if (!tilbudCache || tilbudCache.uge !== uge) {
    tilbudCache = { uge, kilder: alleKilder().filter(k => matcherUge(k, uge)) };
  }
  if (!butikker || butikker.length === 0) return tilbudCache.kilder;
  return tilbudCache.kilder.filter(k => butikker.includes(k.butik));
}

function slåTilbudOp(tekster: string[], butikker?: string[]): { pris: number; butik: string } | null {
  let bedste: { pris: number; butik: string } | null = null;
  for (const kilde of aktiveTilbud(butikker)) {
    for (const vare of kilde.varer) {
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
};

// Til "Bedste tilbud lige nu" på forsiden — størst besparelse først
export function bedsteTilbud(maks = 3, butikker?: string[]): TilbudsVisning[] {
  const ud: TilbudsVisning[] = [];
  for (const kilde of aktiveTilbud(butikker)) {
    for (const vare of kilde.varer) {
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
