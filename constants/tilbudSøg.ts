// Fritekst- og kategori-søgning i ugens tilbud.
// Bruges af "+ Tilføj vare"-arket på indkøbslisten: brugeren skriver fx
// "kylling" eller trykker en kategori-chip, og får alle matchende
// tilbudspakker på tværs af butikker — med butik, pakkenavn og tilbudspris.
//
// Genbruger aktiveTilbud() fra tilbudspriser.ts, så søgningen altid rammer
// præcis indeværende uges tilbud (live fra Supabase, fallback til filerne).
// Ingen ændring af tilbudsdata-formatet kræves.
import { aktiveTilbud } from './tilbudspriser';
import { kategoriserIngrediens, KATEGORI_ORDEN, KATEGORI_EMOJI } from './indkoeb';

export type TilbudsTræf = {
  butik: string;
  navn: string;   // pakkenavnet fra avisen (vises på kortet + som vare i listen)
  soeg: string[];
  pris: number;   // tilbudsprisen i kr
};

export type TilbudsGruppe = {
  kategori: string;
  emoji: string;
  varer: TilbudsTræf[];
};

// Kategori-chips til hurtigvalg. `termer` er de søgeord avisen faktisk bruger
// (fx 'laks'/'tun' frem for 'fisk') — så en chip rammer bredt nok.
export type TilbudsKategori = { emoji: string; label: string; termer: string[] };

export const TILBUD_KATEGORIER: TilbudsKategori[] = [
  { emoji: '🐔', label: 'Kylling',    termer: ['kylling'] },
  { emoji: '🥩', label: 'Oksekød',    termer: ['okse'] },
  { emoji: '🐷', label: 'Svinekød',   termer: ['gris', 'svin', 'flæsk', 'mørbrad', 'kotelet'] },
  { emoji: '🐟', label: 'Fisk',       termer: ['laks', 'tun', 'fisk', 'torsk', 'rejer', 'sej'] },
  { emoji: '🧀', label: 'Ost',        termer: ['ost'] },
  { emoji: '🥛', label: 'Mejeri',     termer: ['mælk', 'yoghurt', 'smør', 'fløde', 'skyr', 'æg'] },
  { emoji: '🍝', label: 'Pasta & ris', termer: ['pasta', 'ris', 'nudler', 'spaghetti'] },
  { emoji: '🥖', label: 'Brød',       termer: ['brød', 'rugbrød', 'toast', 'pita', 'boller'] },
  { emoji: '🥦', label: 'Grønt',      termer: ['kartofler', 'peberfrugt', 'løg', 'gulerod', 'tomat', 'salat', 'ærter', 'grøntsag', 'broccoli'] },
];

// Matcher én term mod en varens navn + søgeord. Substring begge veje, så
// "kylling" rammer "kyllingefilet", og "hakket kylling 400g" rammer 'kylling'.
function rammer(term: string, hø: string[]): boolean {
  const q = term.toLowerCase().trim();
  if (q.length < 2) return false;
  return hø.some(h => h.includes(q) || q.includes(h));
}

// Søg ugens tilbud. `termer` ORes sammen (én term er nok til et træf).
// Til fritekst sendes [query]; til en kategori sendes kategoriens termer.
export function søgTilbud(termer: string[], butikker?: string[], maks = 40): TilbudsTræf[] {
  const aktive = termer.map(t => t.toLowerCase().trim()).filter(t => t.length >= 2);
  if (aktive.length === 0) return [];

  const ud: TilbudsTræf[] = [];
  for (const kilde of aktiveTilbud(butikker)) {
    for (const vare of kilde.varer) {
      const hø = [vare.navn.toLowerCase(), ...vare.soeg.map(s => s.toLowerCase())];
      if (aktive.some(t => rammer(t, hø))) {
        ud.push({ butik: kilde.butik, navn: vare.navn, soeg: vare.soeg, pris: vare.pris });
      }
    }
  }

  // Billigst først — størst sandsynlighed for det brugeren vil have øverst
  return ud.sort((a, b) => a.pris - b.pris).slice(0, maks);
}

// Alle ugens tilbud (uden kategori- eller tekstfilter), billigst først — til
// "Alle"-chippen på "+ Tilføj vare"-arket, så man kan browse hele ugens udvalg.
export function alleTilbud(butikker?: string[], maks = 200): TilbudsTræf[] {
  const ud: TilbudsTræf[] = [];
  for (const kilde of aktiveTilbud(butikker)) {
    for (const vare of kilde.varer) {
      ud.push({ butik: kilde.butik, navn: vare.navn, soeg: vare.soeg, pris: vare.pris });
    }
  }
  return ud.sort((a, b) => a.pris - b.pris).slice(0, maks);
}

// Alle ugens tilbud grupperet i kategorier (Kød, Fisk, Grønt, Drikkevarer …)
// til "Se alle tilbud"-browseren på forsiden. Bruger samme kategorisering som
// indkøbslisten, så det er konsistent. Tomme kategorier udelades, og varerne
// sorteres billigst først inden for hver kategori.
export function grupperTilbudIKategorier(butikker?: string[]): TilbudsGruppe[] {
  const perKategori = new Map<string, TilbudsTræf[]>();

  for (const kilde of aktiveTilbud(butikker)) {
    for (const vare of kilde.varer) {
      const kategori = kategoriserIngrediens({ navn: vare.navn, soeg: vare.soeg });
      if (!perKategori.has(kategori)) perKategori.set(kategori, []);
      perKategori.get(kategori)!.push({
        butik: kilde.butik, navn: vare.navn, soeg: vare.soeg, pris: vare.pris,
      });
    }
  }

  const ud: TilbudsGruppe[] = [];
  for (const kategori of KATEGORI_ORDEN) {
    const varer = perKategori.get(kategori);
    if (!varer || varer.length === 0) continue;
    varer.sort((a, b) => a.pris - b.pris);
    ud.push({ kategori, emoji: KATEGORI_EMOJI[kategori] ?? '🏷️', varer });
  }
  return ud;
}
