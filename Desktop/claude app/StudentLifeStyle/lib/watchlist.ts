// Brugerens overvågede varer (specifikke, fx "faxe kondi"). In-memory store med
// version-bump som lib/favoritter.ts, så 🔔-ikoner synkront viser korrekt tilstand.
import { supabase } from './supabase';

export type WatchRække = { id: string; term: string; label: string; kilde: string };

let watch: WatchRække[] = [];
let version = 0;
export function watchlistVersion(): number { return version; }

const ENHEDS_ORD = new Set(['g', 'kg', 'l', 'ml', 'cl', 'dl', 'stk', 'pk', 'pakke', 'ca', 'x', 'liter', 'gram']);

// Normaliser et varenavn til et søgeord: lowercase, fjern tegn/enheder/mængder.
export function normaliserNavn(navn: string): string {
  return (navn ?? '').toLowerCase()
    .replace(/[^a-zæøå0-9]+/g, ' ')
    .split(' ')
    .filter(w => w && !ENHEDS_ORD.has(w) && !/^\d+([.,]\d+)?$/.test(w))
    .join(' ').trim();
}
// Klokke på et (ofte langt) tilbudsnavn → de første 2 betydende ord.
export function termFraTilbud(navn: string): string {
  return normaliserNavn(navn).split(' ').slice(0, 2).join(' ');
}
// Fritekst → hele det normaliserede input.
export function termFraFritekst(tekst: string): string { return normaliserNavn(tekst); }

export function alleWatch(): WatchRække[] { return watch; }
export function erOvervåget(term: string): boolean { return watch.some(w => w.term === term); }

export async function hentWatchlist(): Promise<WatchRække[]> {
  try {
    const { data, error } = await supabase.from('watchlist').select('id, term, label, kilde');
    if (error || !data) return watch;
    watch = data as WatchRække[];
    version++;
    return watch;
  } catch { return watch; }
}

// Tilføj en overvågning. label = pænt navn (vises i push); term udledes hvis ikke givet.
export async function tilføjWatch(label: string, term?: string, kilde = 'klokke'): Promise<boolean> {
  const t = (term ?? termFraFritekst(label)).trim();
  if (!t) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.from('watchlist')
    .upsert({ user_id: user.id, term: t, label: label.trim(), kilde }, { onConflict: 'user_id,term' })
    .select('id, term, label, kilde').single();
  if (error || !data) return false;
  if (!watch.some(w => w.term === t)) { watch = [data as WatchRække, ...watch]; version++; }
  return true;
}

export async function fjernWatch(term: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from('watchlist').delete().eq('user_id', user.id).eq('term', term);
  if (error) return false;
  watch = watch.filter(w => w.term !== term); version++;
  return true;
}
