// Opskriftsbog — organiseret efter kødkategori
// AI'en filtrerer automatisk baseret på brugerens kødpræferencer

export const OPSKRIFTER = [

  // ===== OKSEKØD =====
  {
    id: "pasta-kodsovs-okse",
    kategorier: ["boernefavorit", "storportion"],
    minutter: 25,
    navn: "Pasta med kødsovs",
    kategori: "aftensmad",
    koed: "Oksekød",
    portioner: 4,
    ingredienser: [
      { navn: "Hakket oksekød", maengde: "400-500 g", soeg: ["hakket oksekød", "hakket dansk oksekød", "hakket oksekød 15-18%", "hakket oksekød 4-7%", "hakket oksekød med 35% grønt"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater", "tomat"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 8 },
      { navn: "Pasta", maengde: "500 g", soeg: ["pasta", "spaghetti", "pastaskruer"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Brun hakket oksekød på en varm pande, krydr med salt og peber",
      "Tilsæt hakkede tomater og lad simre 15 min ved lav varme",
      "Kog pasta efter pakkens anvisning",
      "Bland pasta med kødsovs og server"
    ]
  },
  {
    id: "chili-con-carne",
    kategorier: ["storportion", "hverdag"],
    minutter: 35,
    navn: "Chili con carne med ris",
    kategori: "aftensmad",
    koed: "Oksekød",
    portioner: 4,
    ingredienser: [
      { navn: "Hakket oksekød", maengde: "400-500 g", soeg: ["hakket oksekød", "hakket dansk oksekød", "hakket oksekød 15-18%", "hakket oksekød 4-7%", "hakket oksekød med 35% grønt"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater", "tomat"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 8 },
      { navn: "Ris", maengde: "500 g", soeg: ["ris"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 17 },
      { navn: "Chili eller paprika", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Brun hakket oksekød og krydr med chili/paprika, salt og peber",
      "Tilsæt hakkede tomater og lad simre 20 min",
      "Kog ris i dobbelt mængde vand i 18 min",
      "Server chili over ris"
    ]
  },

  // ===== KYLLING =====
  {
    id: "pasta-kylling-panderet",
    kategorier: ["boernefavorit"],
    minutter: 30,
    navn: "Pasta med paneret kylling",
    kategori: "aftensmad",
    koed: "Kylling",
    portioner: 3,
    ingredienser: [
      { navn: "Kylling", maengde: "400 g", soeg: ["kyllingebryst", "kyllingebrystfilet", "kylling", "kyllingelår"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Pasta", maengde: "400 g", soeg: ["pasta", "spaghetti", "pastaskruer"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Frosne grøntsager", maengde: "200 g", soeg: ["grøntsager", "frosne"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 8 },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Skær kyllingen i strimler, krydr med salt og peber",
      "Steg kyllingen gyldenbrun på panden, ca. 5 min",
      "Kog pasta og frosne grøntsager sammen i saltet vand",
      "Bland pasta, grøntsager og kylling — tilsæt lidt pastavand for at binde"
    ]
  },
  {
    id: "kyllingefad-ris",
    kategorier: ["fitness", "hverdag"],
    minutter: 40,
    navn: "Kyllingefad med ris",
    kategori: "aftensmad",
    koed: "Kylling",
    portioner: 4,
    ingredienser: [
      { navn: "Kylling", maengde: "500 g", soeg: ["kyllingebryst", "kyllingebrystfilet", "kylling", "kyllingelår"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater", "tomat"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 8 },
      { navn: "Mælk", maengde: "2 dl", soeg: ["mælk", "letmælk", "sødmælk"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Bouillonterning", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Ris", maengde: "500 g", soeg: ["ris"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 17 },
      { navn: "Paprika, salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Skær kylling og løg i stykker",
      "Brun kylling på panden, tilsæt løg og svits 2 min",
      "Tilsæt tomater, mælk, bouillon og paprika — simr 20 min",
      "Kog ris og server med kyllingefadet"
    ]
  },
  {
    id: "kylling-kartofler",
    kategorier: ["fitness", "hverdag"],
    minutter: 35,
    navn: "Kylling med kartofler",
    kategori: "aftensmad",
    koed: "Kylling",
    portioner: 2,
    ingredienser: [
      { navn: "Kyllingebryst", maengde: "250 g", soeg: ["kyllingebryst", "kyllingebrystfilet", "kylling"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Kartofler", maengde: "500 g", soeg: ["kartofler"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Olie, salt", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 2 },
    ],
    fremgangsmaade: [
      "Skær kartofler i både, vend i olie og salt på bageplade",
      "Bag ved 200°C i 30 min",
      "Krydr kylling og steg 4-5 min på hver side",
      "Server kylling med ovnkartofler"
    ]
  },

  // ===== SVINEKØD =====
  {
    id: "frikadeller-kartofler",
    kategorier: ["boernefavorit", "storportion"],
    minutter: 40,
    navn: "Frikadeller med kartofler",
    kategori: "aftensmad",
    koed: "Svinekød",
    portioner: 4,
    ingredienser: [
      { navn: "Hakket grisekød", maengde: "500 g", soeg: ["hakket grisekød", "hakket dansk grisekød", "hakket grise", "hakket grise- og kalvekød"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Æg", maengde: "1 stk", soeg: ["æg"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Havregryn", maengde: "2 spsk", soeg: ["havregryn"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 2 },
      { navn: "Mælk", maengde: "1 dl", soeg: ["mælk", "letmælk", "sødmælk"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Kartofler", maengde: "700 g", soeg: ["kartofler"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Bland hakket kød, revet løg, æg, havregryn, mælk, salt og peber",
      "Lad farsen hvile 10 min i køleskabet",
      "Kog kartofler i saltet vand 20 min",
      "Form frikadeller og steg 4 min på hver side ved middel varme"
    ]
  },
  {
    id: "medister-kartofler",
    kategorier: ["billig", "boernefavorit", "hverdag"],
    minutter: 30,
    navn: "Medister med kartofler",
    kategori: "aftensmad",
    koed: "Svinekød",
    portioner: 4,
    ingredienser: [
      { navn: "Medister", maengde: "500 g", soeg: ["medister", "hakket dansk grisekød 8-12% eller medister"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Kartofler", maengde: "800 g", soeg: ["kartofler"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Mælk", maengde: "2 dl", soeg: ["mælk", "letmælk", "sødmælk"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Paprika, salt", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Kog kartofler i saltet vand i 20 min, hæld vandet fra",
      "Steg medisteren på panden ved middel varme ca. 15 min, vend jævnligt",
      "Mos kartoflerne med mælk, løg og paprika",
      "Server medister med kartoffelmos"
    ]
  },
  {
    id: "koteletter-ris",
    kategorier: ["hverdag"],
    minutter: 25,
    navn: "Koteletter med ris og tomatsovs",
    kategori: "aftensmad",
    koed: "Svinekød",
    portioner: 4,
    ingredienser: [
      { navn: "Koteletter", maengde: "400 g", soeg: ["koteletter", "hakket grisekød eller koteletter", "hakket grise- og kalvekød, koteletter"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater", "tomat"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 8 },
      { navn: "Ris", maengde: "500 g", soeg: ["ris"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 17 },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Kog ris i dobbelt mængde vand i 18 min",
      "Brun koteletterne 3 min på hver side, tag dem af panden",
      "Svits hakket løg i samme pande, tilsæt tomater og simr 10 min",
      "Server koteletter med ris og tomatsovs"
    ]
  },

  // ===== ALT (billigst uanset kødtype) =====
  {
    id: "pasta-kodsovs-alt-stor",
    kategorier: ["billig", "boernefavorit", "storportion"],
    minutter: 25,
    navn: "Pasta med kødsovs",
    kategori: "aftensmad",
    koed: "Alt",
    portioner: 4,
    ingredienser: [
      { navn: "Hakket kød", maengde: "500 g", soeg: ["hakket grisekød", "hakket dansk grisekød", "hakket oksekød", "hakket grise- og kalvekød", "hakket grise", "hakket kød"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Pasta", maengde: "500 g", soeg: ["pasta", "spaghetti", "pastaskruer"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater", "tomat"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 8 },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Brun hakket kød på en varm pande",
      "Tilsæt hakkede tomater og simr 15 min",
      "Kog pasta og bland med sovsen"
    ]
  },
  {
    id: "pasta-kodsovs-alt-lille",
    kategorier: ["boernefavorit", "hverdag"],
    minutter: 25,
    navn: "Pasta med kødsovs og grønt",
    kategori: "aftensmad",
    koed: "Alt",
    portioner: 3,
    ingredienser: [
      { navn: "Hakket kød med grønt", maengde: "400 g", soeg: ["hakket oksekød med 35% grønt", "hakket grisekød", "hakket dansk grisekød", "hakket grise- og kalvekød"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Pasta", maengde: "400 g", soeg: ["pasta", "spaghetti", "pastaskruer"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater", "tomat"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 8 },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Brun hakket kød og krydr",
      "Tilsæt tomater og simr 15 min",
      "Kog pasta og bland med sovsen"
    ]
  },

  // ===== KYLLING (udvidet) =====
  {
    id: "kylling-ris-tomatgryde",
    kategorier: ["fitness", "storportion"],
    minutter: 30,
    navn: "Kylling i tomat med ris",
    kategori: "aftensmad",
    koed: "Kylling",
    portioner: 4,
    ingredienser: [
      { navn: "Kyllingebryst", maengde: "500 g", soeg: ["kyllingebryst", "kyllingebrystfilet", "kylling"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Ris", maengde: "400 g", soeg: ["ris"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 12 },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 8 },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Hvidløg", maengde: "1 fed", soeg: [], estimeret: true, estimereretPris: 1 },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Kog ris efter pakkens anvisning",
      "Skær kylling i tern og steg i en gryde",
      "Tilsæt hakket løg og hvidløg og steg kort",
      "Hæld hakkede tomater i og lad simre 10 min",
      "Smag til og server med ris",
    ]
  },
  {
    id: "hakket-kylling-pasta",
    kategorier: ["boernefavorit", "hverdag"],
    minutter: 25,
    navn: "Hakket kylling med pasta",
    kategori: "aftensmad",
    koed: "Kylling",
    portioner: 4,
    ingredienser: [
      { navn: "Hakket kylling", maengde: "500 g", soeg: ["hakket kylling"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Pasta", maengde: "400 g", soeg: ["pasta", "fusilli", "penne"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Tomatpuré", maengde: "1 lille dåse", soeg: ["tomatpuré", "tomatpure"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 7 },
      { navn: "Creme fraiche", maengde: "2 dl", soeg: ["creme fraiche"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Kog pastaen",
      "Steg hakket kylling og løg på en pande",
      "Tilsæt tomatpuré og creme fraiche",
      "Vend pastaen i saucen",
      "Smag til og server",
    ]
  },
  {
    id: "kylling-nudler-groentsager",
    kategorier: ["fitness"],
    minutter: 20,
    navn: "Kyllingenudler med grøntsager",
    kategori: "aftensmad",
    koed: "Kylling",
    portioner: 4,
    ingredienser: [
      { navn: "Kyllingebryst", maengde: "500 g", soeg: ["kyllingebryst", "kyllingebrystfilet", "kylling"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Nudler", maengde: "300 g", soeg: ["nudler"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Frossen grøntsagsmix", maengde: "500 g", soeg: ["grøntsagsmix", "frossen"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 15 },
      { navn: "Hvidløg", maengde: "1 fed", soeg: [], estimeret: true, estimereretPris: 1 },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Kog nudlerne",
      "Steg kylling i strimler på en pande",
      "Tilsæt grøntsagsmix og hvidløg",
      "Vend nudlerne i panden",
      "Smag til og server",
    ]
  },
  {
    id: "kylling-kokos-ris",
    kategorier: ["hverdag"],
    minutter: 30,
    navn: "Nem kylling i kokosmælk",
    kategori: "aftensmad",
    koed: "Kylling",
    portioner: 4,
    ingredienser: [
      { navn: "Kyllingebryst", maengde: "500 g", soeg: ["kyllingebryst", "kyllingebrystfilet", "kylling"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Kokosmælk", maengde: "1 dåse", soeg: ["kokosmælk"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Ris", maengde: "400 g", soeg: ["ris"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 12 },
      { navn: "Frosne ærter", maengde: "300 g", soeg: ["frosne ærter"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Bouillon", maengde: "1 terning", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Karry", maengde: "1 spsk", soeg: [], estimeret: true, estimereretPris: 2 },
    ],
    fremgangsmaade: [
      "Kog risene",
      "Steg kylling i tern",
      "Tilsæt kokosmælk, bouillon, karry og ærter",
      "Lad retten simre 10-12 min",
      "Server med ris",
    ]
  },
  {
    id: "pita-kylling-spinat",
    kategorier: ["fitness"],
    minutter: 20,
    navn: "Pitabrød med kylling og spinat",
    kategori: "aftensmad",
    koed: "Kylling",
    portioner: 4,
    ingredienser: [
      { navn: "Kyllingebryst", maengde: "500 g", soeg: ["kyllingebryst", "kyllingebrystfilet", "kylling"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Pitabrød", maengde: "1 pakke", soeg: ["pitabrød", "pitabroed"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Spinat", maengde: "200 g", soeg: ["spinat"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Creme fraiche", maengde: "2 dl", soeg: ["creme fraiche"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Peberfrugt", maengde: "1 stk", soeg: ["peberfrugt"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Skær kylling i strimler og steg på en pande",
      "Varm pitabrødene",
      "Skær peberfrugt i strimler",
      "Fyld pitabrød med kylling, spinat og peberfrugt",
      "Top med creme fraiche",
    ]
  },
  {
    id: "couscous-kylling-groent",
    kategorier: ["fitness"],
    minutter: 25,
    navn: "Couscous med kylling og grønt",
    kategori: "aftensmad",
    koed: "Kylling",
    portioner: 4,
    ingredienser: [
      { navn: "Kyllingebryst", maengde: "500 g", soeg: ["kyllingebryst", "kyllingebrystfilet", "kylling"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Couscous", maengde: "350 g", soeg: ["couscous"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Frossen grøntsagsmix", maengde: "500 g", soeg: ["grøntsagsmix", "frossen"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 15 },
      { navn: "Bouillon", maengde: "1 terning", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Hvidløg", maengde: "1 fed", soeg: [], estimeret: true, estimereretPris: 1 },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Tilbered couscous med kogende vand og bouillon",
      "Steg kylling i tern på en pande",
      "Tilsæt grøntsagsmix og hvidløg",
      "Vend couscous med kylling og grønt",
      "Smag til og server",
    ]
  },

  // ===== OKSEKØD (udvidet) =====
  {
    id: "okse-pasta-tomatsauce",
    kategorier: ["boernefavorit", "hverdag"],
    minutter: 25,
    navn: "Oksekødspasta i tomatsauce",
    kategori: "aftensmad",
    koed: "Oksekød",
    portioner: 4,
    ingredienser: [
      { navn: "Hakket oksekød", maengde: "500 g", soeg: ["hakket oksekød", "hakket dansk oksekød"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Pasta", maengde: "400 g", soeg: ["pasta", "fusilli", "penne"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 8 },
      { navn: "Tomatpuré", maengde: "1 lille dåse", soeg: ["tomatpuré", "tomatpure"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 7 },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Kog pastaen",
      "Steg hakket oksekød og løg",
      "Tilsæt tomatpuré og hakkede tomater",
      "Lad saucen simre 10 min",
      "Server saucen over pastaen",
    ]
  },
  {
    id: "okse-ris-boenner",
    kategorier: ["fitness"],
    minutter: 25,
    navn: "Oksekød med ris og bønner",
    kategori: "aftensmad",
    koed: "Oksekød",
    portioner: 4,
    ingredienser: [
      { navn: "Hakket oksekød", maengde: "500 g", soeg: ["hakket oksekød", "hakket dansk oksekød"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Ris", maengde: "400 g", soeg: ["ris"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 12 },
      { navn: "Kidneybønner", maengde: "1 dåse", soeg: ["kidneybønner"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 8 },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Paprika", maengde: "1 tsk", soeg: [], estimeret: true, estimereretPris: 1 },
    ],
    fremgangsmaade: [
      "Kog risene",
      "Steg oksekød og løg i en gryde",
      "Tilsæt bønner, hakkede tomater og paprika",
      "Lad retten simre 10 min",
      "Server med ris",
    ]
  },
  {
    id: "okse-tortilla-wraps",
    kategorier: ["boernefavorit"],
    minutter: 25,
    navn: "Oksewraps med bønner",
    kategori: "aftensmad",
    koed: "Oksekød",
    portioner: 4,
    ingredienser: [
      { navn: "Hakket oksekød", maengde: "500 g", soeg: ["hakket oksekød", "hakket dansk oksekød"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Tortilla", maengde: "1 pakke", soeg: ["tortilla"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Sorte bønner", maengde: "1 dåse", soeg: ["sorte bønner"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Creme fraiche", maengde: "2 dl", soeg: ["creme fraiche"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Peberfrugt", maengde: "1 stk", soeg: ["peberfrugt"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Steg oksekød på en pande",
      "Tilsæt sorte bønner og peberfrugt i strimler",
      "Varm tortillaerne kort",
      "Fyld tortillaerne med kødblandingen",
      "Top med creme fraiche og server",
    ]
  },
  {
    id: "okse-kartoffelgryde",
    kategorier: ["storportion", "hverdag"],
    minutter: 45,
    navn: "Oksekødsgryde med kartofler",
    kategori: "aftensmad",
    koed: "Oksekød",
    portioner: 4,
    ingredienser: [
      { navn: "Hakket oksekød", maengde: "500 g", soeg: ["hakket oksekød", "hakket dansk oksekød"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Kartofler", maengde: "800 g", soeg: ["kartofler"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Gulerødder", maengde: "400 g", soeg: ["gulerødder", "gulerodder"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Bouillon", maengde: "1 terning", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Skær kartofler og gulerødder i mindre stykker",
      "Steg oksekød og løg i en gryde",
      "Tilsæt kartofler, gulerødder, bouillon og vand",
      "Lad retten koge 20 min",
      "Smag til og server",
    ]
  },

  // ===== SVINEKØD (udvidet) =====
  {
    id: "grise-pasta-flode",
    kategorier: ["boernefavorit", "hverdag"],
    minutter: 25,
    navn: "Cremet grisepasta",
    kategori: "aftensmad",
    koed: "Svinekød",
    portioner: 4,
    ingredienser: [
      { navn: "Hakket grisekød", maengde: "500 g", soeg: ["hakket grisekød", "hakket dansk grisekød"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Pasta", maengde: "400 g", soeg: ["pasta", "fusilli", "penne"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Madlavningsfløde", maengde: "2,5 dl", soeg: ["madlavningsfløde", "creme fraiche"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Champignon", maengde: "250 g", soeg: ["champignon"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Kog pastaen",
      "Steg grisekød, løg og champignon",
      "Tilsæt madlavningsfløde",
      "Vend pastaen i saucen",
      "Smag til og server",
    ]
  },
  {
    id: "grise-ris-groentsager",
    kategorier: ["fitness"],
    minutter: 25,
    navn: "Grisekød med ris og grøntsager",
    kategori: "aftensmad",
    koed: "Svinekød",
    portioner: 4,
    ingredienser: [
      { navn: "Hakket grisekød", maengde: "500 g", soeg: ["hakket grisekød", "hakket dansk grisekød"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Ris", maengde: "400 g", soeg: ["ris"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 12 },
      { navn: "Frossen grøntsagsmix", maengde: "500 g", soeg: ["grøntsagsmix", "frossen"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 15 },
      { navn: "Hvidløg", maengde: "1 fed", soeg: [], estimeret: true, estimereretPris: 1 },
      { navn: "Paprika", maengde: "1 tsk", soeg: [], estimeret: true, estimereretPris: 1 },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Kog risene",
      "Steg grisekød på en pande",
      "Tilsæt grøntsagsmix, hvidløg og paprika",
      "Steg videre til grøntsagerne er varme",
      "Server med ris",
    ]
  },
  {
    id: "svinekoed-kartoffelpande",
    kategorier: ["hverdag"],
    minutter: 35,
    navn: "Svinepande med kartofler",
    kategori: "aftensmad",
    koed: "Svinekød",
    portioner: 4,
    ingredienser: [
      { navn: "Svinekød", maengde: "500 g", soeg: ["svinekød", "koteletter"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Kartofler", maengde: "800 g", soeg: ["kartofler"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Spinat", maengde: "200 g", soeg: ["spinat"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Creme fraiche", maengde: "2 dl", soeg: ["creme fraiche"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Skær kartofler i små tern og steg møre på en pande",
      "Steg svinekød og løg med kartoflerne",
      "Tilsæt spinat og lad den falde sammen",
      "Vend creme fraiche i til sidst",
      "Smag til og server",
    ]
  },
  {
    id: "poelse-pasta-tomat",
    kategorier: ["billig", "boernefavorit", "hverdag"],
    minutter: 20,
    navn: "Pølsepasta i tomatsauce",
    kategori: "aftensmad",
    koed: "Svinekød",
    portioner: 4,
    ingredienser: [
      { navn: "Pølser", maengde: "400 g", soeg: ["pølser", "medister"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Pasta", maengde: "400 g", soeg: ["pasta", "fusilli", "penne"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 8 },
      { navn: "Tomatpuré", maengde: "1 lille dåse", soeg: ["tomatpuré", "tomatpure"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 7 },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Kog pastaen",
      "Skær pølser i skiver og steg med løg",
      "Tilsæt tomatpuré og hakkede tomater",
      "Lad saucen simre 8-10 min",
      "Server med pasta",
    ]
  },
  {
    id: "bacon-aeggekage-kartofler",
    kategorier: ["hverdag"],
    minutter: 30,
    navn: "Baconæggekage med kartofler",
    kategori: "aftensmad",
    koed: "Svinekød",
    portioner: 4,
    ingredienser: [
      { navn: "Bacon", maengde: "1 pakke", soeg: ["bacon"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Æg", maengde: "8 stk", soeg: ["æg"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Kartofler", maengde: "600 g", soeg: ["kartofler"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Mælk", maengde: "1 dl", soeg: ["mælk", "letmælk"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Kog eller steg kartofler i skiver",
      "Steg bacon og løg på en pande",
      "Pisk æg, mælk, salt og peber sammen",
      "Hæld æggemassen over panden",
      "Lad æggekagen sætte sig ved lav varme",
    ]
  },
  {
    id: "grise-tortilla-pande",
    kategorier: ["boernefavorit"],
    minutter: 25,
    navn: "Grisetortilla på pande",
    kategori: "aftensmad",
    koed: "Svinekød",
    portioner: 4,
    ingredienser: [
      { navn: "Hakket grisekød", maengde: "500 g", soeg: ["hakket grisekød", "hakket dansk grisekød"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Tortilla", maengde: "1 pakke", soeg: ["tortilla"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 8 },
      { navn: "Revet ost", maengde: "100 g", soeg: ["revet ost"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Paprika", maengde: "1 tsk", soeg: [], estimeret: true, estimereretPris: 1 },
    ],
    fremgangsmaade: [
      "Steg grisekød og løg på en pande",
      "Tilsæt hakkede tomater og paprika",
      "Læg tortillaer på bageplade eller pande",
      "Fordel kødet og drys ost over",
      "Varm til osten smelter og server",
    ]
  },

  // ===== ALT (udvidet) =====
  {
    id: "tun-pasta-cremefraiche",
    kategorier: ["billig", "hverdag"],
    minutter: 15,
    navn: "Tunpasta med creme fraiche",
    kategori: "aftensmad",
    koed: "Alt",
    portioner: 4,
    ingredienser: [
      { navn: "Tun", maengde: "2 dåser", soeg: ["tun"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Pasta", maengde: "400 g", soeg: ["pasta", "fusilli", "penne"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Creme fraiche", maengde: "2 dl", soeg: ["creme fraiche"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Frosne ærter", maengde: "300 g", soeg: ["frosne ærter"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Kog pastaen",
      "Varm ærter og løg på en pande",
      "Tilsæt tun og creme fraiche",
      "Vend pastaen i blandingen",
      "Smag til og server",
    ]
  },
  {
    id: "kikaerter-kokos-curry",
    kategorier: ["billig", "storportion", "hverdag"],
    minutter: 25,
    navn: "Kikærtecurry med ris",
    kategori: "aftensmad",
    koed: "Alt",
    portioner: 4,
    ingredienser: [
      { navn: "Kikærter", maengde: "2 dåser", soeg: ["kikærter"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Kokosmælk", maengde: "1 dåse", soeg: ["kokosmælk"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Ris", maengde: "400 g", soeg: ["ris"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 12 },
      { navn: "Spinat", maengde: "200 g", soeg: ["spinat"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 8 },
      { navn: "Karry", maengde: "1 spsk", soeg: [], estimeret: true, estimereretPris: 2 },
    ],
    fremgangsmaade: [
      "Kog risene",
      "Kom kikærter, kokosmælk og hakkede tomater i en gryde",
      "Tilsæt karry og lad simre 10 min",
      "Vend spinat i til sidst",
      "Server med ris",
    ]
  },
  {
    id: "linse-tomat-pasta",
    kategorier: ["hverdag"],
    minutter: 25,
    navn: "Linsepasta i tomatsauce",
    kategori: "aftensmad",
    koed: "Alt",
    portioner: 4,
    ingredienser: [
      { navn: "Linser", maengde: "250 g", soeg: ["linser"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Pasta", maengde: "400 g", soeg: ["pasta", "fusilli", "penne"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 8 },
      { navn: "Gulerødder", maengde: "300 g", soeg: ["gulerødder", "gulerodder"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Bouillon", maengde: "1 terning", soeg: [], estimeret: true, estimereretPris: 2 },
    ],
    fremgangsmaade: [
      "Kog pastaen",
      "Steg løg og revne gulerødder i en gryde",
      "Tilsæt linser, hakkede tomater, bouillon og lidt vand",
      "Lad saucen simre 15-20 min",
      "Server med pasta",
    ]
  },
  {
    id: "aeg-stegte-ris",
    kategorier: ["fitness", "hverdag"],
    minutter: 20,
    navn: "Stegte ris med æg",
    kategori: "aftensmad",
    koed: "Alt",
    portioner: 4,
    ingredienser: [
      { navn: "Ris", maengde: "400 g", soeg: ["ris"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 12 },
      { navn: "Æg", maengde: "6 stk", soeg: ["æg"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Frossen grøntsagsmix", maengde: "500 g", soeg: ["grøntsagsmix", "frossen"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 15 },
      { navn: "Hvidløg", maengde: "1 fed", soeg: [], estimeret: true, estimereretPris: 1 },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Kog risene, eller brug rester fra dagen før",
      "Steg grøntsagsmix og hvidløg på en stor pande",
      "Skub grøntsagerne til siden og rør æggene ud",
      "Tilsæt ris og vend det hele sammen",
      "Smag til og server",
    ]
  },
  {
    id: "kartoffel-broccoli-ostefad",
    kategorier: ["boernefavorit", "hverdag"],
    minutter: 45,
    navn: "Kartoffel- og broccolifad med ost",
    kategori: "aftensmad",
    koed: "Alt",
    portioner: 4,
    ingredienser: [
      { navn: "Kartofler", maengde: "900 g", soeg: ["kartofler"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Broccoli", maengde: "1 stk", soeg: ["broccoli"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Revet ost", maengde: "150 g", soeg: ["revet ost"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Madlavningsfløde", maengde: "2,5 dl", soeg: ["madlavningsfløde", "creme fraiche"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Skær kartofler i tynde skiver og broccoli i buketter",
      "Læg kartofler, broccoli og løg i et fad",
      "Hæld madlavningsfløde over",
      "Top med revet ost",
      "Bag ved 200°C i ca. 30 min",
    ]
  },
  {
    id: "makrel-rugbroed-aeg",
    kategorier: ["fitness", "hverdag"],
    minutter: 15,
    navn: "Rugbrød med makrel og æg",
    kategori: "aftensmad",
    koed: "Alt",
    portioner: 4,
    ingredienser: [
      { navn: "Rugbrød", maengde: "1 pakke", soeg: ["rugbrød", "rugbroed"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Makrel", maengde: "2 dåser", soeg: ["makrel"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Æg", maengde: "6 stk", soeg: ["æg"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Gulerødder", maengde: "300 g", soeg: ["gulerødder", "gulerodder"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Kog æggene 8-10 min",
      "Rist evt. rugbrødet",
      "Fordel makrel på rugbrødet",
      "Top med æg i skiver",
      "Server med gulerødder ved siden af",
    ]
  },
];
