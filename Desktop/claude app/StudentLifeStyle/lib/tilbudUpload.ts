// Admin-upload af tilbudsaviser: upload PDF'er til Storage `inbox/`, opret
// `tilbud_import_job`-rækker, og kald edge-funktionen start-tilbud-import der
// affyrer GitHub Action'en. hentJobStatus() bruges til at polle fremdrift.
import { supabase } from './supabase';

export type ButikValg = 'Netto' | 'Rema 1000' | 'Føtex' | 'SuperBrugsen' | 'Bilka';

// slug bruges i Storage-filnavne og MÅ matche de eksisterende (netto/rema1000/fotex).
export const BUTIK_SLUG: Record<ButikValg, string> = {
  'Netto': 'netto',
  'Rema 1000': 'rema1000',
  'Føtex': 'fotex',
  'SuperBrugsen': 'superbrugsen',
  'Bilka': 'bilka',
};

export const ALLE_BUTIK_VALG: ButikValg[] = ['Netto', 'Rema 1000', 'Føtex', 'SuperBrugsen', 'Bilka'];

export type UploadFil = { uri: string; navn: string; butik: ButikValg };

export type JobStatus = {
  id: string; butik: string; slug: string; uge: number;
  status: 'afventer' | 'kører' | 'færdig' | 'fejl'; antal: number; fejl: string | null;
};

// Samme uge-formel som appens getWeekNumber() (IKKE ISO).
export function aktuelUge(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
}

// Gæt butik ud fra filnavnet (bekvemmelighed — kan altid rettes i UI'et).
export function gætButik(filnavn: string): ButikValg {
  const n = filnavn.toLowerCase();
  if (n.includes('rema')) return 'Rema 1000';
  if (n.includes('føtex') || n.includes('fotex')) return 'Føtex';
  if (n.includes('brugsen')) return 'SuperBrugsen';
  if (n.includes('bilka')) return 'Bilka';
  return 'Netto';
}

// Upload hver PDF til inbox, opret job-rækker, og start sky-importen.
export async function uploadOgStart(filer: UploadFil[], uge: number): Promise<{ ok: boolean; fejl?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, fejl: 'Du er ikke logget ind' };

  const jobs: { slug: string; butik: string; sti: string }[] = [];
  for (const f of filer) {
    const slug = BUTIK_SLUG[f.butik];
    const sti = `inbox/${slug}-uge${uge}.pdf`;

    // Læs den lokale fil som ArrayBuffer (undgår RN's tomme-Blob-problem).
    const arrayBuffer = await (await fetch(f.uri)).arrayBuffer();
    const up = await supabase.storage.from('tilbudsaviser')
      .upload(sti, arrayBuffer, { contentType: 'application/pdf', upsert: true });
    if (up.error) return { ok: false, fejl: `Upload fejlede (${f.butik}): ${up.error.message}` };

    const ins = await supabase.from('tilbud_import_job').upsert({
      id: `${slug}-uge${uge}`, user_id: user.id, butik: f.butik, slug, uge,
      status: 'afventer', antal: 0, fejl: null,
    }, { onConflict: 'id' });
    if (ins.error) return { ok: false, fejl: `Kunne ikke oprette job (${f.butik}): ${ins.error.message}` };

    jobs.push({ slug, butik: f.butik, sti });
  }

  const { error } = await supabase.functions.invoke('start-tilbud-import', { body: { uge, jobs } });
  if (error) return { ok: false, fejl: `Kunne ikke starte sky-import: ${error.message}` };
  return { ok: true };
}

export async function hentJobStatus(uge: number, slugs: string[]): Promise<JobStatus[]> {
  const ids = slugs.map(s => `${s}-uge${uge}`);
  const { data } = await supabase.from('tilbud_import_job')
    .select('id, butik, slug, uge, status, antal, fejl')
    .in('id', ids);
  return (data ?? []) as JobStatus[];
}
