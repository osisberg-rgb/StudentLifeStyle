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
  uge: 25,

  varer: [
    { navn: 'Riberhus skæreost 468-572g', soeg: ['ost'], pris: 39 },
    { navn: 'REMA 1000 hakket dansk oksekød med 35% grønt, kyllingekød, grise- og kalvekød eller Frilandsgris skinkekød 400g', soeg: ['hakket oksekød', 'hakket kylling'], pris: 29 },
    { navn: 'Coca-Cola eller Fanta 33cl', soeg: [], pris: 2.5 },
    { navn: 'BKI formalet eller instant kaffe 150-400g', soeg: [], pris: 38 },

    { navn: 'Pizza snack 120g', soeg: [], pris: 5 },
    { navn: 'San Marco deep pan pizza 468-484g', soeg: [], pris: 20 },
    { navn: 'REMA 1000 færdigret eller risotto 350-400g', soeg: [], pris: 15 },
    { navn: 'REMA 1000 flødeis 450ml', soeg: ['is'], pris: 25 },
    { navn: 'Premier Is 300ml', soeg: ['is'], pris: 25 },

    { navn: 'Osteroulade 100g', soeg: ['osteroulade'], pris: 12 },
    { navn: 'Gram Slot mini- eller skummetmælk 1 liter', soeg: ['mælk'], pris: 12 },
    { navn: 'Le Brie, Saint Morgan eller chili gouda-ost 200g', soeg: ['ost'], pris: 20 },
    { navn: 'Lurpak smør, smørbar, pisket eller plantebaseret 150-200g', soeg: ['smør', 'smørbar'], pris: 18 },
    { navn: 'Cheasy yoghurt 1000g', soeg: ['yoghurt naturel'], pris: 12 },

    { navn: 'REMA 1000 filet a la mørbrad eller marmoreret grillfilet 400-600g', soeg: ['svinekød'], pris: 29 },
    { navn: 'REMA 1000 danske kyllingelår BBQ eller hele lår 800-825g', soeg: ['kylling'], pris: 29 },
    { navn: 'REMA 1000 ribsteaks med korean BBQ eller BBQ chunks 400g', soeg: ['svinekød'], pris: 29 },
    { navn: 'REMA 1000 dansk T-bone steak eller ribeye steaks 350-360g', soeg: ['oksekød'], pris: 79 },
    { navn: 'REMA 1000 dansk ovnklar ribbenssteg eller nakkefilet', soeg: ['svinekød'], pris: 25 },

    { navn: 'REMA 1000 Frilandsgris 225-340g', soeg: ['svinekød'], pris: 30 },
    { navn: 'REMA 1000 Frilandsgris skinke, pepperoni eller bacon 80-100g', soeg: ['skinke', 'bacon'], pris: 12 },
    { navn: 'REMA 1000 Frilandsgris XL spareribs 1000g', soeg: ['svinekød'], pris: 89 },
    { navn: 'REMA 1000 Frilandsgris flanksteak med BBQ', soeg: ['svinekød'], pris: 49.95 },
    { navn: 'REMA 1000 Frilandsgris grillkøller med BBQ 2 stk./550-800g', soeg: ['svinekød'], pris: 49 },

    { navn: 'Nye kartofler 1kg', soeg: ['kartofler'], pris: 8 },
    { navn: 'Iceberg', soeg: ['salat'], pris: 9 },
    { navn: 'Ærter pr. 1/2 kg', soeg: ['ærter'], pris: 12 },
    { navn: 'Rabarber pr. bundt', soeg: ['rabarber'], pris: 15 },

    { navn: 'REMA 1000 rødspættefileter eller havkatfileter 200-225g', soeg: ['rødspætte'], pris: 45 },
    { navn: 'REMA 1000 store rejer med hvidløg 200g', soeg: ['rejer'], pris: 39 },
    { navn: 'REMA 1000 tunsteak 200g', soeg: ['tun'], pris: 49 },
    { navn: 'Hyttels røget eller gravad laks 140g', soeg: ['laks'], pris: 45 },
    { navn: 'Lykkeberg sild 140-350g', soeg: ['sild'], pris: 25 },

    { navn: 'REMA 1000 Mesterpålæg 70-110g', soeg: [], pris: 12 },
    { navn: 'Hvidebæk pølser 300-375g', soeg: ['pølser'], pris: 25 },
    { navn: 'Ibérico skinke eller mix med chorizo og salchichón 60-140g', soeg: ['skinke', 'pølser'], pris: 35 },
    { navn: 'Bornholmer skinkesalat, ørred- og laksesalat eller skaldyrssalat 140-150g', soeg: ['skinke', 'laks'], pris: 12 },
    { navn: 'Slagter Lampe spegepølse, guldleverpølse eller brunchpølser 210-400g', soeg: ['pølser'], pris: 25 },

    { navn: 'Pågen eller Signatur brød 400-900g', soeg: ['rugbrød'], pris: 15 },
    { navn: 'Rice Up risbar 18g', soeg: [], pris: 5 },
    { navn: 'LU kiks 150-300g', soeg: [], pris: 14 },
    { navn: 'Wasa snacks 150-330g', soeg: ['knækbrød'], pris: 20 },
    { navn: 'Karen Volf franske vafler 107g', soeg: [], pris: 10 },

    { navn: 'Sigdal knækbrød eller snacks 130-220g', soeg: ['knækbrød'], pris: 20 },
    { navn: 'Nordthy Excellent træstammer 280g', soeg: [], pris: 25 },
    { navn: 'Dan Cake fyldte trøffelkugler 210g', soeg: [], pris: 25 },
    { navn: 'Dan Cake kage 350g', soeg: [], pris: 25 },
    { navn: 'Kardemommesnurre', soeg: [], pris: 10 },

    { navn: 'Knorr snack pot eller bouillon 51-112g', soeg: ['bouillon'], pris: 12 },
    { navn: 'REMA 1000 nødder 120-150g', soeg: ['nødder'], pris: 18 },
    { navn: 'REMA 1000 Inspiring Food 250-400ml/100-200g', soeg: ['kokosmælk'], pris: 10 },
    { navn: 'REMA 1000 rogn eller kippers 190-200g', soeg: [], pris: 14 },
    { navn: 'REMA 1000 akaciehonning 250g', soeg: ['honning'], pris: 30 },

    { navn: 'Haribo slikpose 225-250g', soeg: [], pris: 25 },
    { navn: 'S-Märke slikpose 80g', soeg: [], pris: 10 },
    { navn: 'Nordthy bolcher 150g', soeg: [], pris: 20 },
    { navn: 'Toms chokoladebar 40g', soeg: [], pris: 8 },
    { navn: 'Samba toppe eller miniflødeboller 144g', soeg: [], pris: 20 },

    { navn: 'Ragnatela italiensk rød- eller hvidvin 75cl', soeg: [], pris: 39 },
    { navn: 'Xavier Cotes Du Rhone eller Bernard Magrez Bleu de Mer rosé 75cl', soeg: [], pris: 65 },
    { navn: 'Königsmosel Riesling eller rosé 75cl', soeg: [], pris: 45 },
    { navn: 'Verdi Spumante eller Sparkletini 75cl', soeg: [], pris: 25 },
    { navn: 'Italian Aperitivo Bitter Orange 70cl', soeg: [], pris: 50 },

    { navn: 'Thisted eller Skovlyst øl 50cl', soeg: [], pris: 12 },
    { navn: 'Grimbergen, Jacobsen eller Kronenbourg øl 33cl', soeg: [], pris: 10 },
    { navn: 'Willemoes øl 33cl', soeg: [], pris: 6 },
    { navn: 'Harboe sodavand 50cl', soeg: [], pris: 3 },

    { navn: 'Gram Slot havregryn 1kg', soeg: ['havregryn'], pris: 15 },
    { navn: 'REMA 1000 salat 70g', soeg: ['salat'], pris: 10 },
    { navn: 'Gram Slot pommes frites eller kartofler 600g', soeg: ['kartofler'], pris: 14 },
    { navn: 'Friland hakket oksekød 8-12% 400g', soeg: ['hakket oksekød'], pris: 49 },
    { navn: 'Them ost 380-500g', soeg: ['ost'], pris: 39 },

    { navn: 'Barebells bar 55g', soeg: [], pris: 17 },
    { navn: 'REMA 1000 pasta 500g', soeg: ['pasta'], pris: 7 },
    { navn: 'LinusPro proteinpulver eller energimix 400-1000g', soeg: [], pris: 95 },
    { navn: 'Vitamin Well 50cl', soeg: [], pris: 14 },
    { navn: 'Arla Protein drik, budding eller mousse 500ml/200g', soeg: [], pris: 12 },

    { navn: 'REMA 1000 pommes frites 1000g', soeg: ['kartofler'], pris: 9.95 },
    { navn: 'REMA 1000 kartoffelbåde 600g', soeg: ['kartofler'], pris: 11.95 },
    { navn: 'REMA 1000 kartoffelrøsti 600g', soeg: ['kartofler'], pris: 14.95 },

    { navn: 'Meget mere grill grillpølser 450g', soeg: ['pølser'], pris: 27.95 },
    { navn: 'REMA 1000 grillpølser 550g', soeg: ['pølser'], pris: 24.95 },
    { navn: 'Steff Houlberg hotdogpølser eller bayerske pølser 375g', soeg: ['pølser'], pris: 24.95 },
    { navn: 'REMA 1000 wiener- eller hotdogpølser 500g', soeg: ['pølser'], pris: 24.95 },

    { navn: 'Stryhns grovhakket eller fransk postej 400g', soeg: ['leverpostej'], pris: 23.95 },
    { navn: 'REMA 1000 leverpostej, hamburgerryg eller rullepølse 140-500g', soeg: ['leverpostej', 'skinke'], pris: 13.95 },
    { navn: 'Pålækker hamburgerryg eller rullepølse 90g', soeg: ['skinke'], pris: 12.95 },
    { navn: 'REMA 1000 bacon i skiver 150g', soeg: ['bacon'], pris: 9.97 },
    { navn: 'Tulip bacon i skiver 3x125g', soeg: ['bacon'], pris: 34.95 },

    { navn: 'Il Casolare økologisk ufiltreret eller Farchioni italiensk ekstra jomfruolivenolie 500ml', soeg: ['olivenolie'], pris: 55 },
    { navn: 'Antos græsk yoghurt 2% eller 10% 1kg', soeg: ['yoghurt naturel'], pris: 25 },
    { navn: 'Antos tzatziki eller Ambrosi mozzarella 100-200g', soeg: ['mozzarella'], pris: 10 },
    { navn: 'Taga bacondadler, lufttørret fuet eller La Selva fuet sticks 60-75g', soeg: ['bacon', 'pølser'], pris: 15 },
    { navn: 'Alexos eller Antos økologiske oliven 100-180g', soeg: ['oliven'], pris: 18 },

    { navn: 'REMA 1000 middagskødboller eller kyllingekebab 300-500g', soeg: [], pris: 25 },
    { navn: 'REMA 1000 tun i vand 240g/168g drænet vægt', soeg: ['tun'], pris: 15 },
    { navn: 'Bonduelle majs 560-840g', soeg: ['majs'], pris: 40 },
    { navn: 'Rose kyllingestrimler, kyllingeinderfilet eller sandwichskiver 150g', soeg: ['kyllingebryst'], pris: 15 },
    { navn: 'REMA 1000 fiskefrikadeller 4-10 stk./200-280g', soeg: ['fiskefrikadeller'], pris: 25 },

    { navn: 'Pasta di Maria fuldkornstagliolini 250g', soeg: ['fuldkornspasta'], pris: 10 },
    { navn: 'REMA 1000 mildt rugbrød med kikærter 500g', soeg: ['rugbrød', 'kikærter'], pris: 5 },
    { navn: 'OTA solgryn eller solflakes 375-700g', soeg: ['havregryn'], pris: 12 },
    { navn: 'AXA müsli 600-750g', soeg: ['müsli'], pris: 29 },
    { navn: 'REMA 1000 speltstykker eller havrestykker 420-510g', soeg: [], pris: 15 },

    { navn: 'Pizzadej glutenfri 260g', soeg: ['pizzadej'], pris: 15 },
    { navn: 'REMA 1000 brød glutenfri 260-500g', soeg: [], pris: 25 },
    { navn: 'Free Bakery brød glutenfri 175-275g', soeg: [], pris: 20 },
    { navn: 'Keto kernesnack glutenfri 70g', soeg: [], pris: 15 },
    { navn: 'Life Kids majssnacks glutenfri økologisk 30-50g', soeg: [], pris: 12 },

    { navn: 'Biotex vaskemiddel 700ml/12 stk.', soeg: [], pris: 25 },
    { navn: 'Neutral hår- eller hudpleje 2x100g/50-250ml', soeg: [], pris: 18 },
    { navn: 'Harpic wc-rens 750ml', soeg: [], pris: 15 },
    { navn: 'Poly Swing eller Taft hair styling 150-250ml/10g', soeg: [], pris: 20 },
    { navn: 'Skrald-let affaldsposer med snørelukning', soeg: [], pris: 5 },
    { navn: 'Zendium tandpasta, Jordan tandbørster, træningstandbørste eller flosser refill', soeg: [], pris: 25 },

    { navn: 'Memoryfoam pude 60x40cm', soeg: [], pris: 99 },
    { navn: 'Sommerdyne 140x200cm', soeg: [], pris: 199 },
    { navn: 'Badeværelsessæt', soeg: [], pris: 19 },
    { navn: 'Jersey lagen 90x200x30cm', soeg: [], pris: 59 },
    { navn: 'Jersey lagen 140x200x30cm', soeg: [], pris: 79 },
    { navn: 'Jersey lagen 180x200x30cm', soeg: [], pris: 89 },
    { navn: 'Servietter 16-20-pak', soeg: [], pris: 10 },
    { navn: 'Falby sengetæppe 220x260cm', soeg: [], pris: 169 },
    { navn: 'Falby pude 40x60cm', soeg: [], pris: 49 },
    { navn: 'Galleri i ramme A4', soeg: [], pris: 29 },
    { navn: 'Sengetøj 140x200cm/140x220cm', soeg: [], pris: 99 },
    { navn: 'Voksdug 140x250cm', soeg: [], pris: 59 },

    { navn: 'Vandglas, vinglas, ølglas, shotglas, kop, skål eller bestik', soeg: [], pris: 15 },
    { navn: 'Sugerør med rengøringsbørste 12-pak', soeg: [], pris: 10 },
    { navn: 'Silikoneisterningebakke med plastlåg', soeg: [], pris: 25 },
    { navn: 'Plasttallerkener 6-pak', soeg: [], pris: 25 },

    { navn: "Naturli' drik eller kokosvand 1 liter", soeg: [], pris: 10 },
    { navn: 'Gøl spegepølse eller kødpølse 110-135g', soeg: ['pølser'], pris: 10 },
    { navn: 'REMA 1000 dansk kyllingebrystfilet 325-450g', soeg: ['kyllingebryst'], pris: 29 },
    { navn: 'Tuborg eller Brewmasters IPA 33cl', soeg: [], pris: 4.5 },

    { navn: 'REMA 1000 danske hakkebøffer med bøgerøget bacon og grønt 2 stk./250g', soeg: ['hakkebøffer'], pris: 20 },
    { navn: 'Blue Keld 1 liter', soeg: [], pris: 5 },

    { navn: 'Goal snacks 75g', soeg: [], pris: 8 },
    { navn: 'Gullón Pick! kiks 250g', soeg: [], pris: 10 },
    { navn: "Ben & Jerry's is 465ml", soeg: ['is'], pris: 39 },

    { navn: 'REMA 1000 dansk kalvemørbradsteg 600-900g', soeg: ['oksekød'], pris: 149 },
    { navn: 'REMA 1000 dansk kalvemørbradsteg 900-1300g', soeg: ['oksekød'], pris: 199 },
    { navn: 'Grande Alberone italiensk rød- eller hvidvin 75cl', soeg: [], pris: 50 },
    { navn: 'Casa Modena italiensk pålæg 70-120g', soeg: ['skinke', 'pølser'], pris: 12 },

    { navn: 'Spangsberg flødebolleis 360-450ml', soeg: ['is'], pris: 25 },
    { navn: 'Kalanchoe eller Roseflowers', soeg: [], pris: 12 },
  ],
};
