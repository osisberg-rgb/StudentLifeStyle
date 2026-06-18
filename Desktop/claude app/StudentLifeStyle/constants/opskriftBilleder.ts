const BILLEDER: Record<string, any> = {
  // === Aftensmad ===
  'lasagnette':                   require('../assets/opskrifter/lasagnette.png'),
  'morbradgryde':                 require('../assets/opskrifter/morbradgryde.png'),
  'frikadeller':                  require('../assets/opskrifter/frikadeller.png'),
  'spaghetti-kodsovs':            require('../assets/opskrifter/spaghetti-kodsovs.png'),
  'boller-i-karry':               require('../assets/opskrifter/boller-i-karry.png'),
  'stegt-flaesk-persillesauce':   require('../assets/opskrifter/stegt-flaesk-persillesauce.png'),
  'flaeskesteg-sprod-svaer':      require('../assets/opskrifter/flaeskesteg-sprod-svaer.png'),
  'tarteletter-hons-asparges':    require('../assets/opskrifter/tarteletter-hons-asparges.png'),
  'braendende-kaerlighed':        require('../assets/opskrifter/braendende-kaerlighed.png'),
  'biksemad':                     require('../assets/opskrifter/biksemad.png'),
  'pikant-kylling-fad':           require('../assets/opskrifter/pikant-kylling-fad.png'),
  'klassisk-burger':              require('../assets/opskrifter/klassisk-burger.png'),
  'marry-me-chicken-orzo':        require('../assets/opskrifter/marry-me-chicken-orzo.png'),
  'marry-me-kodboller':           require('../assets/opskrifter/marry-me-kodboller.png'),
  'dhal':                         require('../assets/opskrifter/dhal.png'),
  'teriyaki-nudler':              require('../assets/opskrifter/teriyaki-nudler.png'),
  'mexi-bowl':                    require('../assets/opskrifter/mexi-bowl.png'),
  'chow-mein':                    require('../assets/opskrifter/chow-mein.png'),

  // === Suppe ===
  'tomatsuppe':                   require('../assets/opskrifter/tomatsuppe.png'),
  'kartoffelsuppe':               require('../assets/opskrifter/kartoffelsuppe.png'),
  'hoensekoedssuppe':             require('../assets/opskrifter/hoensekoedssuppe.png'),

  // === Salater ===
  'graesk-salat':                 require('../assets/opskrifter/graesk-salat.png'),
  'gron-salat-basilikum':         require('../assets/opskrifter/gron-salat-basilikum.png'),
  'burrata-salat':                require('../assets/opskrifter/burrata-salat.png'),
  'sommersalat-jordbaer':         require('../assets/opskrifter/sommersalat-jordbaer.png'),
  'coleslaw':                     require('../assets/opskrifter/coleslaw.png'),
  'vandmelonsalat':               require('../assets/opskrifter/vandmelonsalat.png'),
  'tomatsalat-mozzarella':        require('../assets/opskrifter/tomatsalat-mozzarella.png'),
  'spidskaalssalat':              require('../assets/opskrifter/spidskaalssalat.png'),
  'broccolisalat':                require('../assets/opskrifter/broccolisalat.png'),
  'stuvet-spidskal':              require('../assets/opskrifter/stuvet-spidskal.png'),

  // === Brød ===
  'focaccia-brod':                require('../assets/opskrifter/focaccia-brod.png'),
  'surdejsbrod':                  require('../assets/opskrifter/surdejsbrod.png'),
  'nemme-kernestykker':           require('../assets/opskrifter/nemme-kernestykker.png'),
  'hytteostboller':               require('../assets/opskrifter/hytteostboller.png'),
  'gulerodsboller':               require('../assets/opskrifter/gulerodsboller.png'),
  'fodselsdagsboller':            require('../assets/opskrifter/fodselsdagsboller.png'),
  'polsehorn':                    require('../assets/opskrifter/polsehorn.png'),
};

export function hentBillede(id: string): any | null {
  return BILLEDER[id] ?? null;
}

// Billedkilde for en opskrift: bundlet PNG hvis den findes, ellers
// importerede opskrifters remote-billede ({ uri }), ellers null (emoji-
// fallback i UI). Brug denne frem for hentBillede(id) hvor importerede
// opskrifter også kan optræde.
export function billedeFor(
  opskrift: { id: string; billede_url?: string | null },
): any | null {
  return BILLEDER[opskrift.id]
    ?? (opskrift.billede_url ? { uri: opskrift.billede_url } : null);
}
