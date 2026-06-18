// Forudberegnede opskriftpriser med tilbud indregnet.
// Beregnes ÉN gang (første opslag efter at tilbudsdataen er lagt ind /
// appen er startet) og gemmes i cache — derefter er alle opslag gratis.
// AI'en er aldrig involveret i prisberegning.
import { slåEffektivPrisOp, aktuelUge } from './tilbudspriser';
import { alleOpskrifter, opskrifterVersion } from '../lib/brugerOpskrifter';

export type OpskriftPris = {
  pris: number;          // samlet pris med tilbud (skaleret)
  normalpris: number;    // samlet pris uden tilbud (skaleret)
  paaTilbud: boolean;    // mindst én ingrediens på tilbud
  besparelse: number;    // normalpris - pris (skaleret)
  butikker: string[];    // butikker med tilbud på rettens ingredienser
  gangeOpskrift: number; // hvor mange gange opskriften laves (hele pakker)
  portioner: number;     // portioner der kommer ud af det
};

let cache: { nøgle: string; priser: Map<string, OpskriftPris> } | null = null;

export function hentOpskriftPriser(butikker?: string[], personer?: number): Map<string, OpskriftPris> {
  const nøgle = `${aktuelUge()}|${(butikker ?? []).slice().sort().join('+')}|${personer ?? 0}|v${opskrifterVersion()}`;
  if (cache && cache.nøgle === nøgle) return cache.priser;

  const priser = new Map<string, OpskriftPris>();
  for (const o of alleOpskrifter()) {
    // Skalering pr. opskrift: køb hele pakke-sæt (2 pers på en 4-portions
    // opskrift = 1× med rester; 6 pers = 2×)
    const basePortioner = o.portioner || 4;
    const gange = personer ? Math.max(1, Math.ceil(personer / basePortioner - 1e-9)) : 1;

    let pris = 0;
    let normalpris = 0;
    const butikSet = new Set<string>();

    for (const ing of o.ingredienser as any[]) {
      if (ing.estimeret && ing.estimereretPris === 0) continue;
      const e = slåEffektivPrisOp(ing, butikker);
      pris += e.pris;
      normalpris += e.normalpris;
      if (e.paaTilbud && e.butik) butikSet.add(e.butik);
    }

    priser.set(o.id, {
      pris: Math.round(pris * gange),
      normalpris: Math.round(normalpris * gange),
      paaTilbud: butikSet.size > 0,
      besparelse: Math.round((normalpris - pris) * gange),
      butikker: [...butikSet],
      gangeOpskrift: gange,
      portioner: basePortioner * gange,
    });
  }

  cache = { nøgle, priser };
  return priser;
}
