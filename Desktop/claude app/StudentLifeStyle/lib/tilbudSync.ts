// Synkroniserer ugens tilbud fra Supabase-tabellen `tilbud` ind i prismotoren.
// Tabellen kan opdateres live (dashboard, script eller senere en API-sync mod
// Tjek/effectmanager/Salling) — alle brugere får nye tilbud uden app-redeploy.
//
// Robusthed: fejler hentningen, eller er tabellen tom, røres motoren ikke —
// den bruger de hardkodede fallback-filer (constants/tilbud/*.ts). Appen
// virker derfor uændret, indtil tabellen er oprettet og fyldt.
import { supabase } from './supabase';
import { sætTilbudskilder } from '../constants/tilbudspriser';
import { grupperTilbud } from './tilbudGrupper';
import type { TilbudRække } from './tilbudGrupper';

export { grupperTilbud } from './tilbudGrupper';

let sidsteSync = 0;
const SYNK_INTERVAL_MS = 5 * 60 * 1000; // højst hvert 5. minut, med mindre force

export async function synkroniserTilbud(force = false): Promise<boolean> {
  if (!force && Date.now() - sidsteSync < SYNK_INTERVAL_MS) return false;
  sidsteSync = Date.now();
  try {
    const { data, error } = await supabase
      .from('tilbud')
      .select('butik, uge, navn, soeg, pris');

    // Fejl eller tom tabel → behold de hardkodede fallback-filer
    if (error || !data || data.length === 0) return false;

    const kilder = grupperTilbud(data as TilbudRække[]);
    if (kilder.length === 0) return false;

    sætTilbudskilder(kilder);
    return true;
  } catch {
    return false; // netværksfejl o.l. — fallback til filerne
  }
}
