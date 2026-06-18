// "Mine varer" — brugerens watchlist til "Tilbud til dig" på forsiden.
// Hver vare gemmes som sit LABEL i profiles.watch_items; matchningen mod ugens
// tilbud sker via `termer` (søgeord der findes i tilbuddenes navn/soeg).
export type MinVareValg = { label: string; emoji: string; termer: string[] };

export const MINE_VARER_VALG: MinVareValg[] = [
  { label: 'Oksekød',       emoji: '🥩', termer: ['okse'] },
  { label: 'Kylling',       emoji: '🐔', termer: ['kylling'] },
  { label: 'Svinekød',      emoji: '🐷', termer: ['gris', 'svin', 'flæsk', 'kotelet', 'mørbrad'] },
  { label: 'Fisk',          emoji: '🐟', termer: ['laks', 'tun', 'fisk', 'torsk', 'rejer', 'sej'] },
  { label: 'Ost',           emoji: '🧀', termer: ['ost'] },
  { label: 'Mejeri & æg',   emoji: '🥛', termer: ['mælk', 'yoghurt', 'smør', 'fløde', 'skyr', 'æg', 'creme fraiche'] },
  { label: 'Pasta & ris',   emoji: '🍝', termer: ['pasta', 'ris', 'nudler', 'spaghetti'] },
  { label: 'Brød',          emoji: '🥖', termer: ['brød', 'rugbrød', 'boller', 'knækbrød'] },
  { label: 'Grønt',         emoji: '🥦', termer: ['kartofler', 'løg', 'gulerod', 'tomat', 'salat', 'broccoli', 'peberfrugt', 'agurk'] },
  { label: 'Frugt',         emoji: '🍎', termer: ['æble', 'banan', 'jordbær', 'blåbær', 'melon', 'ananas'] },
  { label: 'Sodavand',      emoji: '🥤', termer: ['pepsi', 'cola', 'sodavand', 'faxe kondi', 'fanta', 'coca-cola'] },
  { label: 'Kaffe & te',    emoji: '☕', termer: ['kaffe', 'te '] },
  { label: 'Snacks & slik', emoji: '🍿', termer: ['chips', 'slik', 'snack', 'popcorn', 'nødder', 'kiks'] },
  { label: 'Is',            emoji: '🍦', termer: ['is', 'ispind'] },
  { label: 'Øl & vin',      emoji: '🍷', termer: ['øl', 'vin'] },
  { label: 'Pålæg',         emoji: '🥓', termer: ['skinke', 'bacon', 'pølser', 'leverpostej', 'pålæg'] },
];

// Slå termer op for en liste af valgte labels (til matchning mod tilbud).
export function termerFor(labels: string[]): string[] {
  const sæt = new Set(labels);
  return MINE_VARER_VALG.filter(v => sæt.has(v.label)).flatMap(v => v.termer);
}
