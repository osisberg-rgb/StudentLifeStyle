// Brugerens importerede opskrifter — hentes fra Supabase ved opstart og holdes
// i en in-memory store, så de kan slås op SYNKRONT overalt (præcis som de
// hardkodede tilbudsfiler overlejres af DB'en i tilbudspriser.ts).
//
// alleOpskrifter() = statiske OPSKRIFTER + brugerens importerede.
// findOpskrift(id) bruges alle de steder der før slog op direkte i OPSKRIFTER,
// så importerede opskrifter får tilbuds-badges, priser, kan lægges på en dag osv.
import { supabase } from './supabase';
import { OPSKRIFTER } from '../constants/opskrifter';
import { gætSoeg } from '../constants/basispriser';
import type { Opskrift } from '../types/opskrift';

// Udfyld manglende søgeord på ingredienser ud fra navnet, så frit skrevne ELLER
// importerede varer (som edge-funktionen ikke kunne tagge) bliver synlige for
// pris- og tilbuds-motoren. Eksisterende soeg bevares, så et tilbuds-match aldrig
// går tabt ved en redigering. Kører ét sted, så ALLE gem-veje får gavn af den.
function medGættedeSoeg(ingredienser: Opskrift['ingredienser']): Opskrift['ingredienser'] {
  return (ingredienser ?? []).map(i => {
    if (i.soeg && i.soeg.length > 0) return i;
    const gæt = gætSoeg(i.navn ?? '');
    return gæt.length > 0 ? { ...i, soeg: gæt } : i;
  });
}

// De statiske opskrifter opfylder strukturelt Opskrift-typen (ekstra felter
// som kategori: "aftensmad" er harmløse). Castet samles ét sted her.
const STATISKE = OPSKRIFTER as unknown as Opskrift[];

let importerede: Opskrift[] = [];

// Bumpes hver gang storen ændrer sig — bruges af caches (fx opskriftPriser)
// til at invalidere sig selv, så en nyimporteret opskrift straks får en pris.
let version = 0;
export function opskrifterVersion(): number {
  return version;
}

export function alleOpskrifter(): Opskrift[] {
  return importerede.length ? [...STATISKE, ...importerede] : STATISKE;
}

export function findOpskrift(id: string): Opskrift | undefined {
  return findIListe(STATISKE, id) ?? findIListe(importerede, id);
}

export function brugerOpskrifter(): Opskrift[] {
  return importerede;
}

function findIListe(liste: Opskrift[], id: string): Opskrift | undefined {
  return liste.find(o => o.id === id);
}

// En DB-række → Opskrift. jsonb-felter kommer allerede som objekter.
function rækkeTilOpskrift(r: any): Opskrift {
  return {
    id: r.id,
    navn: r.navn,
    koed: r.koed ?? 'Alt',
    portioner: r.portioner ?? 4,
    minutter: r.minutter ?? undefined,
    kategorier: r.kategorier ?? [],
    ingredienser: Array.isArray(r.ingredienser) ? r.ingredienser : [],
    fremgangsmaade: Array.isArray(r.fremgangsmaade) ? r.fremgangsmaade : [],
    billede_url: r.billede_url ?? null,
    kilde_url: r.kilde_url ?? null,
    kilde_navn: r.kilde_navn ?? null,
    importeret: true,
  };
}

// Hent brugerens importerede opskrifter og læg dem i storen. Fejler det
// (ingen tabel, offline, ikke logget ind) røres storen ikke — appen virker
// uændret med kun de statiske opskrifter.
export async function hentBrugerOpskrifter(): Promise<Opskrift[]> {
  try {
    const { data, error } = await supabase
      .from('bruger_opskrifter')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return importerede;
    importerede = data.map(rækkeTilOpskrift);
    version++;
    return importerede;
  } catch {
    return importerede;
  }
}

export function nyOpskriftId(): string {
  return `bruger-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Felterne edge-funktionen importer-opskrift returnerer (efter brugerens
// evt. rettelser i preview).
export type ImporteretOpskrift = {
  navn: string;
  koed?: string;
  portioner?: number;
  minutter?: number;
  kategorier?: string[];
  billede_url?: string | null;
  kilde_url?: string | null;
  kilde_navn?: string | null;
  ingredienser: Opskrift['ingredienser'];
  fremgangsmaade: string[];
};

// Gem en importeret opskrift i Supabase og læg den forrest i storen, så den
// straks er tilgængelig i vælgeren. Returnerer den gemte opskrift (med id).
export async function gemBrugerOpskrift(
  input: ImporteretOpskrift,
): Promise<Opskrift | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const id = nyOpskriftId();
  const række = {
    id,
    user_id: user.id,
    navn: input.navn,
    koed: input.koed ?? 'Alt',
    portioner: input.portioner ?? 4,
    minutter: input.minutter ?? null,
    kategorier: input.kategorier ?? [],
    billede_url: input.billede_url ?? null,
    kilde_url: input.kilde_url ?? null,
    kilde_navn: input.kilde_navn ?? null,
    ingredienser: medGættedeSoeg(input.ingredienser ?? []),
    fremgangsmaade: input.fremgangsmaade ?? [],
  };

  const { error } = await supabase.from('bruger_opskrifter').insert(række);
  if (error) {
    console.error('gemBrugerOpskrift fejl:', error.message);
    return null;
  }

  const opskrift = rækkeTilOpskrift(række);
  importerede = [opskrift, ...importerede];
  version++;
  return opskrift;
}

// Felter brugeren selv kan rette i en egen opskrift. soeg-ord/priser på de
// eksisterende ingredienser bevares af kalderen (kun navn+maengde redigeres),
// så tilbuds-matchet ikke går tabt.
export type OpskriftRettelse = {
  navn: string;
  koed: string;
  portioner: number;
  minutter?: number | null;
  kategorier: string[];
  ingredienser: Opskrift['ingredienser'];
  fremgangsmaade: string[];
};

// Gem brugerens rettelser i Supabase og opdatér storen, så ændringen straks
// slår igennem i vælger, plan og indkøbsliste. Kun importerede opskrifter kan
// redigeres (RLS sikrer at man kun rører sine egne rækker).
export async function opdaterBrugerOpskrift(
  id: string,
  rettelse: OpskriftRettelse,
): Promise<Opskrift | null> {
  const opdatering = {
    navn: rettelse.navn,
    koed: rettelse.koed,
    portioner: rettelse.portioner,
    minutter: rettelse.minutter ?? null,
    kategorier: rettelse.kategorier,
    ingredienser: medGættedeSoeg(rettelse.ingredienser),
    fremgangsmaade: rettelse.fremgangsmaade,
  };

  const { error } = await supabase
    .from('bruger_opskrifter')
    .update(opdatering)
    .eq('id', id);
  if (error) {
    console.error('opdaterBrugerOpskrift fejl:', error.message);
    return null;
  }

  let opdateret: Opskrift | null = null;
  importerede = importerede.map(o => {
    if (o.id !== id) return o;
    opdateret = { ...o, ...opdatering, minutter: opdatering.minutter ?? undefined };
    return opdateret;
  });
  version++;
  return opdateret;
}

export async function sletBrugerOpskrift(id: string): Promise<boolean> {
  const { error } = await supabase.from('bruger_opskrifter').delete().eq('id', id);
  if (error) return false;
  importerede = importerede.filter(o => o.id !== id);
  version++;
  return true;
}
