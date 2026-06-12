// ============================================================
// NETTO — UGENS TILBUD
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

export const NETTO_TILBUD: {
  butik: string;
  uge: number | number[];
  varer: Array<{ navn: string; soeg: string[]; pris: number }>;
} = {
  butik: 'Netto',
  uge: [24, 25, 26, 27, 28], // testperiode — ret til enkelt tal i produktion

  varer: [
    { navn: 'Revet pizza- eller mexi topping 150g',                          soeg: ['revet ost'],                          pris: 9  },
    { navn: 'Velsmag mørbrad af dansk gris 1650-2300g',                      soeg: ['svinekød'],                           pris: 99 },
    { navn: 'Buko flødeost 150-200g',                                        soeg: ['ost'],                                pris: 10 },
    { navn: 'Carl Vollstedt spegepølse 200g',                                soeg: ['pølser'],                             pris: 25 },
    { navn: 'Barkholt skrabeæg 6 stk.',                                      soeg: ['æg'],                                 pris: 15 },
    { navn: 'Nye kartofler 1kg',                                             soeg: ['kartofler'],                          pris: 15 },
    { navn: 'Kohberg smørrebrødet rugbrød 600g',                             soeg: ['rugbrød'],                            pris: 15 },
    { navn: 'Røde snackpebre 500g',                                          soeg: ['peberfrugt'],                         pris: 15 },
    { navn: 'De Danske Familiegårde kyllingemarked 280-600g',                soeg: ['hakket kylling'],                     pris: 39 },
    { navn: 'Velsmag hakket oksekød 8-12% 400g',                             soeg: ['hakket oksekød'],                     pris: 40 },
    { navn: 'Velsmag ribbenssteg uden ben',                                  soeg: ['svinekød'],                           pris: 25 },
    { navn: 'Velsmag hakket grisekød 8-12% 500g',                            soeg: ['hakket grisekød'],                    pris: 25 },
    { navn: 'Velsmag entrecotes 900g',                                       soeg: ['oksekød'],                            pris: 149},
    { navn: 'Dansk hakket kylling 7-10% 400g',                               soeg: ['hakket kylling'],                     pris: 25 },
    { navn: 'Dansk kyllingefilet, -inderfilet eller -lårfilet 900-1000g',    soeg: ['kyllingebryst'],                      pris: 69 },
    { navn: 'Velsmag dansk flæsk i skiver 300g',                             soeg: ['svinekød'],                           pris: 20 },
    { navn: 'Velsmag hakket okse- og grisekød 8-12% 650g',                   soeg: ['hakket oksekød', 'hakket grisekød'],  pris: 49 },
    { navn: 'Velsmag marineret inside skirt 130g',                           soeg: ['oksekød'],                            pris: 29 },
    { navn: 'Riberhus skiveost eller Karolines Køkken grillost 200-240g',    soeg: ['ost'],                                pris: 24 },
    { navn: 'Klovborg skæreost 765-1035g',                                   soeg: ['ost'],                                pris: 69 },
    { navn: 'Zanetti Grana Padano 200g',                                     soeg: ['ost'],                                pris: 32 },
    { navn: 'Athena græsk yoghurt 400g',                                     soeg: ['yoghurt naturel'],                    pris: 16 },
    { navn: 'Lurpak smør eller smørbar 200g',                                soeg: ['smør', 'smørbar'],                    pris: 15 },
    { navn: 'ØGO økologiske grøntsager 300-500g',                            soeg: ['frosne ærter', 'grøntsagsmix'],       pris: 12 },
    { navn: 'ØGO økologisk hakket oksekød 8-12% 400g',                       soeg: ['hakket oksekød'],                     pris: 55 },
    { navn: 'Stryhns postej 275-400g',                                       soeg: ['leverpostej'],                        pris: 24 },
    { navn: 'Kohberg brød 470-750g',                                         soeg: ['rugbrød'],                            pris: 15 },
    { navn: 'Premieur varmrøget laks 100g',                                  soeg: ['laks'],                               pris: 29 },
    { navn: 'Pølsemesteren pølser 400-500g',                                 soeg: ['pølser'],                             pris: 25 },
    { navn: 'Rejer i lage eller røget laks 50-80g',                          soeg: ['laks'],                               pris: 12 },
    { navn: 'Tulip BBQ 500g',                                                soeg: ['svinekød'],                           pris: 37 },
    { navn: 'Peka friske kartofler 450g',                                    soeg: ['kartofler'],                          pris: 12 },
    { navn: 'Gøl storkøbspølser eller Tulip bacon i skiver 500-750g',        soeg: ['pølser', 'bacon'],                    pris: 45 },
    { navn: 'Navito tunpoke eller vannamei rejer 160-200g',                  soeg: ['tun'],                                pris: 25 },
    { navn: 'Royal Tiger jasmin ris 1kg',                                    soeg: ['jasminris'],                          pris: 20 },
    { navn: 'Longkou glasnudler 250g',                                       soeg: ['nudler'],                             pris: 12 },
    { navn: 'Thai Dancer nudler 400g',                                       soeg: ['nudler'],                             pris: 22 },
    { navn: 'ØGO økologisk fuldkornspasta 500g',                             soeg: ['fuldkornspasta'],                     pris: 9  },
    { navn: 'Gamle Mølle fuldkornssandwichbrød 800g',                        soeg: ['toastbrød'],                          pris: 14 },
    { navn: 'Premieur fuldkornspitabrød 420g',                               soeg: ['pitabrød'],                           pris: 22 },
    { navn: 'Caputo mel 1kg',                                                soeg: ['hvedemel'],                           pris: 18 },
  ],
};
