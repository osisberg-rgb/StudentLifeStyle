// ============================================================
// FØTEX — UGENS TILBUD
// ============================================================
// SÅDAN GØR DU (hver uge):
//   1. Ret `uge:` til det ugenummer appen viser øverst på forsiden
//   2. Slet de gamle varer og skriv ugens tilbud ind — én linje pr. vare:
//        { navn: 'Kyllingebryst 500g', soeg: ['kyllingebryst'], pris: 27 },
//      - soeg: søgeord MED SMÅ BOGSTAVER — samme ord som i basispriser.ts
//      - pris: pakkeprisen i kr fra avisen
//
// REGLER (håndteres automatisk):
//   - Kun tilbud der er BILLIGERE end basisprisen bliver brugt
//   - Varer der ikke bruges i nogen opskrift gør ingen skade
//   - Matcher uge-nr ikke → alle tilbud ignoreres, appen bruger basispriser
// ============================================================

export const FOTEX_TILBUD: {
  butik: string;
  uge: number | number[];
  varer: Array<{ navn: string; soeg: string[]; pris: number }>;
} = {
  butik: 'Føtex',
  uge: [24, 25, 26, 27, 28], // testperiode — ret til enkelt tal i produktion

  varer: [
    { navn: 'Hakket okse-/kylling- eller okse-/grisekød 400g',                    soeg: ['hakket oksekød', 'hakket kylling'],      pris: 39  },
    { navn: 'Buko flødeost 150-200g',                                             soeg: ['ost'],                                  pris: 12  },
    { navn: 'Samyang, Nongshim eller Nissin kopnudler 65-145g',                   soeg: ['nudler'],                               pris: 18  },
    { navn: 'Gøl megakøbspølser 1,1-1,25kg',                                     soeg: ['pølser'],                               pris: 75  },
    { navn: 'Økologiske grøntsager 300-600g',                                     soeg: ['broccoli', 'frosne ærter'],             pris: 12  },
    { navn: 'Mørbrad af dansk gris 1,65-2,2kg',                                   soeg: ['svinekød'],                             pris: 119 },
    { navn: 'Kohberg familie rugbrød 450-750g',                                   soeg: ['rugbrød'],                              pris: 12  },
    { navn: 'Økologisk fuldkornspasta 500g',                                      soeg: ['fuldkornspasta'],                       pris: 8   },
    { navn: 'Familien Jacobsen pålæg 100g',                                       soeg: ['skinke', 'pølser'],                     pris: 8   },
    { navn: 'Tortilla wraps fuldkorn 370g',                                       soeg: ['tortilla'],                             pris: 8   },
    { navn: 'Økologiske hakkede eller flåede tomater 400g',                       soeg: ['hakkede tomater', 'flåede tomater'],    pris: 6   },
    { navn: 'Kokosmælk 400ml',                                                    soeg: ['kokosmælk'],                            pris: 8   },
    { navn: 'Tortilla wraps 370g',                                                soeg: ['tortilla'],                             pris: 10  },
    { navn: 'Tjele Gods økologisk smør 200g',                                     soeg: ['smør'],                                 pris: 35  },
    { navn: 'Tjele Gods økologisk skummetmælk 1 liter',                           soeg: ['mælk'],                                 pris: 14  },
    { navn: 'Tjele Gods økologisk kærnemælk 1 liter',                             soeg: ['mælk'],                                 pris: 15  },
    { navn: 'Tjele Gods økologisk minimælk 1 liter',                              soeg: ['mælk'],                                 pris: 15  },
    { navn: 'Tjele Gods økologisk letmælk 1 liter',                               soeg: ['mælk'],                                 pris: 16  },
    { navn: 'Tjele Gods økologisk sødmælk 1 liter',                               soeg: ['mælk'],                                 pris: 17  },
    { navn: 'Pedersens udvalgte danske peberfrugter 2 stk.',                      soeg: ['peberfrugt'],                           pris: 24  },
    { navn: 'Flæsk i skiver, spareribs eller grillmedister 700-800g',             soeg: ['svinekød', 'pølser'],                   pris: 49  },
    { navn: 'Taverna salatost 400g',                                              soeg: ['ost'],                                  pris: 25  },
    { navn: 'Rose hel kylling eller kyllingebrystfilet 800-1600g',                soeg: ['kyllingebryst'],                        pris: 59  },
    { navn: 'Pitabrød 420g',                                                      soeg: ['pitabrød'],                             pris: 20  },
    { navn: 'Skagenfood fersk jomfruhummer eller tunsteak 200-350g',              soeg: ['tun'],                                  pris: 50  },
    { navn: 'Nakkefilet eller ribbensteg af dansk gris 1,9-3kg',                  soeg: ['svinekød'],                             pris: 129 },
    { navn: 'Hakket okse- eller grise-/kalvekød 700-1000g',                       soeg: ['hakket oksekød', 'hakket grisekød'],    pris: 79  },
    { navn: 'Burger BOOST af dansk kød 300-350g',                                 soeg: ['oksekød'],                              pris: 44  },
    { navn: 'Okseculotte',                                                        soeg: ['oksekød'],                              pris: 90  },
    { navn: 'Tykstegsmedaljoner eller -bøffer 600-650g',                          soeg: ['oksekød'],                              pris: 129 },
    { navn: 'Softkernerugbrød',                                                   soeg: ['rugbrød'],                              pris: 9   },
    { navn: 'Mammen skæreost 1,08-1,32kg',                                        soeg: ['ost'],                                  pris: 99  },
    { navn: 'Børnesnacks eller Puck ost 120-500g',                                soeg: ['ost'],                                  pris: 16  },
    { navn: 'Riberhus eller Cheasy skiveost 180-240g',                            soeg: ['ost'],                                  pris: 22  },
    { navn: 'Lurpak smør eller smørbar 200g',                                     soeg: ['smør', 'smørbar'],                      pris: 22  },
    { navn: "Naturli' plantedrik, smørbar eller blok 200g/330-1000ml",            soeg: ['smørbar'],                              pris: 15  },
    { navn: 'Økologiske danske æg 10 stk.',                                       soeg: ['æg'],                                   pris: 30  },
    { navn: 'Spareribs 500g',                                                     soeg: ['svinekød'],                             pris: 39  },
    { navn: 'Økologisk tørsaltet bacon 100g',                                     soeg: ['bacon'],                                pris: 22  },
    { navn: 'Laksefilet 225g',                                                    soeg: ['laks'],                                 pris: 49  },
    { navn: 'Grønlandske rejer, kold- eller varmrøget laks 175-280g',             soeg: ['laks'],                                 pris: 65  },
    { navn: 'Dansk kyllingelår, -inderfilet eller hakket kyllingekød 330-700g',   soeg: ['hakket kylling'],                       pris: 30  },
    { navn: 'De Danske Familiegårde kyllingebrystfilet eller -inderfilet 800g',   soeg: ['kyllingebryst'],                        pris: 99  },
    { navn: 'Rose hakket dansk kyllingekød 450g',                                 soeg: ['hakket kylling'],                       pris: 30  },
    { navn: 'Fraiche 9% 500g',                                                    soeg: ['creme fraiche'],                        pris: 15  },
    { navn: 'Steff Houlberg pølser eller Tulip baconsteaks 200-450g',             soeg: ['pølser', 'bacon'],                      pris: 25  },
    { navn: 'Pasta 500g',                                                         soeg: ['pasta'],                                pris: 12  },
    { navn: 'Sæby makrel eller Salling tun 125-140g',                             soeg: ['makrel', 'tun'],                        pris: 13  },
  ],
};
