// "Vigtighed" af en råvare — hvor meget folk faktisk bruger den. Bruges til at
// rangordne "Tilbud til dig", så hverdagsvarer (smør, mælk, æg, kød) kommer før
// nichevarer (flødeost, dessertost) — også selvom nichevaren er billigere.
//
// Score = kurateret stapel-bonus (A) + hvor ofte råvaren bruges i opskrifterne (B).
import { OPSKRIFTER } from './opskrifter';

// A) Kurateret bonus for hverdagsstapler (keyed på soeg-ord, små bogstaver).
// Specialvarer (flødeost, dessertost, burrata, osteroulade, salatost …) står
// bevidst IKKE her → de får kun deres evt. opskrifts-frekvens, altså lav score.
const STAPEL_BONUS: Record<string, number> = {
  'mælk': 10, 'maelk': 10, 'letmælk': 10, 'sødmælk': 9, 'minimælk': 9,
  'smør': 10, 'smørbar': 9, 'lurpak': 9,
  'æg': 10, 'aeg': 10, 'skrabeæg': 9,
  'kaffe': 8, 'te': 5,
  'rugbrød': 7, 'rugbroed': 7, 'toastbrød': 6, 'brød': 6, 'boller': 6,
  'kylling': 9, 'kyllingebryst': 9, 'hakket kylling': 8,
  'hakket oksekød': 9, 'oksekød': 7, 'okse': 7,
  'svinekød': 6, 'gris': 6, 'flæsk': 6, 'koteletter': 6, 'mørbrad': 5,
  'pasta': 8, 'spaghetti': 8, 'ris': 7, 'nudler': 5,
  'kartofler': 8, 'løg': 7, 'hvidløg': 6, 'gulerødder': 6, 'gulerod': 6,
  'tomat': 6, 'hakkede tomater': 6, 'broccoli': 5, 'peberfrugt': 5, 'agurk': 6, 'salat': 6,
  'ost': 7, 'revet ost': 8, 'mozzarella': 6, 'hytteost': 5,
  'yoghurt': 6, 'skyr': 6, 'creme fraiche': 5, 'fløde': 5, 'piskefløde': 5, 'madlavningsfløde': 6,
  'bacon': 6, 'pølser': 6, 'leverpostej': 6, 'skinke': 6,
  'mel': 5, 'hvedemel': 5, 'sukker': 5, 'rasp': 4, 'havregryn': 6, 'bouillon': 6,
  'laks': 6, 'tun': 5, 'fisk': 5, 'rejer': 4,
  'sodavand': 5, 'cola': 5, 'pepsi': 5, 'juice': 4, 'øl': 4,
};

// B) Optællings-frekvens fra opskrifterne (hvor mange retter bruger ordet).
const FRA_OPSKRIFTER: Record<string, number> = (() => {
  const tal: Record<string, number> = {};
  for (const o of OPSKRIFTER as any[]) {
    for (const ing of (o.ingredienser ?? [])) {
      for (const s of (ing.soeg ?? [])) {
        const k = String(s).toLowerCase();
        tal[k] = (tal[k] ?? 0) + 1;
      }
    }
  }
  return tal;
})();

// Samlet vigtighed for en vares soeg-ord (højest vindende ord tæller).
export function vigtighed(soeg: string[]): number {
  let bedst = 0;
  for (const s of soeg) {
    const k = s.toLowerCase();
    const score = (STAPEL_BONUS[k] ?? 0) + (FRA_OPSKRIFTER[k] ?? 0);
    if (score > bedst) bedst = score;
  }
  return bedst;
}
