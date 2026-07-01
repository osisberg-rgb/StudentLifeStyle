// Delt logik for at lægge varer i indkøbslisten — bruges fra Indkøb-fanens
// "+ Tilføj vare"-ark, forsidens "Se alle tilbud"-browser OG opskrift-modalens
// "Tilføj til indkøbsliste", så alle veje grupperer ens.
//
// Listen er grupperet i KATEGORIER (Kød, Fisk, Grønt …) — samme model som
// bygIndkøbsliste. Sektionens `butik`-felt bærer kategori-navnet; den enkelte
// vares `butik` bærer butikken (kun sat når varen er på tilbud) og vises som
// farvet butiks-badge på selve varen.
import { supabase, sikrProfilRad } from './supabase';
import { IndkoebsButik, IndkoebsVare } from '../types/madplan';
import { kategoriserIngrediens, KATEGORI_ORDEN } from '../constants/indkoeb';

export type TilbudInput = { butik: string; navn: string; pris: number; soeg?: string[]; maengde?: string };

// Sortér sektioner i fast kategori-rækkefølge (ukendte kategorier sidst)
function sortérSektioner(liste: IndkoebsButik[]): IndkoebsButik[] {
  const rang = (k: string) => {
    const i = KATEGORI_ORDEN.indexOf(k);
    return i === -1 ? 999 : i;
  };
  return [...liste].sort((a, b) => rang(a.butik) - rang(b.butik));
}

// Ren funktion: flet én færdig vare ind under sin kategori-sektion. Finder/
// opretter sektionen, springer dubletter over (samme varenavn). Returnerer en
// NY liste (muterer ikke input) + om noget faktisk blev tilføjet. `soeg` giver
// mere præcis kategorisering når den findes (fx fra et tilbud).
export function fletVareIListe(
  liste: IndkoebsButik[],
  vare: IndkoebsVare,
  soeg?: string[],
): { liste: IndkoebsButik[]; tilføjet: boolean } {
  const kategori = kategoriserIngrediens({ navn: vare.vare, soeg });
  const ny = liste.map(s => ({ ...s, varer: [...s.varer] }));
  let sektion = ny.find(s => s.butik === kategori);
  if (sektion && sektion.varer.some(v => v.vare.toLowerCase() === vare.vare.toLowerCase())) {
    return { liste, tilføjet: false };
  }
  if (!sektion) {
    sektion = { butik: kategori, subtotal: 0, varer: [] };
    ny.push(sektion);
  }
  sektion.varer.push(vare);
  sektion.subtotal = (sektion.subtotal ?? 0) + (vare.pris ?? 0);
  return { liste: sortérSektioner(ny), tilføjet: true };
}

// Flet et enkelt tilbud ind (fra + arket / browseren). Tilbuddet er pr.
// definition på tilbud, og dets butik gemmes på varen som badge.
export function fletTilbudIListe(
  liste: IndkoebsButik[],
  t: TilbudInput,
): { liste: IndkoebsButik[]; tilføjet: boolean } {
  const nyVare: IndkoebsVare = {
    vare: t.navn,
    antal_pakker: 1,
    // Tilbuddets pakkestørrelse (fx "500 g") vises under navnet på listen — som
    // for opskrift-varer. Mangler den (fx hardkodede tilbud uden maengde), bliver
    // den tom, og kun navnet vises.
    pakkestoerrelse: t.maengde ?? '',
    pris: t.pris,
    paa_tilbud: true,
    butik: t.butik,
    checked: false,
  };
  return fletVareIListe(liste, nyVare, t.soeg);
}

// Flet en fri vare ind (skrevet manuelt, ikke fundet på tilbud). Ingen butik,
// ingen pris, paa_tilbud: false — men kategoriseres som alle andre, så den
// lander under den rigtige sektion på listen.
export function fletFriVareIListe(
  liste: IndkoebsButik[],
  navn: string,
): { liste: IndkoebsButik[]; tilføjet: boolean } {
  const rent = navn.trim();
  if (!rent) return { liste, tilføjet: false };
  const nyVare: IndkoebsVare = {
    vare: rent,
    antal_pakker: 1,
    pakkestoerrelse: '',
    pris: 0,
    paa_tilbud: false,
    butik: null,
    checked: false,
  };
  return fletVareIListe(liste, nyVare);
}

// Async: hent ugens plan, flet tilbuddet ind og gem. Upsert opretter rækken
// hvis ugen ikke har en plan endnu — så man kan handle manuelt uden først at
// generere en madplan. Bruges fra forsidens tilbuds-browser (uden indlæst liste).
export async function tilføjTilbudTilUge(
  t: TilbudInput,
  ugeNr: number,
): Promise<'tilføjet' | 'findes' | 'fejl'> {
  try {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return 'fejl';

    const { data: row } = await supabase
      .from('madplaner')
      .select('plan')
      .eq('uge_nr', ugeNr)
      .maybeSingle();

    const plan = row?.plan ?? { uge: ugeNr, indkoebsliste: [] };
    const eksisterende: IndkoebsButik[] = plan.indkoebsliste ?? [];
    const { liste, tilføjet } = fletTilbudIListe(eksisterende, t);
    if (!tilføjet) return 'findes';

    const nyPlan = { ...plan, indkoebsliste: liste };
    await sikrProfilRad(u.id);
    const { error } = await supabase.from('madplaner').upsert(
      { user_id: u.id, uge_nr: ugeNr, plan: nyPlan },
      { onConflict: 'user_id,uge_nr' }
    );
    return error ? 'fejl' : 'tilføjet';
  } catch {
    return 'fejl';
  }
}
