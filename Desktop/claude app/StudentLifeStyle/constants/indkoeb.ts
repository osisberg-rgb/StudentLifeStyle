import { slåEffektivPrisOp } from './tilbudspriser';
import { alleOpskrifter } from '../lib/brugerOpskrifter';
import { IndkoebsButik } from '../types/madplan';

const KATEGORI_REGLER: Array<{ kategori: string; ord: string[] }> = [
  {
    kategori: 'Kød',
    ord: ['hakket oksekød','hakket okse','hakket grisekød','hakket grise','hakket kylling',
          'kylling','oksekød','okse','svinekød','grisekød','koteletter','medister',
          'bacon','pølser','skinke','leverpostej','bøffer'],
  },
  {
    kategori: 'Fisk',
    ord: ['tun','makrel','laks','rødspætte','fiskefileter','fiskefrikadeller'],
  },
  {
    kategori: 'Mejeri & æg',
    ord: ['mælk','maelk','yoghurt','skyr','a38','creme fraiche','cremefine',
          'madlavningsfløde','madlavningsfloede','smør','smor','lurpak',
          'ost','mozzarella','æg','aeg','hytteost','fløde','flode','piskefløde'],
  },
  {
    kategori: 'Pasta, ris & korn',
    ord: ['pasta','spaghetti','lasagne','ris','couscous','nudler','bulgur',
          'havregryn','hvedemel','rasp','sukker'],
  },
  {
    kategori: 'Grøntsager',
    ord: ['kartofler','søde kartofler','gulerødder','gulerodder','løg','log',
          'hvidløg','hvidlog','broccoli','blomkål','blomkal','champignon',
          'peberfrugt','spinat','squash','ærter','aerter','grøntsag','frosne','frossen'],
  },
  {
    kategori: 'Dåse & konserves',
    ord: ['hakkede tomater','dåsetomater','flåede tomater','passata','tomatpuré',
          'tomatpure','kidneybønner','kidneybonner','sorte bønner','sorte bonner',
          'kikærter','kikaerter','linser','kokosmælk','kokosmilk','bouillon'],
  },
  {
    kategori: 'Brød',
    ord: ['rugbrød','rugbroed','toastbrød','toastbroed','tortilla','pitabrød','pitabroed'],
  },
  {
    kategori: 'Drikkevarer',
    ord: ['sodavand','cola','pepsi','fanta','sprite','juice','saft','øl','oel','vand',
          'energidrik','squash juice','iste','smoothie','danskvand','kildevand'],
  },
];

export const KATEGORI_ORDEN = [
  'Kød', 'Fisk', 'Mejeri & æg', 'Pasta, ris & korn',
  'Grøntsager', 'Dåse & konserves', 'Brød', 'Drikkevarer', 'Andet',
];

// Emoji pr. kategori — delt kilde for indkøbsliste, forside og tilbuds-browser.
export const KATEGORI_EMOJI: Record<string, string> = {
  'Kød': '🥩',
  'Fisk': '🐟',
  'Mejeri & æg': '🥛',
  'Pasta, ris & korn': '🍝',
  'Grøntsager': '🥦',
  'Dåse & konserves': '🥫',
  'Brød': '🍞',
  'Drikkevarer': '🥤',
  'Andet': '🏷️',
};

export function kategoriserIngrediens(ing: { navn: string; soeg?: string[] }): string {
  const tekst = [ing.navn ?? '', ...(ing.soeg ?? [])]
    .map((s: string) => s.toLowerCase())
    .join(' ');
  for (const { kategori, ord } of KATEGORI_REGLER) {
    if (ord.some(o => tekst.includes(o))) return kategori;
  }
  return 'Andet';
}

// Skalering: en opskrift er skrevet til `portioner` personer og bruger ca.
// 1 pakke af hver vare. Behovet måles i pakke-andele (personer / portioner),
// aggregeres på tværs af retter, og rundes op til hele pakker til sidst —
// man kan ikke købe en halv dåse. To retter der hver bruger en halv pakke
// pasta deler altså én pakke.
// Mængder der er KØKKENMÅL (man bruger lidt af en pakke) — her giver det ingen
// mening at sætte fx "2 spsk", "2 dl", "3 skiver" eller "1,2 L" på indkøbslisten;
// man køber en hel pakke. Disse varer vises som "1 pakke" (× antal hvis der
// skal bruges mere end én pakke).
const KØKKENMÅL_RE =
  /(^|[\s\d.,/½¼¾-])(spsk|spk|tsk|knivspids|skiver?|liter|ltr|dråber?|dl|cl|ml|fed|nip|l)\b/i;
function erKøkkenmål(maengde: string): boolean {
  return KØKKENMÅL_RE.test(maengde ?? '');
}

// HARDKODEDE varer hvor opskriftens mål er MISVISENDE på en indkøbsliste:
// varen sælges i hele pakker, og opskriftens enhed passer ikke til pakken.
// Fx skrives bouillon ofte som "2 dl bouillon", men man køber terninger/stykker
// — ikke dL; havregryn skrives i dl/g, men købes i én pose. Disse vises derfor
// bare som "1 pakke" (uden "eller <mængde>"). Tilføj nye varer i listen her.
// Varer der ALTID købes som en hel pakke, og hvor opskriftens mål er misvisende
// på en indkøbsliste (man køber ikke "2 dl bouillon" eller "1 dl havregryn").
// Matchningen ser på hvert ORD i varenavnet og rammer også sammensatte ord der
// ENDER på et af disse (fx "grøntsagsbouillon", "hvedemel", "rørsukker") — men
// IKKE hvor ordet kun er forstavelsen (fx "sukkerærter" matcher ikke "sukker").
// Tilføj nye hel-pakke-varer i listen her.
const HEL_PAKKE_ORD = [
  // bagning & tørvarer
  'havregryn', 'gryn', 'mel', 'melis', 'sukker', 'rasp', 'kakao', 'bagepulver', 'natron', 'gær', 'gaer',
  // ris, pasta & korn (købes i poser, ikke løst efter mål)
  'ris', 'pasta', 'spaghetti', 'nudler', 'couscous', 'bulgur',
  // smagsgivere & nødder
  'bouillon', 'buljong', 'salt', 'krydderi', 'krydderier', 'mandler', 'nødder', 'noedder', 'chokolade',
];
function ordINavn(navn: string): string[] {
  return (navn ?? '').toLowerCase().split(/[^a-zæøå0-9]+/).filter(Boolean);
}
function erHelPakke(navn: string): boolean {
  return ordINavn(navn).some(w => HEL_PAKKE_ORD.some(s => w.endsWith(s)));
}
// Bouillon sælges i terninger/stykker — ikke dL — så den får sin egen tekst.
function erBouillon(navn: string): boolean {
  return ordINavn(navn).some(w => w.endsWith('bouillon') || w.endsWith('buljong'));
}

// Hvad der står under en vare på indkøbslisten. Bouillon vises som "1 pakke
// (terninger)"; andre hel-pakke-varer (havregryn, mel, sukker …) som "1 pakke";
// andre køkkenmål (spsk/dl/skiver …) som "1 pakke eller <mængde>"; almindelige
// mængder (fx "500 g") uændret. Bruges af BÅDE bygIndkøbsliste og den enkeltvise
// "Tilføj til indkøbsliste" (OpskriftModal), så listen ser ens ud overalt.
export function pakkeTekst(navn: string, maengde: string): string {
  if (erBouillon(navn)) return '1 pakke (terninger)';
  if (erHelPakke(navn)) return '1 pakke';
  if (erKøkkenmål(maengde)) return `1 pakke eller ${maengde}`;
  return maengde ?? '';
}

export function bygIndkøbsliste(
  opskriftIds: string[],
  butikker?: string[],
  personer?: number,
): IndkoebsButik[] {
  const retter = alleOpskrifter().filter(o => opskriftIds.includes(o.id));
  const kategorier = new Map<string, Map<string, {
    navn: string; pris: number; normalpris: number; paaTilbud: boolean;
    butik: string | null; maengde: string; behov: number;
  }>>();

  for (const ret of retter) {
    const faktor = personer ? personer / (ret.portioner || 4) : 1;
    for (const ing of ret.ingredienser as any[]) {
      if (ing.estimeret && ing.estimereretPris === 0) continue;

      const kategori = kategoriserIngrediens(ing);
      if (!kategorier.has(kategori)) kategorier.set(kategori, new Map());

      const varerMap = kategorier.get(kategori)!;
      const nøgle = ing.navn.toLowerCase();
      const effektiv = slåEffektivPrisOp(ing, butikker);

      if (varerMap.has(nøgle)) {
        varerMap.get(nøgle)!.behov += faktor;
      } else {
        varerMap.set(nøgle, {
          navn: ing.navn,
          pris: effektiv.pris,
          normalpris: effektiv.normalpris,
          paaTilbud: effektiv.paaTilbud,
          butik: effektiv.butik,
          maengde: ing.maengde,
          behov: faktor,
        });
      }
    }
  }

  const result: IndkoebsButik[] = [];

  for (const kategoriNavn of KATEGORI_ORDEN) {
    const varerMap = kategorier.get(kategoriNavn);
    if (!varerMap || varerMap.size === 0) continue;

    const varerListe = Array.from(varerMap.values()).map(v => {
      // Køkkenmål (spsk/dl/skiver/L …) vises som "1 pakke"; ellers den reelle
      // mængde. Antal pakker følger behovet (minimum 1) i begge tilfælde.
      const pakker = Math.max(1, Math.ceil(v.behov - 1e-9));
      return {
        vare: v.navn,
        antal_pakker: pakker,
        pakkestoerrelse: pakkeTekst(v.navn, v.maengde),
        pris: Math.round(v.pris * pakker),
        normalpris: Math.round(v.normalpris * pakker),
        paa_tilbud: v.paaTilbud,
        butik: v.butik,
        checked: false,
      };
    });

    const subtotal = varerListe.reduce((s, v) => s + v.pris, 0);
    result.push({ butik: kategoriNavn, subtotal: Math.round(subtotal), varer: varerListe });
  }

  return result;
}

// Samlet tilbuds-besparelse: hvad listen ville koste til normalpriser minus
// hvad den koster med tilbud. Bruges til "Du sparer i denne uge".
export function beregnBesparelse(liste: IndkoebsButik[]): number {
  let spar = 0;
  for (const sektion of liste) {
    for (const v of sektion.varer) {
      if (v.paa_tilbud && v.normalpris != null) spar += v.normalpris - v.pris;
    }
  }
  return Math.round(spar);
}
