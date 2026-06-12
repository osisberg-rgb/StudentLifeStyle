// De 5 kategorier i "Vælg retter" — bruges som filter-chips.
//
// SÅDAN TAGGER DU EN NY OPSKRIFT (i supabase/functions/dynamic-action/opskrifter.ts):
//   Tilføj en kategorier-linje lige under id, fx:
//     kategorier: ["billig-hurtig", "hverdag"],
//   En ret må have 1-3 kategorier. Rettesnor:
//   - billig:         KUN de billigste retter — ca. ≤13 kr/portion
//   - fitness:        magert protein (kylling/okse/æg/fisk) + ris/kartofler/grønt
//   - boernefavorit:  pasta, kødsovs, tortilla, pølser, panering, ost
//   - hverdag:        nem OG hurtig — én gryde/pande, få trin, ingen finesser
//   - storportion:    gryderetter og fade der mætter mange / giver rester

export type KategoriId =
  | 'billig'
  | 'fitness'
  | 'boernefavorit'
  | 'hverdag'
  | 'storportion';

export const KATEGORIER: Array<{ id: KategoriId; navn: string; emoji: string }> = [
  { id: 'billig',        navn: 'Billigt',                emoji: '💸' },
  { id: 'fitness',       navn: 'Fitness mad',            emoji: '💪' },
  { id: 'boernefavorit', navn: 'Børnefavoritter',        emoji: '🧒' },
  { id: 'hverdag',       navn: 'Nem & hurtig hverdag',   emoji: '🍳' },
  { id: 'storportion',   navn: 'Store portioner',        emoji: '🍲' },
];
