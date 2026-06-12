// ============================================================
// BILKA — UGENS TILBUD
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

export const BILKA_TILBUD: {
  butik: string;
  uge: number | number[];
  varer: Array<{ navn: string; soeg: string[]; pris: number }>;
} = {
  butik: 'Bilka',
  uge: [24, 25, 26, 27, 28], // testperiode — ret til enkelt tal i produktion

  varer: [
    { navn: 'Mørbrad uden streng eller striploin af okse 1,2-3kg',                         soeg: ['oksekød'],                          pris: 349 },
    { navn: 'Danske grydeklare kartofler pr. 100g',                                        soeg: ['kartofler'],                        pris: 3   },
    { navn: 'Hakket grisekød, ribbenssteg eller nakkefilet af gris 1,9-3kg',               soeg: ['hakket grisekød', 'svinekød'],      pris: 109 },
    { navn: 'Danpo kyllingebrystfilet eller -inderfilet 2,4kg',                            soeg: ['kyllingebryst'],                    pris: 169 },
    { navn: 'Koteletter uden ben, nakkekoteletter eller flæsk i skiver af dansk gris',     soeg: ['svinekød'],                         pris: 159 },
    { navn: 'Hakket okse- eller okse-/grisekød 1,1-1,4kg',                                soeg: ['hakket oksekød', 'hakket grisekød'], pris: 120 },
    { navn: 'Hakket dansk kyllingekød eller hel dansk kylling 1-1,5kg',                   soeg: ['hakket kylling'],                   pris: 49  },
    { navn: 'Grøntsager 70-900g',                                                          soeg: ['broccoli', 'frosne ærter'],         pris: 10  },
    { navn: 'Nissin kopnudler 5-371g',                                                     soeg: ['nudler'],                           pris: 20  },
    { navn: 'Cheasy hytteost 250g',                                                        soeg: ['hytteost'],                         pris: 15  },
    { navn: 'Rå kamben med Chimichurri eller Mesquite 1,4-1,7kg',                         soeg: ['svinekød'],                         pris: 69  },
    { navn: 'Marinerede flanksteak 400-600g',                                              soeg: ['oksekød'],                          pris: 99  },
    { navn: 'Marineret chuck eye steak 275-375g',                                          soeg: ['oksekød'],                          pris: 69  },
    { navn: 'Roastbeef af okseinderlår 600-1000g',                                         soeg: ['oksekød'],                          pris: 139 },
    { navn: 'Mørbrad af dansk gris 2,2-2,9kg',                                             soeg: ['svinekød'],                         pris: 139 },
    { navn: 'Porchetta af dansk gris 1,6-1,8kg',                                           soeg: ['svinekød'],                         pris: 99  },
    { navn: 'Dansk kyllingemarked 650-1600g',                                              soeg: ['kyllingebryst'],                    pris: 65  },
    { navn: 'XXL kyllingespyd eller -brystfilet 2,5-2,85kg',                              soeg: ['kyllingebryst'],                    pris: 175 },
    { navn: 'Peberfrugt',                                                                  soeg: ['peberfrugt'],                       pris: 6   },
    { navn: 'Kærgården original eller let 200g',                                           soeg: ['smørbar'],                          pris: 20  },
    { navn: "Cheesemaker's Treasure skiveost 180g",                                        soeg: ['ost'],                              pris: 22  },
    { navn: 'Klovborg skæreost 1,147-1,553kg',                                             soeg: ['ost'],                              pris: 99  },
    { navn: 'Castello hård ost 150-200g',                                                  soeg: ['ost'],                              pris: 30  },
    { navn: 'Protein Lab cheddarost i skiver eller revet 150g',                            soeg: ['revet ost', 'ost'],                 pris: 18  },
    { navn: 'Protein Lab protein pitabrød 420g',                                           soeg: ['pitabrød'],                         pris: 25  },
    { navn: 'Søndergaard spareribs 1,5kg',                                                 soeg: ['svinekød'],                         pris: 99  },
    { navn: 'XXL bacon 500g',                                                              soeg: ['bacon'],                            pris: 35  },
    { navn: 'Laksefilet pr. 100g',                                                         soeg: ['laks'],                             pris: 17  },
    { navn: 'Tulip postej 3 pakker',                                                       soeg: ['leverpostej'],                      pris: 39  },
    { navn: 'Friland økologisk leverpostej 200g',                                          soeg: ['leverpostej'],                      pris: 12  },
    { navn: 'Knorr snack pot eller kopnudler 51-89g',                                      soeg: ['nudler'],                           pris: 10  },
    { navn: 'Pasta 500g',                                                                  soeg: ['pasta'],                            pris: 10  },
    { navn: 'Jasmin eller basmati ris 1kg',                                                soeg: ['jasminris', 'basmatiris'],          pris: 20  },
    { navn: 'Raps- eller solsikkeolie 1 liter',                                            soeg: ['rapsolie'],                         pris: 16  },
    { navn: 'Bage- eller dekorationsmarked 13-2000g',                                      soeg: ['hvedemel'],                         pris: 38  },
  ],
};
