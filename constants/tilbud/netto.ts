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
  uge: 25,

  varer: [
    { navn: 'Harvest Best grøntsager 400-750g', soeg: ['grøntsagsmix', 'frosne ærter'], pris: 12 },
    { navn: 'Jean-Marie Garnier 75cl', soeg: [], pris: 39 },
    { navn: 'Cocio 60cl', soeg: [], pris: 12 },
    { navn: 'Dansk spidskål', soeg: ['spidskål'], pris: 10 },

    { navn: 'Steff Houlberg pølser 375-400g', soeg: ['pølser'], pris: 24.95 },
    { navn: 'Lambi everyday toiletpapir eller classic køkkenrulle', soeg: [], pris: 18 },
    { navn: 'Velsmag laksestykke 300g', soeg: ['laks'], pris: 54.95 },
    { navn: 'Il Capolavoro eller Montgras Estate Bag-in-Box 3 liter', soeg: [], pris: 89 },

    { navn: 'ØGO økologisk basilikumpesto 130g', soeg: ['pesto'], pris: 12 },
    { navn: 'ØGO økologisk tomatpesto 130g', soeg: ['pesto'], pris: 12 },
    { navn: 'Rummo conchigle rigate pasta 500g', soeg: ['pasta'], pris: 15 },
    { navn: 'Premieur ricotta/spinat pasta 250g', soeg: ['pasta', 'spinat'], pris: 20 },
    { navn: 'Granarolo frisk burrata 100g', soeg: ['burrata'], pris: 15 },
    { navn: 'Løgismose økologisk mormor koldskål 1 liter', soeg: [], pris: 20 },
    { navn: 'Karen Volf originale kammerjunkere 400g', soeg: [], pris: 25 },
    { navn: 'Blåbær 125g', soeg: ['blåbær'], pris: 15 },
    { navn: 'Skagen Food kuller loins 300g', soeg: ['fiskefileter'], pris: 69 },

    { navn: 'Ananas', soeg: [], pris: 20 },
    { navn: 'Premieur ferskner eller nektariner 6 stk.', soeg: [], pris: 25 },
    { navn: 'Cherry blommetomater mix 300g', soeg: ['tomat'], pris: 20 },
    { navn: 'ØGO økologisk dansk icebergsalat', soeg: ['salat'], pris: 12 },
    { navn: 'Formodnede avocadoer 3 stk.', soeg: ['avocado'], pris: 22 },

    { navn: 'Velsmag nakkefilet eller røget bacon', soeg: ['svinekød', 'bacon'], pris: 24.95 },
    { navn: 'Velsmag hakket grisekød 4-7%, flæsk i skiver eller danske koteletter 700-900g', soeg: ['hakket grisekød', 'svinekød'], pris: 49 },
    { navn: 'Premieur marineret lammeculotte 285-325g', soeg: ['lammekød'], pris: 55 },
    { navn: 'Kyllingeunderlår eller marinerede kyllingespyd 250-600g', soeg: ['kylling'], pris: 25 },
    { navn: 'Velsmag okseculotte', soeg: ['oksekød'], pris: 74.95 },
    { navn: 'Dansk medister 500g', soeg: ['pølser'], pris: 24.95 },

    { navn: 'Velsmag hakket oksekød 14-18% 400g', soeg: ['hakket oksekød'], pris: 37.95 },
    { navn: 'Dansk kyllingebrystfilet 725g', soeg: ['kyllingebryst'], pris: 59 },
    { navn: 'Dansk hel kylling 1450g', soeg: ['kylling'], pris: 49 },
    { navn: 'Dansk hakket kylling 3-7% 700g', soeg: ['hakket kylling'], pris: 49 },
    { navn: 'Velsmag hakket grise- og kalvekød 8-12% 500g', soeg: ['hakket grisekød'], pris: 29.95 },

    { navn: 'Klovborg eller Cheasy skiveost 165-240g', soeg: ['ost'], pris: 23 },
    { navn: 'Mammen skæreost 900-1100g', soeg: ['ost'], pris: 72 },
    { navn: 'Castello dessertost 125-200g', soeg: ['dessertost'], pris: 18 },
    { navn: 'Buko smelteost 200g', soeg: ['smelteost'], pris: 14 },
    { navn: 'Bakkedal smørbar 200g', soeg: ['smørbar'], pris: 15 },
    { navn: 'Egelykke danske skrabeæg 10 stk.', soeg: ['æg'], pris: 18 },
    { navn: 'Starbucks tripleshot espresso 300ml', soeg: [], pris: 12 },

    { navn: 'Stryhns grovhakket eller fransk postej 275g', soeg: ['leverpostej'], pris: 15 },
    { navn: 'Graasten pålægssalat 120g', soeg: [], pris: 10 },
    { navn: 'Graasten kartoffelsalat 400g', soeg: ['kartoffelsalat'], pris: 25 },
    { navn: 'Brunchy bacon i skiver 100g', soeg: ['bacon'], pris: 10 },
    { navn: 'Pågen brød 400-500g', soeg: ['rugbrød'], pris: 15 },
    { navn: 'Premieur grønlandske rejer 300-330g', soeg: ['rejer'], pris: 65 },
    { navn: 'Premieur røget eller gravad laks 100g', soeg: ['røget laks'], pris: 35 },
    { navn: 'Sushi 323g', soeg: [], pris: 45 },
    { navn: 'Pålækker pålæg 90g', soeg: ['skinke'], pris: 12.95 },

    { navn: 'Kyllingemarked 350-600g', soeg: [], pris: 20 },
    { navn: 'Koko chokoladeovertrukket frugt 130g', soeg: [], pris: 35 },
    { navn: 'Seafood snacks marked 160-250g', soeg: [], pris: 20 },
    { navn: 'Jensens Sauce 250ml', soeg: [], pris: 15 },
    { navn: 'Næmt pizzadej 400g', soeg: ['pizzadej'], pris: 10 },
    { navn: 'Pahmeyer Rösti 240-300g', soeg: ['kartofler'], pris: 15 },
    { navn: 'Kitchen Joy gyoza 279g', soeg: ['gyoza'], pris: 25 },
    { navn: "Carte d'Or mini isbæger 200ml", soeg: ['is'], pris: 15 },
    { navn: 'Premier Is eller Underground iskasse 300-445ml', soeg: ['is'], pris: 27 },

    { navn: 'Lovena plaster 20 stk.', soeg: [], pris: 9.97 },
    { navn: 'Kohberg fuldkornsburgerboller 330g', soeg: ['boller'], pris: 12.11 },
    { navn: 'Skolekridt 110g', soeg: [], pris: 10.42 },
    { navn: 'Shine skuresvampe 10-pak', soeg: [], pris: 3.47 },

    { navn: 'ØGO økologisk hytteost 450g', soeg: ['hytteost'], pris: 25 },
    { navn: 'ØGO økologisk friland pålæg 70g', soeg: ['skinke'], pris: 15 },
    { navn: 'ØGO økologiske jordbær eller bærmix 200-225g', soeg: ['jordbær'], pris: 15 },
    { navn: 'ØGO økologisk fettuccine pasta 250g', soeg: ['pasta'], pris: 12 },
    { navn: 'ØGO økologisk sodavand 1 liter', soeg: [], pris: 12 },
    { navn: 'ØGO økologisk hakket oksekød 4-7% 350g', soeg: ['hakket oksekød'], pris: 55 },

    { navn: 'Toblerone eller Marabou bar 35-46g', soeg: [], pris: 9 },
    { navn: 'Copenhagen Roaster helbønner 750g', soeg: [], pris: 99 },
    { navn: 'Nescafé instant kaffe 200-250g', soeg: [], pris: 75 },
    { navn: 'Oreo original 264g', soeg: [], pris: 20 },
    { navn: 'Wasa Runda knækbrød 290-330g', soeg: ['knækbrød'], pris: 25 },
    { navn: 'Samba toppe 270g', soeg: [], pris: 38 },
    { navn: "Lavazza eller L'OR kaffekapsler 10 stk.", soeg: [], pris: 25 },
    { navn: "Breakfast from Bell's granola 300-500g", soeg: ['granola'], pris: 24 },
    { navn: 'Peter Larsen Kaffe eller Café Noir 100-500g', soeg: [], pris: 65 },

    { navn: 'Tapas marked 150-200g', soeg: [], pris: 20 },
    { navn: 'Premieur udenlandske specialiteter 65-170g', soeg: ['skinke', 'pølser'], pris: 25 },
    { navn: 'Bakersfield focaccia 280g', soeg: ['brød'], pris: 16 },
    { navn: 'La Campagna fyldt peberfrugt 130-150g', soeg: ['peberfrugt'], pris: 15 },
    { navn: 'La Campagna grønne oliven 130g', soeg: ['oliven'], pris: 15 },
    { navn: 'La Campagna hummus 175-210g', soeg: ['hummus'], pris: 12 },
    { navn: 'La Campagna grøn pesto 130g', soeg: ['pesto'], pris: 12 },

    { navn: "Alsace Varietals, Les Terrasses D'Ardeche eller Vidal Fleury Ventoux 75cl", soeg: [], pris: 50 },
    { navn: 'Ernst Ludwig Bag-in-Box 3 liter', soeg: [], pris: 99 },
    { navn: 'Calvet Chablis 75cl', soeg: [], pris: 99 },
    { navn: 'Francois Martenot Bag-in-Box 3 liter', soeg: [], pris: 129 },
    { navn: 'August Kesseler Daily Riesling 75cl', soeg: [], pris: 79 },
    { navn: 'Art of the Refill 75cl', soeg: [], pris: 45 },
    { navn: 'Lo Stivale Rosso 75cl', soeg: [], pris: 50 },
    { navn: 'Faustino V Reserva 75cl', soeg: [], pris: 55 },
    { navn: 'Kingpin eller Il Capolavoro Appassimento Bag-in-Box 3 liter', soeg: [], pris: 119 },
    { navn: 'AN/2 75cl', soeg: [], pris: 149 },
    { navn: 'Le Arche Amarone 75cl', soeg: [], pris: 99 },
    { navn: 'Rocca Alata Valpolicella Ripasso 75cl', soeg: [], pris: 50 },
    { navn: 'Selaks 75cl', soeg: [], pris: 50 },
    { navn: 'Barefoot 75cl', soeg: [], pris: 59 },
    { navn: 'Kung Fu Girl Bag-in-Box 1,5 liter', soeg: [], pris: 129 },
    { navn: 'Montgras Estate 75cl', soeg: [], pris: 32 },
    { navn: 'Silverboom 75cl', soeg: [], pris: 45 },
    { navn: 'Golden Zin 75cl', soeg: [], pris: 39 },
    { navn: 'Maximilian Spritz 75cl', soeg: [], pris: 45 },
    { navn: 'Noble House Magnum 1,5 liter', soeg: [], pris: 89 },
    { navn: 'Le Arche Prosecco eller JP Chenet Ice 75cl', soeg: [], pris: 50 },
    { navn: 'Fresca Moscato 75cl', soeg: [], pris: 29 },
    { navn: 'Lyv Rosé eller Francois Montand 1,5 liter', soeg: [], pris: 129 },
    { navn: 'Less is More Sparkling 75cl', soeg: [], pris: 59 },
    { navn: 'Løgismose økologiske oliven 200g', soeg: ['oliven'], pris: 28 },
    { navn: 'Løgismose chips 100-125g', soeg: [], pris: 20 },
    { navn: 'Løgismose Bag-in-Box 2,25 liter', soeg: [], pris: 99 },
    { navn: 'Løgismose Provence 75cl', soeg: [], pris: 79 },
    { navn: 'Løgismose No. 75cl', soeg: [], pris: 50 },
    { navn: 'Spritz Ish eller Ish Espumante 75cl', soeg: [], pris: 45 },
    { navn: 'Il Capolavoro Free 75cl', soeg: [], pris: 39 },
    { navn: 'Tanqueray 0,0% 70cl', soeg: [], pris: 99 },
    { navn: 'Ish RTD 4-pak mix 4x25cl', soeg: [], pris: 50 },
    { navn: 'Château del Ish Sparkling 75cl', soeg: [], pris: 69 },
    { navn: 'Crodino eller Ramazotti Arancia 4x17,5cl eller 70cl', soeg: [], pris: 79 },
    { navn: 'Skovlyst, Sol eller Skanderborg Bryghus 33-50cl', soeg: [], pris: 10 },
    { navn: 'Leffe eller Hoegaarden øl 75cl', soeg: [], pris: 26 },
    { navn: 'Ørbæk IPA eller Fynsk Forår 75cl', soeg: [], pris: 24 },
    { navn: 'Skovlyst Blanche 25cl', soeg: [], pris: 7 },
    { navn: 'Corona eller Stella Artois 33cl', soeg: [], pris: 12 },
    { navn: 'Anarkist 44cl', soeg: [], pris: 20 },
    { navn: 'Alexis Lichine Cremant de Bordeaux Brut 75cl', soeg: [], pris: 65 },
    { navn: 'Ready to drink cocktail 25cl', soeg: [], pris: 6 },
    { navn: 'Smirnoff Ice 27,5cl', soeg: [], pris: 12 },
    { navn: 'Heineken eller Royal Export, Blanche eller IPA 18x33cl', soeg: [], pris: 79 },
    { navn: 'Spiritusmarked 70-150cl', soeg: [], pris: 99 },
    { navn: 'Protein Lab Proteinvand 33cl', soeg: [], pris: 10 },
    { navn: 'Red Bull 25cl', soeg: [], pris: 12 },
    { navn: 'Faxe Kondi booster 4x50cl', soeg: [], pris: 49 },
    { navn: 'Rynkeby marked 70cl eller 1 liter', soeg: ['frugtjuice'], pris: 16 },
    { navn: 'Faxe Kondi, Pepsi Max sodavand eller Egekilde citrus 24x33cl', soeg: [], pris: 79 },
    { navn: 'Monster Energy eller Coca-Cola sodavand 8x50cl eller 24x25cl', soeg: [], pris: 79 },
    { navn: 'Jägermeister 70cl', soeg: [], pris: 99 },
    { navn: 'Faxe Kondi eller Pepsi Max sodavand 1,5 liter', soeg: [], pris: 15 },

    { navn: 'Rummo pasta 500g', soeg: ['pasta'], pris: 15 },
    { navn: 'Karolines Køkken sauce 500ml', soeg: ['sauce'], pris: 14 },
    { navn: 'Knorr dinner kit 252-321g', soeg: [], pris: 20 },
    { navn: 'Mutti Polpa hakkede tomater 400g', soeg: ['hakkede tomater'], pris: 12 },
    { navn: 'Lays Max chips 185g', soeg: [], pris: 14 },
    { navn: 'Sunshine Delights tørret frugt 200g', soeg: [], pris: 30 },
    { navn: 'Taffel nødder 80-175g', soeg: ['nødder'], pris: 12 },
    { navn: 'Dürüm Döner tortilla wraps 540g/6 stk.', soeg: ['tortilla'], pris: 20 },
    { navn: 'Sereno nødder 200g', soeg: ['nødder'], pris: 15 },

    { navn: 'Star Candies freeze dried is 16g', soeg: [], pris: 20 },
    { navn: 'Rap Snack 71g', soeg: [], pris: 12 },
    { navn: 'Peelerz slikpose 46-65g', soeg: [], pris: 14 },
    { navn: 'Toppie wax candy 40g', soeg: [], pris: 25 },
    { navn: 'Toppie crystal candy 100g', soeg: [], pris: 25 },
    { navn: 'Ruffles Jamon eller Yorkéso 150g', soeg: [], pris: 18 },
    { navn: 'Dr. Pepper 33cl', soeg: [], pris: 15 },

    { navn: 'Rummo pasta 500g', soeg: ['pasta'], pris: 15 },
  ],
};
