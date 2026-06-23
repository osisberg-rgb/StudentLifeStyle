// Ren konvertering af flade DB-rækker til TilbudsKilde[].
// Ingen Supabase/native afhængigheder — kan importeres i tests.
import { TilbudsKilde } from '../constants/tilbudspriser';

export type TilbudRække = {
  butik: string;
  uge: number;
  navn: string;
  soeg: string[] | null;
  pris: number;
};

export function grupperTilbud(rækker: TilbudRække[]): TilbudsKilde[] {
  const perNøgle = new Map<string, TilbudsKilde>();
  for (const r of rækker) {
    if (!r.butik || typeof r.uge !== 'number' || isNaN(r.uge) || !r.navn) continue;
    const nøgle = `${r.butik}|${r.uge}`;
    if (!perNøgle.has(nøgle)) {
      perNøgle.set(nøgle, { butik: r.butik, uge: r.uge, varer: [] });
    }
    perNøgle.get(nøgle)!.varer.push({
      navn: r.navn,
      soeg: Array.isArray(r.soeg) ? r.soeg : [],
      pris: Number(r.pris),
    });
  }
  return [...perNøgle.values()];
}
