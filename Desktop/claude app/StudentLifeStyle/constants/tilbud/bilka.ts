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
  uge: 25,

  varer: [
    { navn: 'Mørbrad uden streng eller striploin af okse 1,2-3kg', soeg: ['oksekød'], pris: 349 },
    { navn: 'Danske jordbær 350g', soeg: ['jordbær'], pris: 25 },
    { navn: 'Libero bleer 60-105 stk.', soeg: [], pris: 159 },
    { navn: 'Arla koldskål 1 liter', soeg: [], pris: 16 },
    { navn: 'Danske grydeklare kartofler pr. 100g', soeg: ['kartofler'], pris: 2.95 },

    { navn: 'Hakket dansk kyllingekød eller hel dansk kylling 1-1,5kg', soeg: ['hakket kylling'], pris: 49 },
    { navn: 'Hakket dansk kyllingekød eller hel dansk kylling 1-1,5kg Bilka Plus', soeg: ['hakket kylling'], pris: 45 },
    { navn: 'Hakket okse- eller okse-/grisekød 1,1-1,4kg', soeg: ['hakket oksekød', 'hakket grisekød'], pris: 120 },
    { navn: 'Hakket okse- eller okse-/grisekød 1,1-1,4kg Bilka Plus', soeg: ['hakket oksekød', 'hakket grisekød'], pris: 109 },
    { navn: 'Danpo kyllingebrystfilet eller -inderfilet 2,4kg', soeg: ['kyllingebryst'], pris: 169 },
    { navn: 'Koteletter uden ben, nakkekoteletter eller flæsk i skiver af dansk gris 2,6-2,8kg', soeg: ['svinekød'], pris: 159 },
    { navn: 'Hakket grisekød, ribbenssteg eller nakkefilet af gris 1,9-3kg', soeg: ['hakket grisekød', 'svinekød'], pris: 109 },

    { navn: 'Noble House 6 flasker', soeg: [], pris: 199 },
    { navn: 'My Way eller 1908 Appasionante Rosso 6 flasker', soeg: [], pris: 289 },
    { navn: 'Små Shots, Master of Mixes eller Koskenkorva likør 50-100cl', soeg: [], pris: 60 },
    { navn: '3 Passo eller Antonin Rodet 75cl', soeg: [], pris: 50 },
    { navn: 'Spiritusmarked 50-100cl', soeg: [], pris: 89 },
    { navn: 'Coca-Cola sodavand 24x33cl', soeg: [], pris: 69 },

    { navn: 'Grøntsager 70-900g', soeg: ['broccoli', 'frosne ærter'], pris: 10 },
    { navn: 'Brød eller baguettes 350-750g', soeg: [], pris: 11 },

    { navn: 'Yummylab gummies eller Lekaform Maxi 45-360 stk.', soeg: [], pris: 59 },
    { navn: 'Yummylab gummies eller Lekaform Maxi 45-360 stk. Bilka Plus', soeg: [], pris: 55 },
    { navn: 'Ritter Sport 100g', soeg: [], pris: 20 },
    { navn: 'Ritter Sport 100g Bilka Plus', soeg: [], pris: 16 },
    { navn: 'To-go marked 27-250g/180-250ml', soeg: [], pris: 6 },
    { navn: 'To-go marked 27-250g/180-250ml Bilka Plus', soeg: [], pris: 5 },
    { navn: 'KiMs chips 3 stk.', soeg: [], pris: 35 },

    { navn: 'Neutral flydende vaskemiddel 1,75 liter', soeg: [], pris: 69 },
    { navn: 'Neutral vaskepulver 4,2kg', soeg: [], pris: 99 },
    { navn: 'Biodance bio-collagen real deep mask 34g', soeg: [], pris: 36 },
    { navn: 'Beauty of Joseon relief sun rice + probiotics 50ml', soeg: [], pris: 103.2 },
    { navn: 'Anua Azelaic acid 10 redness soothing serum 30ml', soeg: [], pris: 207.2 },
    { navn: 'Medicube collagen night wrapping mask 75ml', soeg: [], pris: 180 },

    { navn: 'Forårsløg', soeg: ['løg'], pris: 5 },
    { navn: 'TicTac eller Kinder mini bar 18-21g', soeg: [], pris: 5 },
    { navn: 'Shaker eller Royal Club 27,5-33cl', soeg: [], pris: 10 },
    { navn: 'High Protein drik eller Lavazza iskaffe 250-330ml', soeg: [], pris: 10 },
    { navn: 'Faxe Kondi Booster 50cl', soeg: [], pris: 10 },
    { navn: 'Hud- eller kropspleje marked', soeg: [], pris: 10 },
    { navn: 'Semper smoothie 90g', soeg: [], pris: 5 },

    { navn: 'Pågen Gifflar 260-300g', soeg: [], pris: 15 },
    { navn: 'Nissin kopnudler, Santa Maria Tex Mex eller krydderi glas', soeg: ['nudler', 'tortilla'], pris: 20 },
    { navn: 'Cheasy hytteost 250g', soeg: ['hytteost'], pris: 15 },
    { navn: 'Grenade proteinbar 60g', soeg: [], pris: 15 },
    { navn: 'Zelected survarer 115-500g', soeg: [], pris: 15 },
    { navn: 'Vitakraft hundesnacks 80-120g', soeg: [], pris: 20 },

    { navn: 'Sliders pr. stk.', soeg: [], pris: 18 },
    { navn: 'Fest grillmenu pr. kuvert', soeg: [], pris: 119 },
    { navn: 'Luksusbuffet pr. kuvert', soeg: [], pris: 165 },
    { navn: 'Studenterhuelagkage', soeg: [], pris: 799 },
    { navn: 'Luksussmørrebrød pr. stk.', soeg: [], pris: 39 },
    { navn: 'Tilbehørsbuffet pr. kuvert', soeg: [], pris: 89 },
    { navn: 'Stor brunch pr. kuvert', soeg: [], pris: 155 },
    { navn: 'Favorit grillpakke', soeg: ['oksekød', 'pølser'], pris: 369 },
    { navn: 'Tapas 5 stk.', soeg: ['skinke', 'ost'], pris: 99 },
    { navn: 'Samlealbum', soeg: [], pris: 40 },

    { navn: 'Salling madbrød eller Salling Princip Pommes Gigant 320-700g', soeg: ['kartofler'], pris: 25 },
    { navn: 'Monster Energy eller Coca-Cola sodavand', soeg: [], pris: 49 },
    { navn: 'Haribo VM slikpose 300g', soeg: [], pris: 30 },
    { navn: 'Specialøl eller Somersby 6-pak', soeg: [], pris: 55 },
    { navn: 'Bähncke marked 255-425g', soeg: [], pris: 18 },

    { navn: 'Taffel nødder 80-175g', soeg: ['nødder'], pris: 12 },
    { navn: 'Mini-alkoholtester', soeg: [], pris: 99 },
    { navn: 'Siddehynde med varme', soeg: [], pris: 199 },
    { navn: 'Puste-analysator alkometer', soeg: [], pris: 199 },
    { navn: 'Turtle Motion pizzaovn', soeg: [], pris: 1999 },
    { navn: 'Weber Spirit E-425 gasgrill', soeg: [], pris: 4499 },
    { navn: 'Blød fodbold', soeg: [], pris: 50 },
    { navn: 'Sommermarked', soeg: [], pris: 15 },
    { navn: 'Sommermarked', soeg: [], pris: 20 },
    { navn: 'Sommermarked', soeg: [], pris: 49 },
    { navn: 'Sommermarked', soeg: [], pris: 69 },
    { navn: 'Sommermarked', soeg: [], pris: 79 },
    { navn: 'Sommermarked', soeg: [], pris: 119 },
    { navn: 'Sommermarked', soeg: [], pris: 149 },

    { navn: 'Rå kamben med Chimichurri eller Mesquite 1,4-1,7kg', soeg: ['svinekød'], pris: 69 },
    { navn: 'Marineret flanksteak 400-600g', soeg: ['oksekød'], pris: 99 },
    { navn: 'Marineret chuck eye steak 275-375g', soeg: ['oksekød'], pris: 69 },
    { navn: 'Roastbeef af okseinderlår eller wienerschnitzler af dansk kalv 600-1000g', soeg: ['oksekød'], pris: 139 },
    { navn: 'Mørbrad af dansk gris 2,2-2,9kg', soeg: ['svinekød'], pris: 139 },
    { navn: 'Porchetta af dansk gris 1,6-1,8kg', soeg: ['svinekød'], pris: 99 },
    { navn: 'Frost marked 300-400g', soeg: [], pris: 39 },
    { navn: 'Frost marked 300-400g Bilka Plus', soeg: [], pris: 33 },

    { navn: 'Fritvalgsmarked fra den betjente disk 10 stk.', soeg: [], pris: 100 },
    { navn: 'Menu to-go med pulled pork- eller flæskestegsburger', soeg: ['svinekød'], pris: 99 },
    { navn: 'Loaded fries pr. stk.', soeg: [], pris: 59 },
    { navn: 'Mellem sodavand pr. stk.', soeg: [], pris: 28 },
    { navn: 'Loaded fries og mellem sodavand kombipris', soeg: [], pris: 69 },
    { navn: 'Loaded fries frit valg', soeg: [], pris: 55 },
    { navn: 'Mellem sodavand frit valg', soeg: [], pris: 26 },
    { navn: 'Mr. Brownie VM kage 200g', soeg: [], pris: 20 },
    { navn: 'Brioche burger sliders, pretzel hotdogbrød eller burgerboller 200-400g', soeg: ['boller'], pris: 26 },
    { navn: 'Pinsa', soeg: ['skinke', 'kartofler'], pris: 55 },

    { navn: 'Fiske- eller skaldyrsmarked 200-500g', soeg: [], pris: 65 },
    { navn: 'American style classic eller crispy hot wings 2kg', soeg: ['kylling'], pris: 69 },
    { navn: 'Champion nuggets 600g', soeg: [], pris: 20 },
    { navn: 'Dansk kyllingemarked 650-1600g', soeg: ['kyllingebryst'], pris: 65 },
    { navn: 'XXL kyllingespyd eller -brystfilet 2,5-2,85kg', soeg: ['kyllingebryst'], pris: 175 },
    { navn: 'Mowi sushi 12 stk.', soeg: [], pris: 45 },
    { navn: 'Mowi sushi 16 stk.', soeg: [], pris: 55 },
    { navn: 'Frost kyllingemarked 3 stk.', soeg: ['kyllingebryst'], pris: 89 },

    { navn: 'Peberfrugt', soeg: ['peberfrugt'], pris: 6 },
    { navn: 'Dansk agurk', soeg: ['agurk'], pris: 8 },
    { navn: 'Cocktailtomater 500g', soeg: ['tomat'], pris: 18 },
    { navn: 'Salling ØKO økologisk dansk basilikum', soeg: ['basilikum'], pris: 25 },
    { navn: 'Donutferskner 500g', soeg: [], pris: 14 },

    { navn: 'Yoggi yoghurt 1 liter', soeg: ['yoghurt naturel'], pris: 15 },
    { navn: 'Kærgården original eller let 200g', soeg: ['smørbar'], pris: 20 },
    { navn: 'Kærgården original eller let 200g Bilka Plus', soeg: ['smørbar'], pris: 18 },
    { navn: 'Cremefine madlavning eller piske 250ml', soeg: ['piskefløde'], pris: 10 },
    { navn: 'Cheesemaker’s Treasure skiveost 180g', soeg: ['ost'], pris: 22 },
    { navn: 'Klovborg skæreost 1,147-1,553kg', soeg: ['ost'], pris: 99 },
    { navn: 'Castello hård ost 150-200g', soeg: ['ost'], pris: 30 },

    { navn: 'Protein Lab drikkeyoghurt, budding eller mousse 200g/300ml', soeg: [], pris: 12 },
    { navn: 'Protein Lab shakes 500ml', soeg: [], pris: 12 },
    { navn: 'Protein Lab cheddarost i skiver eller revet 150g', soeg: ['revet ost', 'ost'], pris: 18 },
    { navn: 'Protein Lab one meal 330ml', soeg: [], pris: 18 },
    { navn: 'Protein Lab protein pitabrød 420g', soeg: ['pitabrød'], pris: 25 },
    { navn: 'Protein Lab milk snack 28g', soeg: [], pris: 6 },

    { navn: 'Søndergaard spareribs 1,5kg', soeg: ['svinekød'], pris: 99 },
    { navn: 'XXL bacon 500g', soeg: ['bacon'], pris: 35 },
    { navn: 'Laksefilet pr. 100g', soeg: ['laks'], pris: 16.95 },
    { navn: 'Dorade', soeg: [], pris: 65 },
    { navn: 'Mørksejfilet pr. 100g', soeg: ['sej'], pris: 9.95 },
    { navn: 'Tulip postej, Pålækker pålæg eller salami-hapser 3 pakker', soeg: ['leverpostej', 'skinke'], pris: 39 },
    { navn: 'Friland økologisk leverpostej 200g', soeg: ['leverpostej'], pris: 12 },

    { navn: 'Kiks- eller kagemarked 40-335g', soeg: [], pris: 11 },
    { navn: 'Wasa knækbrød 110-285g', soeg: ['knækbrød'], pris: 18 },
    { navn: 'Marabou cookies eller Karen Volf brownie fudge 132-184g', soeg: [], pris: 20 },
    { navn: 'Nordthy party bars, Pick up 4-pak eller Tuc bake rolls 150-270g', soeg: [], pris: 25 },
    { navn: 'Good food riskager med smag 120g', soeg: [], pris: 14 },

    { navn: 'Toffifee eller M&M slikpose 93-200g', soeg: [], pris: 29 },
    { navn: 'Ben & Jerry’s isbæger 427-465ml', soeg: ['is'], pris: 47 },
    { navn: 'Mars, Naturli’ eller Salling is 207,5-900ml', soeg: ['is'], pris: 32 },
    { navn: 'Tweek slikpose 70-80g', soeg: [], pris: 20 },
    { navn: 'Spangsberg flødeboller 60g', soeg: [], pris: 15 },
    { navn: 'Anthon Berg marcipanbrød 33-40g', soeg: [], pris: 10 },
    { navn: 'Malaco slikpose eller Marabou big taste 270-520g', soeg: [], pris: 70 },
    { navn: 'Malaco slikpose eller Marabou big taste 270-520g Bilka Plus', soeg: [], pris: 65 },

    { navn: 'Flying Goose sriracha sauce eller hoisin sauce 455ml', soeg: [], pris: 39 },
    { navn: 'Castus frugtstænger eller Grinebidder 50-120g', soeg: [], pris: 10 },
    { navn: 'Popz mikroovns popcorn 8-pak', soeg: [], pris: 39 },
    { navn: 'Dr. Oetker Ristorante 1-pk 320-340g', soeg: [], pris: 27 },
    { navn: 'Naturli’ middagskomponenter, Daloon forårsruller eller mini samosa 180-800g', soeg: [], pris: 30 },
    { navn: 'Steff Houlberg færdigret, Tulip frikadeller eller Protein Lab færdigret 370-500g', soeg: [], pris: 35 },
    { navn: 'Ismarked 270-850ml', soeg: ['is'], pris: 35 },

    { navn: 'Knorr snack pot eller kopnudler 51-89g', soeg: ['nudler'], pris: 10 },
    { navn: 'Økologisk grød smoothie 120g', soeg: [], pris: 10 },
    { navn: 'Piccardo & Savoré ekstra jomfru olivenolie 750-1000ml', soeg: ['olivenolie'], pris: 89 },
    { navn: 'Jasmin eller basmati ris 1kg', soeg: ['jasminris', 'basmatiris'], pris: 20 },
    { navn: 'Pasta 500g', soeg: ['pasta'], pris: 10 },
    { navn: 'Raps- eller solsikkeolie 1 liter', soeg: ['rapsolie'], pris: 16 },

    { navn: 'Pokebowl', soeg: ['laks'], pris: 75 },
    { navn: 'Pokebowl 2 stk.', soeg: ['laks'], pris: 125 },
    { navn: 'Nøglehulsretter', soeg: [], pris: 59 },

    { navn: 'Færdigret 400g', soeg: [], pris: 30 },
    { navn: 'Orientalsk inspireret færdigret 800g', soeg: [], pris: 36 },
    { navn: 'Mexicansk inspireret burrito 300g', soeg: [], pris: 27 },
    { navn: 'Lasagne bolognese 1kg', soeg: [], pris: 49 },
    { navn: 'Gyoza 186g', soeg: ['gyoza'], pris: 22 },

    { navn: 'Fransk hotdog 2 stk.', soeg: ['pølser'], pris: 25 },
    { navn: 'Fransk hotdog pr. stk.', soeg: ['pølser'], pris: 14 },

    { navn: 'Flødekage eller tærte pr. stk.', soeg: [], pris: 25 },
    { navn: 'Flødekage eller tærte 2 stk.', soeg: [], pris: 40 },
    { navn: 'Skærekage', soeg: [], pris: 59 },
    { navn: '4 burgerboller eller 6 pølsebrød', soeg: ['boller'], pris: 20 },
    { navn: 'Jordbærtærte eller Othellolagkage', soeg: [], pris: 109 },
    { navn: 'Bage- eller dekorationsmarked 2 stk.', soeg: ['hvedemel'], pris: 38 },

    { navn: 'Peter Larsen Kaffe formalet kaffe 400-500g', soeg: [], pris: 59 },
    { navn: 'Gevalia, Nescafé eller Café Noir instant refill 240-250g', soeg: [], pris: 69 },
    { navn: 'Black Coffee eller Christgau helbønner 350-400g', soeg: [], pris: 60 },
    { navn: 'Helbønnemarked 900-1000g', soeg: [], pris: 159 },

    { navn: 'Casa Nostra Appasimento, Diamond Hill eller Punch Club Bag-in-Box 1,5-3 liter', soeg: [], pris: 99 },
    { navn: 'My Way eller Masi Modello Bag-in-Box 3 liter', soeg: [], pris: 149 },
    { navn: 'Frugtbrus, Tørst eller Valsølille vitamin 0,5-1 liter', soeg: [], pris: 13 },
    { navn: 'Red Bull 25cl', soeg: [], pris: 12 },
    { navn: 'Smirnoff Ice 70cl', soeg: [], pris: 25 },
    { navn: 'Smirnoff Ice 70cl Bilka Plus', soeg: [], pris: 20 },
    { navn: 'Powerrade 50cl', soeg: [], pris: 10 },
    { navn: 'Coca-Cola sodavand 1,5 liter', soeg: [], pris: 17 },

    { navn: 'Chateau Tanunda eller Silverboom Black Label 75cl', soeg: [], pris: 59 },
    { navn: 'San Felice Il Grigio Chianti Classico eller Kung Fu Girl 75cl', soeg: [], pris: 95 },
    { navn: 'ISH eller Mucho Mas 0.0% 75cl', soeg: [], pris: 49 },
    { navn: 'Spiritusmarked 12x2cl eller 70cl', soeg: [], pris: 139 },
    { navn: 'Spiritusmarked 70cl', soeg: [], pris: 185 },
    { navn: 'Banrock Station Reserve eller Casa Ponte 75cl', soeg: [], pris: 39 },
    { navn: 'Helfrich Alsace 75cl', soeg: [], pris: 59 },

    { navn: 'Barefoot eller Bosca Five Star 75cl', soeg: [], pris: 50 },
    { navn: 'Spiritusmarked 70-280cl', soeg: [], pris: 95 },
    { navn: 'Moët & Chandon Brut & Nectar Champagne 75cl', soeg: [], pris: 299 },
    { navn: 'Francois Montand Brut Magnum 1,5 liter', soeg: [], pris: 139 },
    { navn: 'Calvet Cremant 75cl', soeg: [], pris: 69 },
    { navn: 'Montaudon Champagne 75cl', soeg: [], pris: 159 },

    { navn: 'Colgate mundpleje', soeg: [], pris: 39 },
    { navn: 'Livol vitaminer/mineraler 150-350 stk.', soeg: [], pris: 79 },
    { navn: 'Vådservietter 16 pakker a 100 stk.', soeg: [], pris: 139 },
    { navn: 'Vitakraft kattesnacks eller paté 18-85g', soeg: [], pris: 10 },
    { navn: 'Whiskas +1 tørfoder, Frolic beef eller Pedigree Tender Goodness 2,6-3,8kg', soeg: [], pris: 135 },
    { navn: 'Perfect Fit, Sheba, Cesar eller Pedigree', soeg: [], pris: 49 },
    { navn: 'Optimum Nutrition kreatin 248-317g', soeg: [], pris: 99 },
    { navn: 'Bodylab eller Wispy kreatin 300g', soeg: [], pris: 109 },

    { navn: 'Yummylab brus 20 stk.', soeg: [], pris: 12 },
    { navn: 'Murph kreatin gummies 60 stk.', soeg: [], pris: 59 },
    { navn: 'Murph kreatin proteinbar 55g', soeg: [], pris: 16 },
    { navn: 'Aliga Aqtive Chlorella/spirulina 300 stk.', soeg: [], pris: 79 },
    { navn: 'Dragon super green detox mix 200g', soeg: [], pris: 79 },
    { navn: 'Pikasol 120-160 stk.', soeg: [], pris: 139 },
    { navn: 'Murph whey med kreatin 400g', soeg: [], pris: 99 },
    { navn: 'Murph 50% proteinbar 45g', soeg: [], pris: 14 },
    { navn: 'Futura Omega 150-270 stk.', soeg: [], pris: 99 },

    { navn: 'Dogman rejseflaske 500ml', soeg: [], pris: 30 },
    { navn: 'Dogman vandlegetøj', soeg: [], pris: 30 },
    { navn: 'Dogman rejseskål 370 eller 760ml', soeg: [], pris: 50 },
    { navn: 'Dogman hundekurv', soeg: [], pris: 250 },
    { navn: 'Budget hundeposer 40 stk.', soeg: [], pris: 5 },

    { navn: 'A+ vaskemiddel eller Noora skyllemiddel', soeg: [], pris: 39 },
    { navn: 'Fairy maxipack opvasketabs 45-71 stk.', soeg: [], pris: 99 },
    { navn: 'Vileda Ultramax spand med udvrider', soeg: [], pris: 95 },
    { navn: 'Vileda Ultramax fladmoppe', soeg: [], pris: 169 },
    { navn: 'Kleenex toiletpapir 16 rl.', soeg: [], pris: 35 },
    { navn: 'The Pink Stuff cleaning paste eller Bref toiletblok', soeg: [], pris: 15 },

    { navn: 'Sanex deodorant 50-53ml', soeg: [], pris: 16 },
    { navn: 'Rexona deodorant 50-150ml', soeg: [], pris: 14 },
    { navn: 'Got2B styling 10g/16-300ml', soeg: [], pris: 38 },
    { navn: 'Aussie hårpleje 100-300ml', soeg: [], pris: 35 },
    { navn: 'Derma solcreme 150ml', soeg: [], pris: 89 },
    { navn: 'Derma sun stift SPF50 15ml', soeg: [], pris: 69 },
    { navn: 'Technic makeup øjenskygge', soeg: [], pris: 18.75 },
  ],
};
