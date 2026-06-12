// Delt basispris-opslag — bruges i modal-estimater og edge function
// Søgeord er lowercase, pris er pakkepris i kr
export const BASISPRISER: Array<{ soeg: string[]; pris: number }> = [
  { soeg: ["havregryn"], pris: 8 },
  { soeg: ["rugbrød", "rugbroed"], pris: 12 },
  { soeg: ["toastbrød", "toastbroed"], pris: 12 },
  { soeg: ["hvedemel"], pris: 13 },
  { soeg: ["sukker"], pris: 13 },
  { soeg: ["rasp"], pris: 13 },
  { soeg: ["spaghetti"], pris: 9 },
  { soeg: ["fuldkornspasta"], pris: 12 },
  { soeg: ["pasta", "pastaskruer", "penne", "fusilli"], pris: 6 },
  { soeg: ["lasagneplader"], pris: 10 },
  { soeg: ["jasminris", "jasmin ris"], pris: 15 },
  { soeg: ["basmatiris", "basmati"], pris: 17 },
  { soeg: ["parboiled"], pris: 12 },
  { soeg: ["ris"], pris: 12 },
  { soeg: ["couscous"], pris: 15 },
  { soeg: ["bulgur"], pris: 18 },
  { soeg: ["nudler"], pris: 17 },
  { soeg: ["søde kartofler", "sode kartofler"], pris: 27 },
  { soeg: ["kartofler"], pris: 8 },
  { soeg: ["tortilla"], pris: 17 },
  { soeg: ["pitabrød", "pitabroed"], pris: 15 },
  { soeg: ["letmælk", "letmaelk", "skummetmælk", "sødmælk", "sodmaelk", "mælk", "maelk", "minimælk"], pris: 11 },
  { soeg: ["yoghurt naturel"], pris: 17 },
  { soeg: ["skyr", "a38"], pris: 26 },
  { soeg: ["yoghurt"], pris: 17 },
  { soeg: ["creme fraiche", "cremefine", "madlavningsfløde", "madlavningsfloede"], pris: 12 },
  { soeg: ["hytteost"], pris: 23 },
  { soeg: ["smørbar", "smorbar", "lurpak"], pris: 18 },
  { soeg: ["smør", "smor"], pris: 27 },
  { soeg: ["mozzarella"], pris: 21 },
  { soeg: ["revet ost"], pris: 21 },
  { soeg: ["ost"], pris: 50 },
  { soeg: ["æg", "aeg", "skrabeæg"], pris: 32 },
  { soeg: ["hakket oksekød", "hakket okse"], pris: 47 },
  { soeg: ["hakket grisekød", "hakket grise", "hakket dansk grise"], pris: 30 },
  { soeg: ["hakket kylling"], pris: 27 },
  { soeg: ["kyllingebryst", "kyllingebrystfilet", "kyllingeinderfilet", "kyllingelår", "kyllingeoverlår", "kylling"], pris: 35 },
  { soeg: ["oksekød", "okse", "herregårdsbøffer", "bøffer"], pris: 42 },
  { soeg: ["svinekød", "grisekød", "koteletter", "medister"], pris: 30 },
  { soeg: ["bacon"], pris: 18 },
  { soeg: ["skinke"], pris: 18 },
  { soeg: ["pølser"], pris: 26 },
  { soeg: ["leverpostej"], pris: 14 },
  { soeg: ["fiskefrikadeller"], pris: 30 },
  { soeg: ["laks", "laksefilet"], pris: 40 },
  { soeg: ["rødspætte", "fiskefileter"], pris: 25 },
  { soeg: ["tun"], pris: 12 },
  { soeg: ["makrel"], pris: 13 },
  { soeg: ["hakkede tomater", "dåsetomater"], pris: 8 },
  { soeg: ["flåede tomater"], pris: 8 },
  { soeg: ["passata"], pris: 14 },
  { soeg: ["tomatpuré", "tomatpure"], pris: 7 },
  { soeg: ["kidneybønner"], pris: 9 },
  { soeg: ["sorte bønner"], pris: 11 },
  { soeg: ["kikærter"], pris: 9 },
  { soeg: ["linser"], pris: 19 },
  { soeg: ["kokosmælk", "kokosmælk"], pris: 14 },
  { soeg: ["bouillon"], pris: 1 },
  { soeg: ["gulerødder", "gulerodder"], pris: 17 },
  { soeg: ["løg", "log"], pris: 3 },
  { soeg: ["hvidløg", "hvidlog"], pris: 6 },
  { soeg: ["broccoli"], pris: 15 },
  { soeg: ["blomkål", "blomkal"], pris: 22 },
  { soeg: ["champignon"], pris: 11 },
  { soeg: ["peberfrugt", "pebre"], pris: 27 },
  { soeg: ["spinat"], pris: 8 },
  { soeg: ["squash"], pris: 6 },
  { soeg: ["frosne ærter", "frosne aerter"], pris: 14 },
  { soeg: ["frossen", "grøntsagsmix"], pris: 15 },
  { soeg: ["rapsolie", "raps"], pris: 24 },
  { soeg: ["piskefløde", "piskeflode", "fløde", "flode"], pris: 20 },
];

// Matcher søgeord ved ord-START: 'ris' rammer "ris" og "risengrød", men
// ikke "grisekød" eller "jasminris". Simpel substring gav falske hits —
// fx blev hakket grisekød prissat som ris (12 kr) fordi "grisekød"
// indeholder bogstaverne r-i-s.
export function matcherSoegeord(tekst: string, soegeord: string): boolean {
  const norm = (s: string) =>
    ' ' + s.toLowerCase().replace(/[^a-z0-9æøåé]+/g, ' ').trim() + ' ';
  const t = norm(tekst);
  const k = norm(soegeord);
  // Behold foranstillet mellemrum, drop afsluttende → søgeordet skal
  // starte et ord, men må gerne være starten af et længere ord
  return t.includes(k.substring(0, k.length - 1));
}

export function slagBasispris(navn: string): number | null {
  for (const entry of BASISPRISER) {
    if (entry.soeg.some(s => matcherSoegeord(navn, s))) return entry.pris;
  }
  return null;
}

export function slåPrisOp(ing: {
  estimeret?: boolean;
  estimereretPris?: number;
  soeg?: string[];
  navn: string;
}): number {
  if (ing.estimeret && ing.estimereretPris != null) return ing.estimereretPris;
  for (const s of (ing.soeg ?? [])) {
    const p = slagBasispris(s);
    if (p != null) return p;
  }
  const p = slagBasispris(ing.navn);
  if (p != null) return p;
  return 15;
}
