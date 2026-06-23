// ============================================================
// 365DISCOUNT — UGENS TILBUD
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

export const DISCOUNT365_TILBUD: {
  butik: string;
  uge: number;
  varer: Array<{ navn: string; soeg: string[]; pris: number }>;
} = {
  butik: '365discount',
  uge: 0, // <-- ret til aktuel uge (fx 25) når du kender tilbuddene

  varer: [
    // Indsæt ugens tilbud her — slet denne linje og tilføj rigtige varer:
    // { navn: 'Pasta 500g', soeg: ['pasta'], pris: 5 },
  ],
};
