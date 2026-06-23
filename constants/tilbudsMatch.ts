// Tæller hvor mange af en opskrifts ingredienser der er på tilbud denne uge.
// Bruges til at vise "🏷 3 tilbud" på dag-kortene og i opskrift-vælgeren.
//
// Bruger slåEffektivPrisOp (samme motor som indkøbslisten) frem for eget
// søg-match — sikrer at tallet kun tæller varer hvor tilbudsprisen faktisk
// er lavere end normalprisen, så det matcher hvad indkøbslisten viser.
import { slåEffektivPrisOp } from './tilbudspriser';
import { findOpskrift } from '../lib/brugerOpskrifter';

export type TilbudsMatch = {
  antal: number;       // unikke ingredienser på tilbud
  butikker: string[];  // hvilke butikker (kan være flere)
};

export function tælTilbudsMatch(opskriftId: string, butikker?: string[]): TilbudsMatch {
  const opskrift = findOpskrift(opskriftId);
  if (!opskrift) return { antal: 0, butikker: [] };

  const butikSet = new Set<string>();
  let antal = 0;

  for (const ing of opskrift.ingredienser as any[]) {
    // Krydderier og gratis-estimater tæller ikke
    if (ing.estimeret && ing.estimereretPris === 0) continue;
    const e = slåEffektivPrisOp(ing, butikker);
    if (e.paaTilbud && e.butik) {
      antal++;
      butikSet.add(e.butik);
    }
  }

  return { antal, butikker: [...butikSet] };
}
