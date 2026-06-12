// ============================================================
// REMA 1000 — UGENS TILBUD
// ============================================================
// Dette er den ENESTE fil du skal opdatere når en ny avis kommer.
//
// SÅDAN GØR DU (hver uge):
//   1. Ret `uge:` til det ugenummer appen viser øverst på forsiden
//      ("Uge 24" → uge: 24). Matcher ugen ikke, ignoreres ALLE
//      tilbud automatisk og appen bruger basispriser.
//   2. Slet de gamle varer og skriv ugens tilbud ind — én linje pr. vare:
//        { navn: 'Hakket oksekød 400g', soeg: ['hakket oksekød'], pris: 32 },
//      - navn: vises i appen under "Bedste tilbud" (skriv det pænt)
//      - soeg: søgeord med SMÅ bogstaver — skal matche ordene i
//        opskrifternes ingredienser (samme ord som i basispriser.ts)
//      - pris: pakkeprisen i kr fra avisen
//
// REGLER (håndteres automatisk — du skal ikke tjekke noget):
//   - Kun tilbud der er BILLIGERE end basisprisen bliver brugt
//   - Varer der ikke bruges i nogen opskrift gør ingen skade
//   - Basispriser.ts ændres ALDRIG — den er kilden der falder tilbage på
// ============================================================

export const REMA1000_TILBUD: {
  butik: string;
  uge: number | number[];
  varer: Array<{ navn: string; soeg: string[]; pris: number }>;
} = {
  butik: 'Rema 1000',
  uge: [24, 25, 26, 27, 28], // testperiode — ret til enkelt tal i produktion

  varer: [
    { navn: 'Karolines Køkken eller Cheasy mozzarella 150-200g',                                          soeg: ['mozzarella'],                       pris: 10 },
    { navn: 'Burger Boost sliders 360g',                                                                  soeg: ['oksekød'],                          pris: 39 },
    { navn: 'Bornholmsk tapasost 75-100g',                                                                soeg: ['ost'],                              pris: 12 },
    { navn: 'Baro fuet eller Galar chorizo 150g',                                                         soeg: ['pølser'],                           pris: 20 },
    { navn: 'Spinat økologisk 75g',                                                                       soeg: ['spinat'],                           pris: 8  },
    { navn: 'Nye danske kartofler 500g',                                                                  soeg: ['kartofler'],                        pris: 12 },
    { navn: 'REMA 1000 Danske herregårdsbøffer 2 stk./360g',                                              soeg: ['oksekød'],                          pris: 39 },
    { navn: 'REMA 1000 Danske kalvesteaks 300g',                                                          soeg: ['oksekød'],                          pris: 69 },
    { navn: 'REMA 1000 Dansk ovnklar flæskesteg uden ben',                                                soeg: ['svinekød'],                         pris: 20 },
    { navn: 'REMA 1000 Dansk kylling 250-800g',                                                           soeg: ['kyllingebryst'],                    pris: 29 },
    { navn: 'REMA 1000 Danske laksefileter 2 stk./225g',                                                  soeg: ['laks'],                             pris: 40 },
    { navn: 'REMA 1000 Dansk laksefilet 600g',                                                            soeg: ['laks'],                             pris: 99 },
    { navn: 'REMA 1000 Hakkebøffer med bøgerøget bacon og 25% grønt 250g',                                soeg: ['oksekød', 'bacon'],                 pris: 25 },
    { navn: 'REMA 1000 Hakket dansk oksekød med 35% grønt 400g',                                          soeg: ['hakket oksekød'],                   pris: 30 },
    { navn: 'REMA 1000 Hakket oksekød 4-7% 350g',                                                         soeg: ['hakket oksekød'],                   pris: 45 },
    { navn: 'REMA 1000 Hakket grise- og kalvekød, stegeflæsk eller koteletter 400-500g',                  soeg: ['hakket grisekød', 'svinekød'],      pris: 30 },
    { navn: 'REMA 1000 Hakket dansk grisekød 8-12% eller medister 500g',                                  soeg: ['hakket grisekød', 'pølser'],        pris: 25 },
    { navn: 'REMA 1000 Dansk kyllingebrystfilet 280g',                                                    soeg: ['kyllingebryst'],                    pris: 28 },
    { navn: 'REMA 1000 Kyllingebrystfilet eller -lår med BBQ 325-825g',                                   soeg: ['kyllingebryst'],                    pris: 33 },
    { navn: 'REMA 1000 Hakket dansk oksekød 15-18% 400g',                                                 soeg: ['hakket oksekød'],                   pris: 38 },
    { navn: 'REMA 1000 Pastaskruer 500g',                                                                 soeg: ['pasta'],                            pris: 6  },
    { navn: 'REMA 1000 Spaghetti 1kg',                                                                    soeg: ['pasta'],                            pris: 9  },
    { navn: 'REMA 1000 Frilandsgris pulled pork 800-1100g',                                               soeg: ['svinekød'],                         pris: 69 },
    { navn: 'REMA 1000 Frilandsgris skinkeculotte BBQ 800-1200g',                                         soeg: ['svinekød'],                         pris: 69 },
    { navn: 'REMA 1000 Frilandsgris 240-350g',                                                            soeg: ['svinekød'],                         pris: 30 },
    { navn: 'REMA 1000 Frilandsgris sønderjysk spegepølse 225g',                                          soeg: ['pølser'],                           pris: 29 },
    { navn: 'REMA 1000 Frilandsgris leverpostej eller krydderpaté 200-250g',                              soeg: ['leverpostej'],                      pris: 12 },
    { navn: 'Økologiske æg M/L 10 stk.',                                                                  soeg: ['æg'],                               pris: 30 },
    { navn: 'REMA 1000 Danske rødspættefileter 300g',                                                     soeg: ['rødspætte'],                        pris: 25 },
    { navn: 'Cheasy hytteost 1.5% 250g',                                                                  soeg: ['hytteost'],                         pris: 12 },
    { navn: 'REMA 1000 Varmrøget laks 125g',                                                              soeg: ['laks'],                             pris: 30 },
    { navn: 'Schulstad brød 470-1080g',                                                                   soeg: ['rugbrød', 'toastbrød'],             pris: 15 },
    { navn: 'REMA 1000 Yoghurt 1000g',                                                                    soeg: ['yoghurt naturel'],                  pris: 12 },
    { navn: 'Karolines Køkken creme fraiche 18% eller madlavningsfløde 250ml/250g',                       soeg: ['creme fraiche'],                    pris: 10 },
    { navn: 'Gram Slot letmælk eller sødmælk økologisk 1 liter',                                          soeg: ['mælk'],                             pris: 14 },
    { navn: 'Cheasy, Karolines Køkken eller Arla laktosefri salatost 200g',                               soeg: ['ost'],                              pris: 15 },
    { navn: 'Burrata 2 stk./100g',                                                                        soeg: ['ost'],                              pris: 15 },
    { navn: 'REMA 1000 Indbagt laks 500g',                                                                soeg: ['laks'],                             pris: 39 },
    { navn: 'Jensens spareribs 1200g',                                                                    soeg: ['svinekød'],                         pris: 79 },
    { navn: 'Mayo reje- eller tunsalat 175-200g',                                                         soeg: ['tun'],                              pris: 15 },
    { navn: 'Squash økologisk',                                                                           soeg: ['squash'],                           pris: 6  },
    { navn: 'Friland danske højrebsbøffer økologiske 2 stk./350g',                                        soeg: ['oksekød'],                          pris: 89 },
    { navn: 'REMA 1000 Dansk kyllingebrystfilet eller hele kyllingelår økologisk 160-520g',               soeg: ['kyllingebryst'],                    pris: 59 },
    { navn: 'Kærgården eller Karolines Køkken piskefløde økologisk 200g/½ liter',                         soeg: ['smørbar', 'piskefløde'],            pris: 20 },
    { navn: 'Arla ymer eller Cultura A38 økologisk 1000g',                                                soeg: ['yoghurt naturel'],                  pris: 15 },
    { navn: 'REMA 1000 Hakket dansk grisekød 8-12%, danske koteletter eller medister 400-500g',           soeg: ['hakket grisekød', 'svinekød'],      pris: 20 },
    { navn: 'Den Grønne Slagter pålæg, postej eller kalkunbacon 70-250g',                                 soeg: ['bacon', 'leverpostej'],             pris: 10 },
    { navn: 'Kalvecuvette',                                                                               soeg: ['oksekød'],                          pris: 60 },
    { navn: 'Steff Houlberg bacon i skiver eller brunchpølser 300-350g',                                  soeg: ['bacon', 'pølser'],                  pris: 22 },
  ],
};
