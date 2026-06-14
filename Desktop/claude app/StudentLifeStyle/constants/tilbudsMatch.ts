// Tæller hvor mange af en opskrifts ingredienser der er på tilbud denne uge.
// Bruges til at vise "🏷 3 tilbud" på dag-kortene og i opskrift-vælgeren.
// Ingen prisberegning — kun: er varen på tilbud, og hos hvem?
import { aktiveTilbud } from './tilbudspriser';
import { matcherSoegeord } from './basispriser';
import { OPSKRIFTER } from './opskrifter';

export type TilbudsMatch = {
  antal: number;       // unikke ingredienser på tilbud
  butikker: string[];  // hvilke butikker (kan være flere)
};

export function tælTilbudsMatch(opskriftId: string, butikker?: string[]): TilbudsMatch {
  const opskrift = OPSKRIFTER.find(o => o.id === opskriftId);
  if (!opskrift) return { antal: 0, butikker: [] };

  const kilder = aktiveTilbud(butikker);
  if (kilder.length === 0) return { antal: 0, butikker: [] };

  const butikSet = new Set<string>();
  let antal = 0;

  for (const ing of opskrift.ingredienser as any[]) {
    // Krydderier og gratis-estimater tæller ikke — de er altid "gratis"
    if (ing.estimeret && ing.estimereretPris === 0) continue;
    const tekster = [
      ing.navn.toLowerCase(),
      ...(ing.soeg ?? []).map((s: string) => s.toLowerCase()),
    ];
    let harMatch = false;
    for (const kilde of kilder) {
      for (const vare of kilde.varer) {
        if (vare.soeg.some((s: string) => tekster.some(t => matcherSoegeord(t, s)))) {
          harMatch = true;
          butikSet.add(kilde.butik);
        }
      }
    }
    if (harMatch) antal++;
  }

  return { antal, butikker: [...butikSet] };
}
