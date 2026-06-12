// Test af tilbuds-systemet — kør med:  npx tsx scripts/test-tilbud.ts
// Verificerer at ugens tilbudsfil i constants/tilbud/rema1000.ts slår igennem.
// Pris-forventningerne læses fra tilbudsfilen, så testene overlever de
// ugentlige avis-opdateringer.
import { OPSKRIFTER } from '../constants/opskrifter';
import { BASISPRISER, slagBasispris, slåPrisOp, matcherSoegeord } from '../constants/basispriser';
import { slåEffektivPrisOp, aktiveTilbud, aktuelUge } from '../constants/tilbudspriser';
import { bygIndkøbsliste, beregnBesparelse } from '../constants/indkoeb';
import { hentOpskriftPriser } from '../constants/opskriftPriser';
import { KATEGORIER } from '../constants/kategorier';
import { findAnbefaledeRetter, måltiderPrRet, MAKS_RETTER, UGE_MAAL } from '../constants/anbefaling';
import { beregnPlanBesparelse, beregnSamletBesparelse, beregnPlanPris, byggUgeSerie, formatKr } from '../constants/besparelse';

let fejl = 0;
function tjek(navn: string, ok: boolean, detalje = '') {
  console.log(`${ok ? '[OK]  ' : '[FEJL]'} ${navn}${detalje ? ' — ' + detalje : ''}`);
  if (!ok) fejl++;
}

console.log('=== 1. Tilbudskilde aktiv? ===');
console.log(`Aktuel uge: ${aktuelUge()}`);
tjek('Mindst én tilbudskilde aktiv for denne uge', aktiveTilbud().length >= 1,
  `${aktiveTilbud().length} aktiv(e) kilde(r): ${aktiveTilbud().map(k => k.butik).join(', ')}`);

console.log('\n=== 2. Ordgrænse-matcher (unit tests) ===');
tjek(`'ris' rammer "Ris"`, matcherSoegeord('Ris', 'ris'));
tjek(`'ris' rammer "risengrød"`, matcherSoegeord('risengrød', 'ris'));
tjek(`'ris' rammer IKKE "grisekød"`, !matcherSoegeord('hakket grisekød', 'ris'));
tjek(`'ris' rammer IKKE "jasminris"`, !matcherSoegeord('jasminris', 'ris'));
tjek(`'ris' rammer IKKE "frisk spinat"`, !matcherSoegeord('frisk spinat', 'ris'));
tjek(`'kylling' rammer "kyllingebryst"`, matcherSoegeord('kyllingebryst', 'kylling'));
tjek(`'hakket okse' rammer "hakket oksekød 4-7%"`, matcherSoegeord('hakket oksekød 4-7%', 'hakket okse'));

console.log('\n=== 3. Grisekød-bug fikset? ===');
tjek(`slagBasispris('hakket grisekød') = 30 (var 12 = ris-prisen!)`,
  slagBasispris('hakket grisekød') === 30, `fik ${slagBasispris('hakket grisekød')}`);

console.log('\n=== 4. Basispris-ændringer fra matcher-fix (gammel → ny) ===');
function gammelSlagBasispris(navn: string): number | null {
  const lower = navn.toLowerCase();
  for (const entry of BASISPRISER) {
    if (entry.soeg.some(s => lower.includes(s))) return entry.pris;
  }
  return null;
}
function gammelSlåPrisOp(ing: any): number {
  if (ing.estimeret && ing.estimereretPris != null) return ing.estimereretPris;
  for (const s of (ing.soeg ?? [])) {
    const p = gammelSlagBasispris(s);
    if (p != null) return p;
  }
  return gammelSlagBasispris(ing.navn) ?? 15;
}
const set = new Set<string>();
let ændringer = 0;
for (const o of OPSKRIFTER) {
  for (const ing of o.ingredienser as any[]) {
    const nøgle = ing.navn.toLowerCase();
    if (set.has(nøgle)) continue;
    set.add(nøgle);
    const gammel = gammelSlåPrisOp(ing);
    const ny = slåPrisOp(ing);
    if (gammel !== ny) {
      ændringer++;
      console.log(`  ${ing.navn.padEnd(28)} ${String(gammel).padStart(3)} kr → ${String(ny).padStart(3)} kr`);
    }
  }
}
if (ændringer === 0) console.log('  (ingen ændringer)');

console.log('\n=== 5. Effektive priser — alle ingredienser på tilbud ===');
const påTilbud: Array<{ navn: string; normalpris: number; pris: number; butik: string | null }> = [];
const set2 = new Set<string>();
for (const o of OPSKRIFTER) {
  for (const ing of o.ingredienser as any[]) {
    const nøgle = ing.navn.toLowerCase();
    if (set2.has(nøgle)) continue;
    set2.add(nøgle);
    const e = slåEffektivPrisOp(ing);
    if (e.paaTilbud) {
      påTilbud.push({ navn: ing.navn, normalpris: e.normalpris, pris: e.pris, butik: e.butik });
      console.log(`  ${ing.navn.padEnd(28)} ${String(e.normalpris).padStart(3)} kr → ${String(e.pris).padStart(3)} kr  (${e.butik})`);
    }
  }
}

const find = (ord: string) => påTilbud.filter(v => v.navn.toLowerCase().includes(ord));
tjek('Mindst ét af ugens tilbud slår igennem i priserne', påTilbud.length > 0,
  `${påTilbud.length} varer på tilbud`);
// Med flere butikker vinder den BILLIGSTE matchende vare — så invariansen
// er: den effektive pris er aldrig HØJERE end nogen matchende tilbudsvare.
// En vare uden match springes over — enten bruges den ikke i nogen
// opskrift, eller tilbuddet er dyrere end basis.
for (const kilde of aktiveTilbud()) {
  for (const vare of kilde.varer) {
    const ramt = påTilbud.filter(v => vare.soeg.some(s => v.navn.toLowerCase().includes(s)));
    if (ramt.length === 0) continue;
    tjek(`${kilde.butik} / ${vare.navn}: effektiv pris ≤ ${vare.pris} kr`,
      ramt.every(v => v.pris <= vare.pris),
      ramt.map(v => `${v.navn}=${v.pris}`).join(', '));
  }
}
// Ris-buggen ('grisekød' matchede 'ris'): grise-varer må kun være på tilbud
// til en pris der faktisk findes i en grise-/svine-tilbudsvare
const griseTilbudspriser = new Set(
  aktiveTilbud().flatMap(k => k.varer)
    .filter(v => v.soeg.some(s => s.includes('grise') || s.includes('svin')))
    .map(v => v.pris)
);
const grisePåTilbud = find('grise');
tjek('Grise-varer på tilbud matcher en ægte grise-tilbudspris (ikke ris-buggen)',
  grisePåTilbud.every(v => griseTilbudspriser.has(v.pris)),
  grisePåTilbud.map(v => `${v.navn}=${v.pris}`).join(', ') || 'ingen grise-varer på tilbud');

console.log('\n=== 6. Indkøbsliste med tilbud ===');
const liste = bygIndkøbsliste(['kylling-ris-tomatgryde', 'pita-kylling-spinat', 'pasta-kodsovs-okse']);
for (const sektion of liste) {
  console.log(`  --- ${sektion.butik} (${sektion.subtotal} kr) ---`);
  for (const v of sektion.varer) {
    const tag = v.paa_tilbud ? `  TILBUD ${v.butik}: ${v.normalpris} kr → ${v.pris} kr` : '';
    console.log(`  ${v.vare.padEnd(28)} ${String(v.pris).padStart(3)} kr${tag}`);
  }
}
const total = liste.reduce((s, b) => s + b.subtotal, 0);
const spar = beregnBesparelse(liste);
console.log(`  Total: ${total} kr · Besparelse: ${spar} kr`);

const alleVarer = liste.flatMap(s => s.varer);
tjek('Listen indeholder tilbudsvarer', alleVarer.some(v => v.paa_tilbud));
tjek('Besparelse > 0', spar > 0, `${spar} kr`);
// Forventet pris = motorens eget opslag (billigste på tværs af butikker)
const okseEffektiv = slåEffektivPrisOp({ navn: 'Hakket oksekød', soeg: ['hakket oksekød', 'hakket okse'] });
if (okseEffektiv.paaTilbud) {
  tjek(`Hakket oksekød i listen til billigste tilbudspris ${okseEffektiv.pris} kr/pakke (${okseEffektiv.butik})`,
    alleVarer.some(v => v.vare.toLowerCase().includes('hakket oksekød') && v.pris / v.antal_pakker === okseEffektiv.pris));
}

console.log('\n=== 7. Butiks-filter ===');
const kunRema = bygIndkøbsliste(['pasta-kodsovs-okse'], ['Rema 1000']);
const kunNetto = bygIndkøbsliste(['pasta-kodsovs-okse'], ['Netto']);
const remaVarer = kunRema.flatMap(s => s.varer).filter(v => v.paa_tilbud);
const nettoVarer = kunNetto.flatMap(s => s.varer).filter(v => v.paa_tilbud);
tjek('Med kun Rema 1000 valgt: alle tilbud kommer fra Rema 1000',
  remaVarer.every(v => v.butik === 'Rema 1000'),
  `${remaVarer.length} varer, butikker: ${[...new Set(remaVarer.map(v => v.butik))].join(', ') || 'ingen'}`);
tjek('Med kun Netto valgt: alle tilbud kommer fra Netto',
  nettoVarer.every(v => v.butik === 'Netto'),
  `${nettoVarer.length} varer, butikker: ${[...new Set(nettoVarer.map(v => v.butik))].join(', ') || 'ingen'}`);
// Union af butikker vælger den laveste pris pr. vare — kan aldrig være dyrere
// end nogen enkelt butik alene
const alleButikkerTotal = bygIndkøbsliste(['pasta-kodsovs-okse']).reduce((s, b) => s + b.subtotal, 0);
tjek('Alle butikker samlet er ≤ enhver enkelt butik',
  alleButikkerTotal <= kunRema.reduce((s, b) => s + b.subtotal, 0) &&
  alleButikkerTotal <= kunNetto.reduce((s, b) => s + b.subtotal, 0),
  `${alleButikkerTotal} kr vs Rema ${kunRema.reduce((s, b) => s + b.subtotal, 0)} / Netto ${kunNetto.reduce((s, b) => s + b.subtotal, 0)} kr`);

console.log('\n=== 8. Forudberegnede opskriftpriser ===');
const retPriser = hentOpskriftPriser();
const retterPåTilbud = [...retPriser.entries()].filter(([, p]) => p.paaTilbud);
console.log(`  ${retterPåTilbud.length} af ${retPriser.size} opskrifter har tilbud:`);
for (const [id, p] of retterPåTilbud.slice(0, 8)) {
  console.log(`  ${id.padEnd(28)} ${String(p.normalpris).padStart(3)} kr → ${String(p.pris).padStart(3)} kr  (spar ${p.besparelse}, ${p.butikker.join('+')})`);
}
tjek('Mindst 5 opskrifter markeret på tilbud', retterPåTilbud.length >= 5, `${retterPåTilbud.length} stk`);
tjek('pasta-kodsovs-okse på tilbud (hakket oksekød i ugens avis)',
  retPriser.get('pasta-kodsovs-okse')?.paaTilbud === true,
  `besparelse ${retPriser.get('pasta-kodsovs-okse')?.besparelse} kr`);
// Flere butikker → pris pr. vare ≤ → besparelsen kan kun blive større
const nettoPriser = hentOpskriftPriser(['Netto']);
const besparelseAlle = retPriser.get('pasta-kodsovs-okse')?.besparelse ?? 0;
const besparelseNetto = nettoPriser.get('pasta-kodsovs-okse')?.besparelse ?? 0;
tjek('Flere butikker giver mindst lige så stor besparelse som kun Netto',
  besparelseAlle >= besparelseNetto, `${besparelseAlle} kr vs ${besparelseNetto} kr`);
const cacheStart = Date.now();
for (let i = 0; i < 10_000; i++) hentOpskriftPriser();
tjek('10.000 opslag i forudberegnet cache under 100 ms', Date.now() - cacheStart < 100,
  `${Date.now() - cacheStart} ms`);

console.log('\n=== 9. Ydeevne (anbefalings-søgningen laver ~1 mio. opslag) ===');
const alleIngredienser = OPSKRIFTER.flatMap(o => o.ingredienser as any[]);
const start = Date.now();
for (let i = 0; i < 1_000_000; i++) {
  slåEffektivPrisOp(alleIngredienser[i % alleIngredienser.length]);
}
const ms = Date.now() - start;
console.log(`  1.000.000 prisopslag: ${ms} ms`);
tjek('1 mio. opslag under 2 sekunder (cache virker)', ms < 2000, `${ms} ms`);

console.log('\n=== 10. Kategorier ===');
const gyldigeIds = new Set(KATEGORIER.map(k => k.id as string));
const udenKategori = OPSKRIFTER.filter(o => !(o as any).kategorier?.length);
const ugyldigeTags = OPSKRIFTER.flatMap(o =>
  ((o as any).kategorier ?? []).filter((k: string) => !gyldigeIds.has(k)).map((k: string) => `${o.id}: "${k}"`)
);
tjek('Alle opskrifter har mindst 1 kategori', udenKategori.length === 0,
  udenKategori.map(o => o.id).join(', ') || 'alle tagget');
tjek('Ingen ugyldige kategori-tags', ugyldigeTags.length === 0, ugyldigeTags.join(', ') || 'alle gyldige');
for (const k of KATEGORIER) {
  const antal = OPSKRIFTER.filter(o => ((o as any).kategorier ?? []).includes(k.id)).length;
  tjek(`"${k.navn}" har mindst 2 retter`, antal >= 2, `${antal} retter`);
}
for (const koed of ['Kylling', 'Oksekød', 'Svinekød']) {
  const tilgængelige = OPSKRIFTER.filter(o => o.koed === koed || o.koed === 'Alt');
  const tynde = KATEGORIER.filter(k =>
    tilgængelige.filter(o => ((o as any).kategorier ?? []).includes(k.id)).length < 2
  );
  tjek(`Kost "${koed}": alle kategorier har ≥2 retter`, tynde.length === 0,
    tynde.map(k => k.navn).join(', ') || 'ok');
}

console.log('\n=== 11. Portions-skalering ===');
const totalAf = (l: ReturnType<typeof bygIndkøbsliste>) => l.reduce((s, b) => s + b.subtotal, 0);
const idsP = ['kylling-ris-tomatgryde', 'pita-kylling-spinat', 'pasta-kodsovs-okse'];

const l4 = bygIndkøbsliste(idsP, undefined, 4);
tjek('4 personer = basis (opskrifterne er skrevet til 4)',
  totalAf(l4) === totalAf(bygIndkøbsliste(idsP)), `${totalAf(l4)} kr`);

const l6 = bygIndkøbsliste(idsP, undefined, 6);
tjek('6 personer koster mere end 4', totalAf(l6) > totalAf(l4),
  `${totalAf(l4)} kr → ${totalAf(l6)} kr`);

const okse6 = l6.flatMap(s => s.varer).find(v => v.vare.toLowerCase() === 'hakket oksekød');
tjek('Hakket oksekød ved 6 pers = 2 pakker (ceil af 1,5)',
  okse6?.antal_pakker === 2, `${okse6?.antal_pakker} pakker, ${okse6?.pris} kr`);

const l2 = bygIndkøbsliste(idsP, undefined, 2);
tjek('2 personer ≤ 4 personer (delte ingredienser = delte pakker)',
  totalAf(l2) <= totalAf(l4) && totalAf(l2) > 0, `${totalAf(l2)} kr vs ${totalAf(l4)} kr`);

const solo2 = bygIndkøbsliste(['pasta-kodsovs-okse'], undefined, 2);
const solo4 = bygIndkøbsliste(['pasta-kodsovs-okse'], undefined, 4);
tjek('Enkelt ret, 2 pers = samme pakker som 4 (man køber hele pakker)',
  totalAf(solo2) === totalAf(solo4), `${totalAf(solo2)} kr`);

const lDelt = bygIndkøbsliste(['pasta-kodsovs-okse', 'okse-pasta-tomatsauce'], undefined, 2);
const pastaDelt = lDelt.flatMap(s => s.varer).find(v => v.vare.toLowerCase() === 'pasta');
tjek('2 pers, 2 pastaretter: deler ÉN pakke pasta (0,5 + 0,5 behov)',
  pastaDelt?.antal_pakker === 1, `${pastaDelt?.antal_pakker} pakke(r)`);

const p4 = hentOpskriftPriser(undefined, 4).get('pasta-kodsovs-okse')!;
const p6 = hentOpskriftPriser(undefined, 6).get('pasta-kodsovs-okse')!;
tjek('Opskriftpris ved 6 pers = 2× opskriften',
  p6.gangeOpskrift === 2 && p6.pris === p4.pris * 2, `${p4.pris} kr → ${p6.pris} kr`);
tjek('Portioner skalerer med (4 → 8)', p6.portioner === 8, `${p6.portioner} portioner`);

console.log('\n=== 12. Ugeplan-anbefaling (fyld ugen) ===');
tjek('4 portioner / 2 personer = 2 aftener', måltiderPrRet(4, 2) === 2);
tjek('8 portioner / 6 personer = 1 aften (rest tæller ikke)', måltiderPrRet(8, 6) === 1);
tjek('4 portioner / 1 person = 4 aftener', måltiderPrRet(4, 1) === 4);

function planStatus(ids: string[], personer: number) {
  const priser = hentOpskriftPriser(undefined, personer);
  let pris = 0, måltider = 0;
  for (const id of ids) {
    const info = priser.get(id)!;
    pris += info.pris;
    måltider += måltiderPrRet(info.portioner, personer);
  }
  return { pris, måltider };
}

const fam = findAnbefaledeRetter(OPSKRIFTER, 350, undefined, 4);
const famStatus = planStatus(fam, 4);
tjek('Familie (4 pers, 350 kr): fylder ugen med 7 måltider',
  famStatus.måltider === UGE_MAAL, `${fam.length} retter, ${famStatus.måltider} måltider`);
tjek('Familie-plan holder budgettet', famStatus.pris <= 350, `${famStatus.pris} kr`);

const par = findAnbefaledeRetter(OPSKRIFTER, 200, undefined, 2);
const parStatus = planStatus(par, 2);
tjek('Par (2 pers, 200 kr): færre retter dækker ugen via rester',
  parStatus.måltider >= UGE_MAAL && par.length <= 4,
  `${par.length} retter, ${parStatus.måltider} måltider, ${parStatus.pris} kr`);

const rig = findAnbefaledeRetter(OPSKRIFTER, 9999, undefined, 4);
tjek('Højst 7 retter uanset budget', rig.length <= MAKS_RETTER, `${rig.length} retter`);

const fattig = findAnbefaledeRetter(OPSKRIFTER, 10, undefined, 4);
tjek('For lille budget: anbefaler stadig de 2 billigste', fattig.length === 2,
  `${fattig.length} retter`);

console.log('\n=== 13. Tilberedningstid ===');
const udenTid = OPSKRIFTER.filter(o => typeof (o as any).minutter !== 'number');
tjek('Alle opskrifter har tilberedningstid', udenTid.length === 0,
  udenTid.map(o => o.id).join(', ') || 'alle har tid');
const skæveTider = OPSKRIFTER.filter(o => (o as any).minutter < 10 || (o as any).minutter > 90);
tjek('Alle tider er fornuftige (10-90 min)', skæveTider.length === 0,
  skæveTider.map(o => `${o.id}=${(o as any).minutter}`).join(', ') || 'ok');
for (const koed of ['Kylling', 'Oksekød', 'Svinekød']) {
  const hurtige = OPSKRIFTER.filter(o =>
    (o.koed === koed || o.koed === 'Alt') && (o as any).minutter <= 30
  ).length;
  tjek(`Kost "${koed}": mindst 4 retter på maks 30 min`, hurtige >= 4, `${hurtige} retter`);
}

console.log('\n=== 14. Akkumuleret besparelse ===');
tjek('total_spar bruges direkte', beregnPlanBesparelse(
  { total_spar: 42, plan_besparelse: 99, plan_indkoebsliste: null }) === 42);
tjek('Fallback til plan.besparelse når total_spar mangler', beregnPlanBesparelse(
  { total_spar: null, plan_besparelse: 17, plan_indkoebsliste: null }) === 17);
tjek('Fallback til indkøbsliste når begge mangler', beregnPlanBesparelse(
  { total_spar: null, plan_besparelse: null, plan_indkoebsliste: [
    { butik: 'Kød', subtotal: 3, varer: [
      { vare: 'Hakket oksekød', antal_pakker: 1, pakkestoerrelse: '400 g',
        pris: 3, normalpris: 32, paa_tilbud: true },
    ] },
  ] }) === 29);
tjek('Gammelt/ødelagt planformat giver 0 (ikke crash)', beregnPlanBesparelse(
  { total_spar: null, plan_besparelse: null, plan_indkoebsliste: [{ ikke: 'en liste' }] }) === 0);
tjek('Negativ total_spar låses til 0', beregnPlanBesparelse(
  { total_spar: -50, plan_besparelse: null, plan_indkoebsliste: null }) === 0);
tjek('Sum over flere planer', beregnSamletBesparelse([
  { total_spar: 42, plan_besparelse: null, plan_indkoebsliste: null },
  { total_spar: null, plan_besparelse: 17, plan_indkoebsliste: null },
  { total_spar: null, plan_besparelse: null, plan_indkoebsliste: null },
]) === 59);
tjek(`formatKr(2340) = "2.340"`, formatKr(2340) === '2.340', formatKr(2340));
tjek(`formatKr(999) = "999"`, formatKr(999) === '999', formatKr(999));
tjek(`formatKr(1234567) = "1.234.567"`, formatKr(1234567) === '1.234.567', formatKr(1234567));

console.log('\n=== 15. Besparelse over tid ===');
tjek('beregnPlanPris: total_pris direkte', beregnPlanPris(
  { total_spar: null, plan_besparelse: null, plan_indkoebsliste: null, total_pris: 184 }) === 184);
tjek('beregnPlanPris: fallback til plan.indkoebspris', beregnPlanPris(
  { total_spar: null, plan_besparelse: null, plan_indkoebsliste: null, plan_pris: 210 }) === 210);
tjek('beregnPlanPris: fallback til indkøbslistens subtotaler', beregnPlanPris(
  { total_spar: null, plan_besparelse: null, plan_pris: null,
    plan_indkoebsliste: [{ butik: 'Kød', subtotal: 35, varer: [] }, { butik: 'Brød', subtotal: 15, varer: [] }] }) === 50);
tjek('beregnPlanPris: ødelagt format giver 0 (ikke crash)', beregnPlanPris(
  { total_spar: null, plan_besparelse: null, plan_indkoebsliste: 'ÿ' as any }) === 0);
const serie = byggUgeSerie([
  { uge_nr: 25, total_spar: 30, total_pris: 200, plan_besparelse: null, plan_indkoebsliste: null },
  { uge_nr: 24, total_spar: 32, total_pris: 184, plan_besparelse: null, plan_indkoebsliste: null },
  { uge_nr: null, total_spar: 99, total_pris: 99, plan_besparelse: null, plan_indkoebsliste: null },
]);
tjek('byggUgeSerie: rækker uden ugenummer springes over', serie.length === 2, `${serie.length} uger`);
tjek('byggUgeSerie: sorteret stigende efter uge', serie[0].uge === 24 && serie[1].uge === 25,
  serie.map(u => u.uge).join(','));
tjek('byggUgeSerie: spar og pris mappet korrekt', serie[0].spar === 32 && serie[0].pris === 184);

console.log('');
if (fejl > 0) throw new Error(`${fejl} test(s) FEJLEDE`);
console.log(`ALLE TESTS BESTÅET — tilbudssystemet virker.`);
