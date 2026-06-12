import { OPSKRIFTER } from './opskrifter';
import { slåEffektivPrisOp } from './tilbudspriser';
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
];

const KATEGORI_ORDEN = [
  'Kød', 'Fisk', 'Mejeri & æg', 'Pasta, ris & korn',
  'Grøntsager', 'Dåse & konserves', 'Brød', 'Andet',
];

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
export function bygIndkøbsliste(
  opskriftIds: string[],
  butikker?: string[],
  personer?: number,
): IndkoebsButik[] {
  const retter = OPSKRIFTER.filter(o => opskriftIds.includes(o.id));
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
      const pakker = Math.max(1, Math.ceil(v.behov - 1e-9));
      return {
        vare: v.navn,
        antal_pakker: pakker,
        pakkestoerrelse: v.maengde,
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
