const BILLEDER: Record<string, any> = {
  'kylling-ris-tomatgryde':       require('../assets/opskrifter/kylling-ris-tomatgryde.png'),
  'hakket-kylling-pasta':         require('../assets/opskrifter/hakket-kylling-pasta.png'),
  'kylling-nudler-groentsager':   require('../assets/opskrifter/kylling-nudler-groentsager.png'),
  'kylling-kokos-ris':            require('../assets/opskrifter/kylling-kokos-ris.png'),
  'pita-kylling-spinat':          require('../assets/opskrifter/pita-kylling-spinat.png'),
  'kyllingefad-ris':              require('../assets/opskrifter/kyllingefad-ris.png'),
  'pasta-kylling-panderet':       require('../assets/opskrifter/pasta-kylling-panderet.png'),
  'pasta-kodsovs-okse':           require('../assets/opskrifter/pasta-kodsovs-okse.png'),
  'chili-con-carne':              require('../assets/opskrifter/chili-con-carne.png'),
  'okse-pasta-tomatsauce':        require('../assets/opskrifter/okse-pasta-tomatsauce.png'),
  'okse-ris-boenner':             require('../assets/opskrifter/okse-ris-boenner.png'),
  'okse-tortilla-wraps':          require('../assets/opskrifter/okse-tortilla-wraps.png'),
  'okse-kartoffelgryde':          require('../assets/opskrifter/okse-kartoffelgryde.png'),
  'grise-pasta-flode':            require('../assets/opskrifter/grise-pasta-flode.png'),
  'grise-ris-groentsager':        require('../assets/opskrifter/grise-ris-groentsager.png'),
  'svinekoed-kartoffelpande':     require('../assets/opskrifter/svinekoed-kartoffelpande.png'),
  'poelse-pasta-tomat':           require('../assets/opskrifter/poelse-pasta-tomat.png'),
  'bacon-aeggekage-kartofler':    require('../assets/opskrifter/bacon-aeggekage-kartofler.png'),
  'pasta-kodsovs-alt-stor':       require('../assets/opskrifter/pasta-kodsovs-alt-stor.png'),
  'tun-pasta-cremefraiche':       require('../assets/opskrifter/tun-pasta-cremefraiche.png'),
  'kikaerter-kokos-curry':        require('../assets/opskrifter/kikaerter-kokos-curry.png'),
  'linse-tomat-pasta':            require('../assets/opskrifter/linse-tomat-pasta.png'),
  'aeg-stegte-ris':               require('../assets/opskrifter/aeg-stegte-ris.png'),
  'kartoffel-broccoli-ostefad':   require('../assets/opskrifter/kartoffel-broccoli-ostefad.png'),
};

export function hentBillede(id: string): any | null {
  return BILLEDER[id] ?? null;
}
