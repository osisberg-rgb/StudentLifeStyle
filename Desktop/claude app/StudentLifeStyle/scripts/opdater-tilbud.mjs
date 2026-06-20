// Ugentlig tilbuds-opdatering (LOKAL) — læser PDF'er fra disk og bruger den
// delte kerne (tilbud-core.mjs). Cloud-varianten (opdater-tilbud-cloud.mjs)
// bruger samme kerne, men henter PDF'erne fra Storage.
//
// KØR (via PowerShell-launcheren der henter nøglerne):
//   pwsh scripts/opdater-tilbud.ps1            (indeværende uge)
//   pwsh scripts/opdater-tilbud.ps1 -Uge 25    (bestemt uge)
import { readFileSync } from 'fs';
import { behandlButik } from './tilbud-core.mjs';

// Ret stierne her når du har nye PDF'er. slug bruges til filnavne i Storage.
const BUTIKKER = [
  { butik: 'Netto',     slug: 'netto',    pdf: 'C:/Users/gust5/Downloads/netto uge 25-compressed.pdf' },
  { butik: 'Rema 1000', slug: 'rema1000', pdf: 'C:/Users/gust5/Downloads/rema1000 uge 25-compressed.pdf' },
  { butik: 'Føtex',     slug: 'fotex',    pdf: 'C:/Users/gust5/Downloads/Føtex uge 25_compressed.pdf' },
];

if (!process.env.SB_SERVICE || !process.env.SB_ANON) {
  console.error('Mangler SB_SERVICE/SB_ANON (kør via opdater-tilbud.ps1)');
  process.exit(1);
}

function aktuelUge() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((((now.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
}
const ugeArg = process.argv.find(a => a.startsWith('--uge='));
const UGE = ugeArg ? parseInt(ugeArg.split('=')[1], 10) : aktuelUge();
const maxArg = process.argv.find(a => a.startsWith('--maxsider='));
const MAX_SIDER = maxArg ? parseInt(maxArg.split('=')[1], 10) : Infinity;

for (const b of BUTIKKER) {
  console.log(`\n=== ${b.butik} (uge ${UGE}) ===`);
  try {
    const { antal } = await behandlButik({
      slug: b.slug, butik: b.butik, uge: UGE,
      pdfBuffer: readFileSync(b.pdf), maxSider: MAX_SIDER, log: console.log,
    });
    console.log(`  ✓ ${antal} tilbud gemt for ${b.butik}`);
  } catch (e) {
    console.error(`  FEJL (${b.butik}): ${e.message}`);
  }
}
console.log('\nFærdig. Appen henter de nye tilbud automatisk.');
