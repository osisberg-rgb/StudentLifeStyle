// Ugentlig tilbuds-opdatering — ÉT script gør det hele:
//   1) uploader PDF + side-1-cover til Storage-bucket `tilbudsaviser` (forsiden)
//   2) renderer hver side → kalder edge-funktionen `importer-tilbud` (GPT) →
//      samler {navn, pris, soeg}
//   3) skriver til `tilbud`-tabellen for (butik, uge): sletter gamle rækker og
//      indsætter de nye → appen henter dem live (ingen ny app-version).
//
// KØR (via PowerShell-launcheren der henter nøglerne):
//   pwsh scripts/opdater-tilbud.ps1            (indeværende uge)
//   pwsh scripts/opdater-tilbud.ps1 -Uge 25    (bestemt uge — fx til de gamle PDF'er)
//
// Nøgler kommer fra miljøvariabler sat af launcheren: SB_SERVICE, SB_ANON.
// Krav: `npm i pdf-to-img` (allerede installeret i node_modules).
import { pdf } from 'pdf-to-img';
import { readFileSync } from 'fs';

const REF = 'oqolcifpmdybimspnadc';
const BUCKET = 'tilbudsaviser';
const FUNK_URL = `https://${REF}.supabase.co/functions/v1/importer-tilbud`;
const STORAGE = `https://${REF}.supabase.co/storage/v1/object`;
const REST = `https://${REF}.supabase.co/rest/v1`;

// ── Konfiguration: ret stierne her når du har nye PDF'er (samme navne hver uge
//    er nemmest). slug bruges til filnavne i Storage og må ikke ændres. ──
const BUTIKKER = [
  { butik: 'Netto',     slug: 'netto',    pdf: 'C:/Users/gust5/Downloads/netto uge 25-compressed.pdf' },
  { butik: 'Rema 1000', slug: 'rema1000', pdf: 'C:/Users/gust5/Downloads/rema1000 uge 25-compressed.pdf' },
  { butik: 'Føtex',     slug: 'fotex',    pdf: 'C:/Users/gust5/Downloads/Føtex uge 25_compressed.pdf' },
];

const SERVICE = process.env.SB_SERVICE;
const ANON = process.env.SB_ANON;
if (!SERVICE || !ANON) { console.error('Mangler SB_SERVICE/SB_ANON (kør via opdater-tilbud.ps1)'); process.exit(1); }

// Uge fra argument (--uge=NN) ellers indeværende uge (samme formel som appen).
function aktuelUge() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((((now.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
}
const ugeArg = process.argv.find(a => a.startsWith('--uge='));
const UGE = ugeArg ? parseInt(ugeArg.split('=')[1], 10) : aktuelUge();
const maxArg = process.argv.find(a => a.startsWith('--maxsider='));
const MAX_SIDER = maxArg ? parseInt(maxArg.split('=')[1], 10) : Infinity;

const svcHead = { Authorization: `Bearer ${SERVICE}`, apikey: SERVICE };

async function uploadStorage(navn, buf, type) {
  const r = await fetch(`${STORAGE}/${BUCKET}/${navn}`, {
    method: 'POST',
    headers: { ...svcHead, 'Content-Type': type, 'x-upsert': 'true' },
    body: buf,
  });
  if (!r.ok) throw new Error(`upload ${navn}: ${r.status} ${await r.text()}`);
}

async function udtrækSide(dataUrl) {
  const r = await fetch(FUNK_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ billede: dataUrl }),
  });
  if (!r.ok) return [];
  const j = await r.json();
  return Array.isArray(j.varer) ? j.varer : [];
}

async function skrivTilbud(butik, varer) {
  // slet gamle rækker for (butik, uge)
  await fetch(`${REST}/tilbud?butik=eq.${encodeURIComponent(butik)}&uge=eq.${UGE}`, {
    method: 'DELETE', headers: svcHead,
  });
  if (varer.length === 0) return;
  const rows = varer.map(v => ({ butik, uge: UGE, navn: v.navn, soeg: v.soeg ?? [], pris: v.pris }));
  // indsæt i bidder af 500
  for (let i = 0; i < rows.length; i += 500) {
    const r = await fetch(`${REST}/tilbud`, {
      method: 'POST',
      headers: { ...svcHead, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(rows.slice(i, i + 500)),
    });
    if (!r.ok) throw new Error(`insert tilbud: ${r.status} ${await r.text()}`);
  }
}

for (const b of BUTIKKER) {
  console.log(`\n=== ${b.butik} (uge ${UGE}) ===`);
  try {
    const doc = await pdf(b.pdf, { scale: 1.3 });
    const sider = Math.min(doc.length, MAX_SIDER);

    // 1) PDF + cover til Storage
    await uploadStorage(`${b.slug}-uge${UGE}.pdf`, readFileSync(b.pdf), 'application/pdf');
    const cover = await doc.getPage(1);
    await uploadStorage(`${b.slug}-cover.png`, cover, 'image/png');
    console.log(`  PDF + cover uploadet (${doc.length} sider)`);

    // 2) udtræk tilbud side for side
    const varer = [];
    for (let i = 1; i <= sider; i++) {
      const png = await doc.getPage(i);
      const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
      const fundet = await udtrækSide(dataUrl);
      varer.push(...fundet);
      if (i % 10 === 0 || i === sider) console.log(`  side ${i}/${sider} — ${varer.length} tilbud i alt`);
    }

    // 3) skriv til tabellen
    await skrivTilbud(b.butik, varer);
    console.log(`  ✓ ${varer.length} tilbud gemt for ${b.butik}`);
  } catch (e) {
    console.error(`  FEJL (${b.butik}): ${e.message}`);
  }
}
console.log('\nFærdig. Appen henter de nye tilbud automatisk.');
