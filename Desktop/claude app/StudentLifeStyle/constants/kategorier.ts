// Kategorierne i "Vælg retter" — bruges som filter-chips ved siden af
// Alle / Favoritter / Dine opskrifter.
//
// SÅDAN TAGGER DU EN OPSKRIFT (i supabase/functions/dynamic-action/opskrifter.ts):
//   Tilføj/ret kategorier-linjen lige under id, fx:
//     kategorier: ["suppe"],
//     kategorier: ["salat"],
//   Rettesnor:
//   - suppe:    retter der spises som suppe
//   - salat:    retter der spises som salat
//   - broed:    brød, boller, focaccia, pølsehorn osv.
//   - dessert:  desserter, kager, søde retter osv.
//   Alt der IKKE er tagget suppe, salat, broed eller dessert vises automatisk
//   under "Aftensmad". (En ret må gerne have flere tags.)

export type KategoriId =
  | 'aftensmad'
  | 'suppe'
  | 'salat'
  | 'broed'
  | 'dessert';

export const KATEGORIER: Array<{ id: KategoriId; navn: string; emoji: string }> = [
  { id: 'aftensmad', navn: 'Aftensmad', emoji: '🍽️' },
  { id: 'suppe',     navn: 'Suppe',     emoji: '🥣' },
  { id: 'salat',     navn: 'Salater',   emoji: '🥗' },
  { id: 'broed',     navn: 'Brød',      emoji: '🍞' },
  { id: 'dessert',   navn: 'Desserter', emoji: '🍰' },
];
