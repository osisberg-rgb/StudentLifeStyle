// Sky-variant af tilbuds-opdateringen — KØRES af GitHub Action'en
// (.github/workflows/tilbud-import.yml). Læser jobs fra dispatch-payloaden
// (env PAYLOAD), henter hver PDF fra Storage `inbox/`, bruger den delte kerne,
// og opdaterer `tilbud_import_job`-status. Nøgler: SB_SERVICE, SB_ANON (env).
import { behandlButik } from './tilbud-core.mjs';

const REF = 'oqolcifpmdybimspnadc';
const BUCKET = 'tilbudsaviser';
const STORAGE = `https://${REF}.supabase.co/storage/v1/object`;
const REST = `https://${REF}.supabase.co/rest/v1`;

const SERVICE = process.env.SB_SERVICE;
const ANON = process.env.SB_ANON;
if (!SERVICE || !ANON) { console.error('Mangler SB_SERVICE/SB_ANON'); process.exit(1); }

const payload = JSON.parse(process.env.PAYLOAD || '{}');
const UGE = Number(payload.uge);
const JOBS = Array.isArray(payload.jobs) ? payload.jobs : [];
if (!UGE || JOBS.length === 0) { console.error('Tomt payload (uge/jobs)'); process.exit(1); }

const svcHead = { Authorization: `Bearer ${SERVICE}`, apikey: SERVICE };

async function sætStatus(slug, fields) {
  const id = `${slug}-uge${UGE}`;
  await fetch(`${REST}/tilbud_import_job?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...svcHead, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
  });
}

async function hentPdf(sti) {
  const r = await fetch(`${STORAGE}/${BUCKET}/${sti}`, { headers: svcHead });
  if (!r.ok) throw new Error(`hent ${sti}: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function sletInbox(sti) {
  await fetch(`${STORAGE}/${BUCKET}/${sti}`, { method: 'DELETE', headers: svcHead });
}

for (const job of JOBS) {
  const { slug, butik } = job;
  const sti = job.sti || `inbox/${slug}-uge${UGE}.pdf`;
  console.log(`\n=== ${butik} (uge ${UGE}) ===`);
  try {
    await sætStatus(slug, { status: 'kører', fejl: null });
    const pdfBuffer = await hentPdf(sti);
    const { antal } = await behandlButik({ slug, butik, uge: UGE, pdfBuffer, log: console.log });
    await sletInbox(sti);
    await sætStatus(slug, { status: 'færdig', antal });
    console.log(`  ✓ ${antal} tilbud gemt for ${butik}`);
  } catch (e) {
    await sætStatus(slug, { status: 'fejl', fejl: String(e?.message ?? e) });
    console.error(`  FEJL (${butik}): ${e?.message ?? e}`);
  }
}
console.log('\nFærdig.');
