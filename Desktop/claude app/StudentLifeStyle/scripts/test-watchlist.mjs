// JS-spejl af term-normalisering (lib/watchlist.ts) og matchning (matcherSoegeord).
// Holdes i synk med kilden manuelt. Kør: node scripts/test-watchlist.mjs

const ENHEDS_ORD = new Set(['g','kg','l','ml','cl','dl','stk','pk','pakke','ca','x','liter','gram']);
function normaliserNavn(navn) {
  return (navn ?? '').toLowerCase()
    .replace(/[^a-zæøå0-9]+/g, ' ')
    .split(' ')
    .filter(w => w && !ENHEDS_ORD.has(w) && !/^\d+([.,]\d+)?$/.test(w))
    .join(' ').trim();
}
function termFraTilbud(navn) { return normaliserNavn(navn).split(' ').slice(0, 2).join(' '); }
function termFraFritekst(tekst) { return normaliserNavn(tekst); }

// matcherSoegeord — kopi af constants/basispriser.ts (ord-start; ≤3 tegn = helt ord)
function matcherSoegeord(tekst, soegeord) {
  const norm = (s) => ' ' + s.toLowerCase().replace(/[^a-z0-9æøåé]+/g, ' ').trim() + ' ';
  const t = norm(tekst), k = norm(soegeord);
  if (k.trim().length <= 3) return t.includes(k);
  return t.includes(k.substring(0, k.length - 1));
}

let ok = 0, fejl = 0;
function er(navn, faktisk, forventet) {
  const pass = faktisk === forventet;
  pass ? ok++ : fejl++;
  console.log(`${pass ? 'OK  ' : 'FEJL'}  ${navn}  (fik ${JSON.stringify(faktisk)}, forventet ${JSON.stringify(forventet)})`);
}

// term-normalisering
er("Faxe Kondi fra tilbud", termFraTilbud("Faxe Kondi Booster 1,5 L"), "faxe kondi");
er("Lurpak fra tilbud",     termFraTilbud("Lurpak Smør 200 g"),         "lurpak smør");
er("Fritekst trimmer",      termFraFritekst("  Faxe   Kondi  "),         "faxe kondi");
er("Fritekst dropper enhed",termFraFritekst("Mælk 1 liter"),             "mælk");

// matchning: en watch-term mod et tilbudsnavn
er("Faxe matcher booster",  matcherSoegeord("Faxe Kondi Booster 1,5L", "faxe kondi"), true);
er("Faxe matcher kort",     matcherSoegeord("Faxe Kondi 1,5L",          "faxe kondi"), true);
er("Lurpak matcher",        matcherSoegeord("Lurpak Smør 200g",         "lurpak smør"), true);
er("Pepsi != Faxe",         matcherSoegeord("Pepsi Max 1,5L",           "faxe kondi"), false);

console.log(`\n${ok} OK, ${fejl} fejl`);
if (fejl > 0) process.exit(1);
