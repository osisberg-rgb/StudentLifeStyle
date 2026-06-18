// ============================================================
// SUPERBRUGSEN — UGENS TILBUD
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

export const SUPERBRUGSEN_TILBUD: {
  butik: string;
  uge: number;
  varer: Array<{ navn: string; soeg: string[]; pris: number }>;
} = {
  butik: 'SuperBrugsen',
  uge: 25,

  varer: [
    { navn: 'Faxe Kondi eller Pepsi Max 150cl', soeg: [], pris: 10 },
    { navn: 'Änglamark vådservietter 72 stk.', soeg: [], pris: 7 },
    { navn: 'Arla proteindrik eller -mousse 200-500g', soeg: [], pris: 12 },
    { navn: 'Højer pølser 400g', soeg: ['pølser'], pris: 25 },

    { navn: 'Rummo pasta 500g', soeg: ['pasta'], pris: 18 },
    { navn: 'Ben & Jerry’s is 465ml', soeg: ['is'], pris: 39 },
    { navn: 'Gevalia, Merrild eller Peter Larsen formalet kaffe 400g', soeg: [], pris: 49 },
    { navn: 'Xtra! hel kylling, -lårmix eller hakket kylling 3-6% 800-1500g', soeg: ['hakket kylling', 'kylling'], pris: 49 },
    { navn: 'Knorr sauce eller bouillon 57-112g', soeg: ['bouillon'], pris: 10 },

    { navn: 'Pålækker pålæg 70-100g', soeg: ['skinke'], pris: 12 },
    { navn: 'Xtra! ispinde 300ml', soeg: ['is'], pris: 12 },
    { navn: 'Zendium tandpasta 2x50ml', soeg: [], pris: 25 },

    { navn: 'Fontanafredda Moscato d’Asti eller Prosecco Barocco 75cl', soeg: [], pris: 50 },
    { navn: 'Route 2 i boks 3 liter', soeg: [], pris: 99 },

    { navn: '1664 eller Tuborg øl 12-18x33cl', soeg: [], pris: 79 },
    { navn: 'Irma luksus flødeboller fra Sv. Michelsen Chokolade 200g', soeg: [], pris: 65 },
    { navn: 'Monster Energy 50cl', soeg: [], pris: 14 },

    { navn: 'Luksus grillmenu pr. kuvert', soeg: [], pris: 149 },

    { navn: 'Cirkel Kaffe formalet 500g medlemspris', soeg: [], pris: 55.97 },
    { navn: 'Cirkel Kaffe hele bønner 850g medlemspris', soeg: [], pris: 118.97 },
    { navn: 'Cirkel Kaffe instant medlemspris', soeg: [], pris: 28.67 },
    { navn: 'Cirkel Kaffe kapsler 10 stk. medlemspris', soeg: [], pris: 20.97 },
    { navn: 'Irma pesto 500g medlemspris', soeg: ['pesto'], pris: 125 },

    { navn: 'Änglamark økologiske bananer 1 bundt', soeg: ['banan'], pris: 12 },
    { navn: 'Thise økologisk yoghurt, aktiv yoghurt eller acido 750-1000g/1 liter', soeg: ['yoghurt naturel'], pris: 16 },
    { navn: 'Kelloggs morgenmad 205-420g', soeg: [], pris: 25 },

    { navn: 'Graasten eller Coop kartoffelsalat 800g', soeg: ['kartoffelsalat'], pris: 25 },
    { navn: 'Coop marineret flanksteaks pr. 1/2 kg', soeg: ['oksekød'], pris: 110 },
    { navn: 'Kyllingespyd 300g', soeg: ['kylling'], pris: 25 },
    { navn: 'Irma økologiske pølser fra Holmegaards Deli 240-280g', soeg: ['pølser'], pris: 39 },
    { navn: 'Jensens Køkken sauce 250-350ml', soeg: ['sauce'], pris: 16 },

    { navn: 'Dansk Kalv culotte eller tyndsteg pr. 1/2 kg', soeg: ['oksekød'], pris: 95 },
    { navn: 'Coop spareribs eller pulled pork 400-500g', soeg: ['svinekød'], pris: 39 },
    { navn: 'Grillmarked 7 stk.', soeg: [], pris: 100 },
    { navn: 'Coop marineret lammekølle pr. 1/2 kg', soeg: ['lammekød'], pris: 70 },
    { navn: 'Z Zinfandel eller Black Tower 75cl', soeg: [], pris: 50 },

    { navn: 'Entrecote eller ribeye 2 stk./400g', soeg: ['oksekød'], pris: 89 },
    { navn: 'Coop kyllingebryst, -inderfilet eller -overlårsfilet med skind 280-400g', soeg: ['kyllingebryst'], pris: 32 },
    { navn: 'Coop hakket oksekød 8-12% 400g', soeg: ['hakket oksekød'], pris: 49 },
    { navn: 'Coop hel grillklar flæskesteg 4000-5000g', soeg: ['svinekød'], pris: 199 },
    { navn: 'Bornholmergrisen krogmodnet koteletter eller nakkekoteletter 300g', soeg: ['svinekød'], pris: 65 },
    { navn: 'Coop hakket okse- og grisekød 8-12%, hakket grise- og kalvekød 4-7% eller 8-12% 400-500g', soeg: ['hakket oksekød', 'hakket grisekød'], pris: 35 },

    { navn: 'Frikadeller med kartoffelsalat', soeg: ['kartoffelsalat'], pris: 45 },
    { navn: 'Irma pålægssalater 150-175g', soeg: [], pris: 25 },
    { navn: 'Croissant med fyld', soeg: [], pris: 35 },
    { navn: 'Torsdagssmørrebrød', soeg: [], pris: 29 },
    { navn: 'Fredagsbøf Premium tournedos 200g', soeg: ['oksekød'], pris: 89 },
    { navn: 'Fredagstapas til 2 personer', soeg: ['skinke', 'ost'], pris: 165 },
    { navn: 'Lun lørdag 1-2 stk.', soeg: ['leverpostej'], pris: 25 },

    { navn: 'Kirsebær i bakke 350g', soeg: [], pris: 25 },
    { navn: 'Mango eller stor avocado 2 stk.', soeg: ['avocado'], pris: 20 },
    { navn: 'Figentræ 14cm', soeg: [], pris: 65 },

    { navn: 'Danske tomater fra Katrine & Alfred 450g', soeg: ['tomat'], pris: 22 },
    { navn: 'Økologisk dansk agurk fra Katrine & Alfred', soeg: ['agurk'], pris: 12 },

    { navn: 'Stryhns postej eller Coop bacon 140-275g', soeg: ['leverpostej', 'bacon'], pris: 14 },
    { navn: 'Schulstad Levebrød Kernegrov eller multikernesandwich 800-950g', soeg: ['rugbrød'], pris: 18 },
    { navn: 'Sandwich eller wrap 230-260g', soeg: [], pris: 29 },
    { navn: 'Coop skrabeæg 15 stk.', soeg: ['æg'], pris: 29 },
    { navn: 'Thise økologisk smør eller smørbart 200g', soeg: ['smør', 'smørbar'], pris: 22 },
    { navn: 'Graasten remoulade eller mayonnaise 375g', soeg: ['remoulade', 'mayonnaise'], pris: 14 },

    { navn: 'Maille Dijon sennep 380g', soeg: ['sennep'], pris: 20 },
    { navn: 'Dansk sommerhvidkål', soeg: ['hvidkål'], pris: 12 },
    { navn: 'Coop økologiske æbler 1kg', soeg: ['æbler'], pris: 20 },

    { navn: 'Coop Italiana eller deep pan pizza 300-435g', soeg: [], pris: 24 },
    { navn: 'VM Flagbold eller Danmarks fodbold', soeg: [], pris: 99.95 },
    { navn: 'Coca-Cola eller Fanta 24-pak', soeg: [], pris: 99 },

    { navn: 'Malaco eller Pingvin slikpose 340-375g', soeg: [], pris: 40 },
    { navn: 'To Øl Implosion, Easy Pilsner, Blanc 1664 eller Jacobsen 6-pak', soeg: [], pris: 55 },
    { navn: 'Schiøtz eller Skovlyst øl 44-50cl', soeg: [], pris: 15 },
    { navn: 'Kaiserdom, Oranjeboom eller Praga øl 50cl', soeg: [], pris: 8 },

    { navn: 'Coop lakseportioner eller Freja & Frigg ørredfilet 400g', soeg: ['laks'], pris: 65 },
    { navn: 'Sæby makrel 125g', soeg: ['makrel'], pris: 15 },
    { navn: 'Glyngøre laks eller tun 250-400g', soeg: ['laks', 'tun'], pris: 69 },
    { navn: 'Røget, gravad eller varmrøget laks 100g', soeg: ['røget laks'], pris: 22 },

    { navn: 'Coop dansk piskefløde 500ml', soeg: ['piskefløde'], pris: 20 },
    { navn: 'Innocent 4x150ml/900ml', soeg: [], pris: 25 },
    { navn: 'Riberhus skiveost 200-240g', soeg: ['ost'], pris: 29 },
    { navn: 'Them skæreost min. 460g', soeg: ['ost'], pris: 55 },
    { navn: 'Castello Premium hård ost 200g', soeg: ['ost'], pris: 45 },
    { navn: 'Håndværker eller rundstykke', soeg: [], pris: 5 },
    { navn: 'Onsdags-snegl', soeg: [], pris: 10 },
    { navn: 'Focaccia', soeg: ['brød'], pris: 25 },
    { navn: 'Jordbærtærte', soeg: [], pris: 90 },
    { navn: 'Mutti hakkede tomater 400g', soeg: ['hakkede tomater'], pris: 14 },

    { navn: 'Coop falafler, Naturli’ Shape Me Minced eller Änglamark plantefrikadeller 300-800g', soeg: [], pris: 30 },
    { navn: 'Coop færdigret 300-400g', soeg: [], pris: 18 },
    { navn: 'Irma frugttærte 430g', soeg: [], pris: 55 },
    { navn: 'Coop Skagenslapper, møllehjul eller Hatting kanelsnegle 340-600g', soeg: [], pris: 14 },

    { navn: 'Ribena 85cl', soeg: [], pris: 28 },
    { navn: 'Blandet saft eller Zero 70-100cl', soeg: ['saft'], pris: 18 },

    { navn: 'Veronia Zinfandel 75cl', soeg: [], pris: 35 },
    { navn: 'Adobe i boks 3 liter', soeg: [], pris: 149 },
    { navn: 'Torres Coronas eller Esmeralda i boks 3 liter', soeg: [], pris: 129 },
    { navn: 'Spier Signature 75cl', soeg: [], pris: 40 },

    { navn: 'Amarone Terre di Verona, Ser Lapo Chianti Classico Riserva eller Fragments de Loire Pouilly Fumé 75cl', soeg: [], pris: 129 },
    { navn: '1000 Stories 75cl', soeg: [], pris: 99 },
    { navn: 'Solco Toscana, Dissenay Prestige Macon-Villages eller Rosé d’Adimant 75cl', soeg: [], pris: 69 },
    { navn: 'Diablo 75cl', soeg: [], pris: 59 },
    { navn: 'Novas Gran Reserva 6 flasker', soeg: [], pris: 279 },

    { navn: 'Koskenkorva Climate Vodka, Aalborg Rød Grød Shot eller Koskenkorva Cream Likør 50-70cl', soeg: [], pris: 79 },
    { navn: 'Bacardi Rom, Bottega Limoncello, Lillet Rosé, Ramazzotti Limoncello eller Marie Brizard Elderflower Likør 50-75cl', soeg: [], pris: 109 },
    { navn: 'Aalborg Taffel Akvavit, Pure Shots, Licor 43 eller Skyy Vodka 50-70cl', soeg: [], pris: 99 },
    { navn: 'Skagerrak Gin, Campari Bitter eller Disaronno Amaretto 70cl', soeg: [], pris: 139 },

    { navn: 'Skrald-let affaldsposer eller Coop affaldssække 10-15 stk.', soeg: [], pris: 10 },
    { navn: 'HUSK 450g/225 stk.', soeg: [], pris: 129 },
    { navn: 'Longo Vital eller Futura 150-180 stk./250ml', soeg: [], pris: 115 },
    { navn: 'Always eller Tampax 3 pakker', soeg: [], pris: 99 },
    { navn: 'Omo vaskemiddel eller Bamseline skyllemiddel', soeg: [], pris: 20 },
    { navn: 'Lambi classic toiletpapir eller køkkenrulle', soeg: [], pris: 20 },

    { navn: 'Green Protect sneglemiddel 1kg', soeg: [], pris: 99.95 },
    { navn: 'Venedig parasol Ø300cm medlemspris', soeg: [], pris: 299.95 },
    { navn: 'Rosenbænk medlemspris', soeg: [], pris: 699 },
    { navn: 'Oprydningssalg plastkrukke Ø20cm', soeg: [], pris: 29.97 },
    { navn: 'Oprydningssalg plastkrukke Ø25cm', soeg: [], pris: 41.97 },
    { navn: 'Oprydningssalg plastkrukke Ø29cm', soeg: [], pris: 53.97 },
    { navn: 'Myrelokkedåse 4-pak', soeg: [], pris: 75 },

    { navn: 'Taffel chips, Pringles chips eller Taffel nødder 90-175g', soeg: ['nødder'], pris: 12 },
    { navn: 'Marineret kyllingbryst BBQ eller marinerede koteletter med paprika 1000g', soeg: ['kyllingebryst', 'svinekød'], pris: 69 },
    { navn: 'Magnum ispinde 270-330ml', soeg: ['is'], pris: 25 },
    { navn: 'Langelænder pølser 540-560g medlemspris', soeg: ['pølser'], pris: 35 },
    { navn: 'Tulip spareribs eller pulled pork 900g medlemspris', soeg: ['svinekød'], pris: 69 },
    { navn: 'Carlsberg, Coca-Cola eller Monster 8x50cl/18x33cl/24x25cl', soeg: [], pris: 79 },

    { navn: '5G Internet fra eesy første 3 mdr.', soeg: [], pris: 59 },
  ],
};
