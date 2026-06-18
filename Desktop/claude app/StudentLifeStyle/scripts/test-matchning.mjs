// Kørbar regressions-test for pris-motorens to rene funktioner.
// Kør:  node scripts/test-matchning.mjs
//
// BAGGRUND: scripts/test-tilbud.ts kan ikke køres her, fordi den trækker
// react-native ind via Supabase-klienten. Disse to funktioner er rene og
// uden imports, så de testes her som et JS-spejl. SPEJLENE SKAL HOLDES I SYNK
// med kilden:
//   - matcherSoegeord  → constants/basispriser.ts
//   - erPrEnhed        → constants/tilbudspriser.ts
// Reglerne de beskytter (begge fundet under tag-auditten juni 2026):
//   1) Korte generiske søgeord (≤3 tegn) må kun matche HELE ord — ellers
//      rammer fx 'mel' ordet 'melon' og giver forkerte priser.
//   2) Pr-enhed-tilbud ("pr. 100g", "pr. 1/2 kg", "pr. stk.") er ikke en
//      pakkepris og må ikke prissætte recept-ingredienser.

function matcherSoegeord(tekst, soegeord) {
  const norm = (s) => ' ' + s.toLowerCase().replace(/[^a-z0-9æøåé]+/g, ' ').trim() + ' ';
  const t = norm(tekst);
  const k = norm(soegeord);
  if (k.trim().length <= 3) return t.includes(k);     // helt ord
  return t.includes(k.substring(0, k.length - 1));    // starten af et ord
}

const PR_ENHED_RE = /\bpr\.\s*(\d|½|stk|kuvert|kg)/i;
function erPrEnhed(navn) {
  return PR_ENHED_RE.test(navn ?? '');
}

let antalOk = 0;
let antalFejl = 0;
function tjek(beskrivelse, faktisk, forventet) {
  const ok = faktisk === forventet;
  if (ok) antalOk++; else antalFejl++;
  console.log(`${ok ? 'OK  ' : 'FEJL'}  ${beskrivelse}  (fik ${faktisk}, forventet ${forventet})`);
}

console.log('=== matcherSoegeord: brede stammer (≥4 tegn) skal stadig ramme sammensatte ord ===');
tjek("'okse' → 'hakket oksekød'",   matcherSoegeord('hakket oksekød', 'okse'), true);
tjek("'oksekød' → 'hakket oksekød'", matcherSoegeord('hakket oksekød', 'oksekød'), true);
tjek("'laks' → 'laksefilet'",        matcherSoegeord('laksefilet', 'laks'), true);
tjek("'kylling' → 'hakket kylling'", matcherSoegeord('hakket kylling', 'kylling'), true);
tjek("'gris' → 'grisekød'",          matcherSoegeord('grisekød', 'gris'), true);

console.log('\n=== matcherSoegeord: korte ord (≤3 tegn) kun som HELT ord ===');
tjek("'ost' → 'revet ost' (helt ord)", matcherSoegeord('revet ost', 'ost'), true);
tjek("'æg' → 'æg'",                     matcherSoegeord('æg', 'æg'), true);
tjek("'mel' ✗ 'melon'",                 matcherSoegeord('melon', 'mel'), false);
tjek("'is' ✗ 'iste'",                   matcherSoegeord('iste', 'is'), false);
tjek("'løg' ✗ 'løgismose'",             matcherSoegeord('løgismose', 'løg'), false);
tjek("'ost' ✗ 'flødeost' (sammensat)",  matcherSoegeord('flødeost', 'ost'), false);
tjek("'ost' ✗ 'ostepop'",               matcherSoegeord('ostepop', 'ost'), false);

console.log('\n=== erPrEnhed: pr-enhed-tilbud genkendes (skal udelukkes fra prissætning) ===');
tjek("'Laksefilet pr. 100g'",            erPrEnhed('Laksefilet pr. 100g'), true);
tjek("'Okseculotte pr. 1/2 kg'",         erPrEnhed('Okseculotte pr. 1/2 kg'), true);
tjek("'Frugtmarked pr. stk.'",           erPrEnhed('Frugtmarked pr. stk.'), true);
tjek("'Luksus grillmenu pr. kuvert'",    erPrEnhed('Luksus grillmenu pr. kuvert'), true);

console.log('\n=== erPrEnhed: normale pakker er IKKE pr-enhed ===');
tjek("'Velsmag hakket oksekød 400g'",    erPrEnhed('Velsmag hakket oksekød 14-18% 400g'), false);
tjek("'Laksefilet 225g' (pakke)",        erPrEnhed('Laksefilet 225g'), false);
tjek("'Premieur ... rejer' ('Pr' i ord)", erPrEnhed('Premieur grønlandske rejer 300-330g'), false);
tjek("'Rummo pasta 500g'",               erPrEnhed('Rummo pasta 500g'), false);

console.log(`\n${antalOk} OK, ${antalFejl} fejl`);
if (antalFejl > 0) process.exit(1);
