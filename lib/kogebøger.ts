// Brugerens kogebøger + medlemskab (hvilken opskrift ligger i hvilken kogebog).
// Hentes ved opstart og holdes i en in-memory store, så opslag er SYNKRONE i
// vælgeren (samme mønster som lib/favoritter.ts). Bakkes af Supabase-tabellerne
// kogeboeger + kogebog_medlemskab (per bruger, RLS). Én kogebog pr. opskrift.
import { supabase } from './supabase';

export type Kogebog = { id: string; navn: string; emoji: string };

let kogeboegerStore: Kogebog[] = [];
// opskrift_id -> kogebog_id
let medlemskab = new Map<string, string>();

// Bumpes ved hver ændring — så grids/filtre kan opdage nye kogebøger/medlemskaber
let version = 0;
export function kogebøgerVersion(): number {
  return version;
}

export function kogebøger(): Kogebog[] {
  return kogeboegerStore;
}

export function kogebogForOpskrift(opskriftId: string): Kogebog | undefined {
  const id = medlemskab.get(opskriftId);
  return id ? kogeboegerStore.find(k => k.id === id) : undefined;
}

export function opskrifterIKogebog(kogebogId: string): string[] {
  const ud: string[] = [];
  medlemskab.forEach((kid, oid) => { if (kid === kogebogId) ud.push(oid); });
  return ud;
}

export function antalIKogebog(kogebogId: string): number {
  let n = 0;
  medlemskab.forEach(kid => { if (kid === kogebogId) n++; });
  return n;
}

export function nyKogebogId(): string {
  return `kogebog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Hent kogebøgerne ind i storen. Fejler det (ingen tabel, offline, ikke logget
// ind) røres storen ikke — appen virker uændret uden kogebøger.
export async function hentKogebøger(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('kogeboeger')
      .select('id, navn, emoji')
      .order('created_at', { ascending: true });
    if (error || !data) return;
    kogeboegerStore = data.map(r => ({
      id: r.id as string,
      navn: r.navn as string,
      emoji: (r.emoji as string) ?? '📕',
    }));
    version++;
  } catch {
    /* netværksfejl o.l. — behold nuværende store */
  }
}

export async function hentMedlemskaber(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('kogebog_medlemskab')
      .select('opskrift_id, kogebog_id')
      // Indsætnings-rækkefølge: så opskrifterIKogebog() (og dermed kogebogs-
      // grid'et) viser opskrifterne i den rækkefølge de blev lagt ind.
      .order('created_at', { ascending: true });
    if (error || !data) return;
    medlemskab = new Map(data.map(r => [r.opskrift_id as string, r.kogebog_id as string]));
    version++;
  } catch {
    /* behold nuværende store */
  }
}

export async function opretKogebog(navn: string, emoji = '📕'): Promise<Kogebog | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const id = nyKogebogId();
  const { error } = await supabase
    .from('kogeboeger')
    .insert({ id, user_id: user.id, navn, emoji });
  if (error) {
    console.error('opretKogebog fejl:', error.message);
    return null;
  }
  const k: Kogebog = { id, navn, emoji };
  kogeboegerStore = [...kogeboegerStore, k];
  version++;
  return k;
}

export async function omdøbKogebog(id: string, navn: string): Promise<boolean> {
  const { error } = await supabase.from('kogeboeger').update({ navn }).eq('id', id);
  if (error) return false;
  kogeboegerStore = kogeboegerStore.map(k => (k.id === id ? { ...k, navn } : k));
  version++;
  return true;
}

export async function sletKogebog(id: string): Promise<boolean> {
  // on delete cascade rydder medlemskaberne i DB; vi rydder også den lokale map.
  const { error } = await supabase.from('kogeboeger').delete().eq('id', id);
  if (error) return false;
  kogeboegerStore = kogeboegerStore.filter(k => k.id !== id);
  medlemskab.forEach((kid, oid) => { if (kid === id) medlemskab.delete(oid); });
  version++;
  return true;
}

// Sæt (eller fjern, ved kogebogId=null) hvilken kogebog en opskrift ligger i.
// Upsert på (user_id, opskrift_id) håndhæver "én kogebog pr. opskrift" — at
// flytte er bare at overskrive kogebog_id.
export async function sætKogebogForOpskrift(
  opskriftId: string,
  kogebogId: string | null,
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  if (kogebogId === null) {
    const { error } = await supabase
      .from('kogebog_medlemskab')
      .delete()
      .eq('user_id', user.id)
      .eq('opskrift_id', opskriftId);
    if (error) return false;
    medlemskab.delete(opskriftId);
  } else {
    const { error } = await supabase
      .from('kogebog_medlemskab')
      .upsert(
        { user_id: user.id, opskrift_id: opskriftId, kogebog_id: kogebogId },
        { onConflict: 'user_id,opskrift_id' },
      );
    if (error) return false;
    medlemskab.set(opskriftId, kogebogId);
  }
  version++;
  return true;
}
