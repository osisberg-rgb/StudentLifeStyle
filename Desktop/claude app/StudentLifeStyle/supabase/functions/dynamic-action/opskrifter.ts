// Opskriftsbog — organiseret efter kødkategori
// AI'en filtrerer automatisk baseret på brugerens kødpræferencer

export const OPSKRIFTER = [

  // ===== OKSEKØD =====
  {
    id: "pasta-kodsovs-okse",
    navn: "Pasta med kødsovs",
    kategori: "aftensmad",
    koed: "Oksekød",
    portioner: 4,
    ingredienser: [
      { navn: "Hakket oksekød", maengde: "400-500 g", soeg: ["hakket oksekød", "hakket dansk oksekød", "hakket oksekød 15-18%", "hakket oksekød 4-7%", "hakket oksekød med 35% grønt"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater", "tomat"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 6 },
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
    navn: "Chili con carne med ris",
    kategori: "aftensmad",
    koed: "Oksekød",
    portioner: 4,
    ingredienser: [
      { navn: "Hakket oksekød", maengde: "400-500 g", soeg: ["hakket oksekød", "hakket dansk oksekød", "hakket oksekød 15-18%", "hakket oksekød 4-7%", "hakket oksekød med 35% grønt"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater", "tomat"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 6 },
      { navn: "Ris", maengde: "500 g", soeg: ["ris"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 15 },
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
    navn: "Kyllingefad med ris",
    kategori: "aftensmad",
    koed: "Kylling",
    portioner: 4,
    ingredienser: [
      { navn: "Kylling", maengde: "500 g", soeg: ["kyllingebryst", "kyllingebrystfilet", "kylling", "kyllingelår"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater", "tomat"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 6 },
      { navn: "Mælk", maengde: "2 dl", soeg: ["mælk", "letmælk", "sødmælk"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Bouillonterning", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Ris", maengde: "500 g", soeg: ["ris"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 15 },
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
    navn: "Koteletter med ris og tomatsovs",
    kategori: "aftensmad",
    koed: "Svinekød",
    portioner: 4,
    ingredienser: [
      { navn: "Koteletter", maengde: "400 g", soeg: ["koteletter", "hakket grisekød eller koteletter", "hakket grise- og kalvekød, koteletter"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Løg", maengde: "1 stk", soeg: [], estimeret: true, estimereretPris: 2 },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater", "tomat"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 6 },
      { navn: "Ris", maengde: "500 g", soeg: ["ris"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 15 },
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
    navn: "Pasta med kødsovs",
    kategori: "aftensmad",
    koed: "Alt",
    portioner: 4,
    ingredienser: [
      { navn: "Hakket kød", maengde: "500 g", soeg: ["hakket grisekød", "hakket dansk grisekød", "hakket oksekød", "hakket grise- og kalvekød", "hakket grise", "hakket kød"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Pasta", maengde: "500 g", soeg: ["pasta", "spaghetti", "pastaskruer"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater", "tomat"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 6 },
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
    navn: "Pasta med kødsovs og grønt",
    kategori: "aftensmad",
    koed: "Alt",
    portioner: 3,
    ingredienser: [
      { navn: "Hakket kød med grønt", maengde: "400 g", soeg: ["hakket oksekød med 35% grønt", "hakket grisekød", "hakket dansk grisekød", "hakket grise- og kalvekød"], vaelgBilligstPerKg: true, estimeret: false },
      { navn: "Pasta", maengde: "400 g", soeg: ["pasta", "spaghetti", "pastaskruer"], vaelgBilligstPerKg: false, estimeret: false },
      { navn: "Hakkede tomater", maengde: "1 dåse (400 g)", soeg: ["hakkede tomater", "dåsetomater", "tomat"], vaelgBilligstPerKg: false, estimeret: true, estimereretPris: 6 },
      { navn: "Salt og peber", maengde: "lidt", soeg: [], estimeret: true, estimereretPris: 0 },
    ],
    fremgangsmaade: [
      "Brun hakket kød og krydr",
      "Tilsæt tomater og simr 15 min",
      "Kog pasta og bland med sovsen"
    ]
  },
];
