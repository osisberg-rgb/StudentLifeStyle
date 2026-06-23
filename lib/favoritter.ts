// Brugerens favorit-opskrifter — hentes ved opstart og holdes i en in-memory
// store, så de kan slås op synkront (erFavorit) i vælgeren og opskrift-
// visningen. Bakkes af Supabase-tabellen `favoritter` (per bruger, RLS).
import { supabase } from './supabase';

let favoritter = new Set<string>();

// Bumpes ved hver ændring — så caches/filtre kan opdage nye favoritter
let version = 0;
export function favoritterVersion(): number {
  return version;
}

export function erFavorit(opskriftId: string): boolean {
  return favoritter.has(opskriftId);
}

export function alleFavoritter(): string[] {
  return [...favoritter];
}

// Hent favoritter ind i storen. Fejler det (ingen tabel, offline, ikke logget
// ind) røres storen ikke — appen virker uændret uden favoritter.
export async function hentFavoritter(): Promise<void> {
  try {
    const { data, error } = await supabase.from('favoritter').select('opskrift_id');
    if (error || !data) return;
    favoritter = new Set(data.map(r => r.opskrift_id as string));
    version++;
  } catch {
    /* netværksfejl o.l. — behold nuværende store */
  }
}

// Slå favorit til/fra. Opdaterer storen optimistisk-venligt: kalderen kan
// vise det med det samme, og rulle tilbage hvis denne returnerer false.
export async function sætFavorit(opskriftId: string, favorit: boolean): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  if (favorit) {
    const { error } = await supabase
      .from('favoritter')
      .upsert({ user_id: user.id, opskrift_id: opskriftId }, { onConflict: 'user_id,opskrift_id' });
    if (error) return false;
    favoritter.add(opskriftId);
  } else {
    const { error } = await supabase
      .from('favoritter')
      .delete()
      .eq('user_id', user.id)
      .eq('opskrift_id', opskriftId);
    if (error) return false;
    favoritter.delete(opskriftId);
  }
  version++;
  return true;
}
