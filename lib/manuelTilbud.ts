// Manuel indtastning af tilbud (admin). Bygger { butik, uge, varer[] } og
// sender til den admin-gatede edge-funktion `gem-tilbud`, som skriver direkte
// i `tilbud`-tabellen med service-role (erstatter alle rækker for butik+uge).
// Alternativ til AI/PDF-upload — bruges når AI-aflæsningen er upålidelig.
import { supabase } from './supabase';
import { BASISPRISER, matcherSoegeord } from '../constants/basispriser';
import { ALLE_BUTIK_VALG, aktuelUge, type ButikValg } from './tilbudUpload';

// Re-eksportér så modal'en kan importere alt fra ét sted.
export { ALLE_BUTIK_VALG, aktuelUge };
export type { ButikValg };

// UI-model: pris/mængde holdes som strenge mens man skriver; pris parses ved gem.
export type ManuelVare = { navn: string; maengde: string; pris: string; soeg: string[] };

// Alle søgeord der HAR en basispris (fladt, dedup) — det gyldige ordforråd.
// Uden et af disse kan varen ikke prissættes og er usynlig for tilbuds-motoren.
export const SOEGEORD_VOCAB: string[] = [...new Set(BASISPRISER.flatMap(b => b.soeg))];

// Auto-udled op til 3 søgeord fra varenavnet via samme ord-start-match som
// prismotoren (matcherSoegeord). Mest specifikke (længste) ord først.
export function gætSoeg(navn: string): string[] {
  if (!navn.trim()) return [];
  const ramte = SOEGEORD_VOCAB.filter(ord => matcherSoegeord(navn, ord));
  return [...new Set(ramte)].sort((a, b) => b.length - a.length).slice(0, 3);
}

export type GemResultat = { ok: boolean; antal?: number; fejl?: string };

export async function gemTilbudManuelt(
  butik: ButikValg,
  uge: number,
  varer: ManuelVare[],
): Promise<GemResultat> {
  // Rens klientsiden: navn påkrævet, pris → tal (accepter komma), drop tomme.
  const rows = varer
    .map(v => ({
      navn: v.navn.trim(),
      maengde: v.maengde.trim() || null,
      pris: parseFloat(v.pris.replace(',', '.')),
      soeg: v.soeg,
    }))
    .filter(v => v.navn.length > 0 && Number.isFinite(v.pris) && v.pris > 0);

  if (rows.length === 0) return { ok: false, fejl: 'Tilføj mindst én vare med navn og gyldig pris.' };

  const { data, error } = await supabase.functions.invoke('gem-tilbud', {
    body: { butik, uge, varer: rows },
  });
  if (error) return { ok: false, fejl: error.message };
  if (data?.error) return { ok: false, fejl: String(data.error) };
  return { ok: true, antal: typeof data?.antal === 'number' ? data.antal : rows.length };
}
