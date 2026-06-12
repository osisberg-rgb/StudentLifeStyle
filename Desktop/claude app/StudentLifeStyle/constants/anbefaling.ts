// Ugeplan-logik: hvor mange aftensmåltider dækker en ret, og hvilke retter
// anbefales for at fylde ugen inden for budgettet.
import { OPSKRIFTER } from './opskrifter';
import { hentOpskriftPriser } from './opskriftPriser';

export const UGE_MAAL = 7;     // aftensmåltider en ugeplan sigter mod
export const MAKS_RETTER = 7;  // højst én ny ret pr. dag

// Hvor mange aftener dækker en ret? Skalerede portioner delt med personer,
// rundet ned — resten er smårester der ikke tæller som et måltid.
// Fx: 4 portioner / 2 personer = 2 aftener (bevidste rester).
export function måltiderPrRet(portionerSkaleret: number, personer: number): number {
  return Math.max(1, Math.floor(portionerSkaleret / Math.max(1, personer)));
}

// Grådig anbefaling: fyld ugen (op til 7 aftensmåltider) inden for budgettet,
// billigste pris pr. måltid først — ugens tilbud trækker automatisk retter frem.
// Erstatter den gamle kombinations-søgning, som ikke skalerer til 7 retter
// (C(32,7) ≈ 3,4 mio. kombinationer).
export function findAnbefaledeRetter(
  retter: typeof OPSKRIFTER,
  budget: number,
  butikker: string[] | undefined,
  personer: number,
): string[] {
  const priser = hentOpskriftPriser(butikker, personer);

  const kandidater = retter
    .map(o => {
      const info = priser.get(o.id);
      const pris = info?.pris ?? 0;
      const måltider = måltiderPrRet(info?.portioner ?? (o.portioner || 4), personer);
      return { id: o.id, pris, måltider, prisPrMåltid: pris / måltider };
    })
    .sort((a, b) => a.prisPrMåltid - b.prisPrMåltid);

  const valgte: string[] = [];
  let totalPris = 0;
  let måltider = 0;

  for (const k of kandidater) {
    if (valgte.length >= MAKS_RETTER || måltider >= UGE_MAAL) break;
    if (totalPris + k.pris > budget) continue; // for dyr — prøv næste
    valgte.push(k.id);
    totalPris += k.pris;
    måltider += k.måltider;
  }

  // Budgettet er for lille til en plan — anbefal de 2 billigste alligevel
  if (valgte.length < 2) {
    return kandidater.slice(0, 2).map(k => k.id);
  }
  return valgte;
}
