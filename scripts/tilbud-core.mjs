// DELT kerne for tilbuds-udtræk — bruges af BÅDE det lokale script
// (opdater-tilbud.mjs) OG cloud-scriptet (opdater-tilbud-cloud.mjs).
// Renderer en PDF (buffer), uploader PDF+forside til Storage, kalder
// edge-funktionen importer-tilbud pr. side, og skriver til `tilbud`-tabellen.
// Nøgler læses fra miljøvariabler: SB_SERVICE (service-role), SB_ANON (anon).
import { pdf } from 'pdf-to-img';

const REF = 'oqolcifpmdybimspnadc';
const BUCKET = 'tilbudsaviser';
const FUNK_URL = `https://${REF}.supabase.co/functions/v1/importer-tilbud`;
const STORAGE = `https://${REF}.supabase.co/storage/v1/object`;
const REST = `https://${REF}.supabase.co/rest/v1`;

function svcHead() {
  const s = process.env.SB_SERVICE;
  return { Authorization: `Bearer ${s}`, apikey: s };
}

export async function uploadStorage(navn, buf, type) {
  const r = await fetch(`${STORAGE}/${BUCKET}/${navn}`, {
    method: 'POST',
    headers: { ...svcHead(), 'Content-Type': type, 'x-upsert': 'true' },
    body: buf,
  });
  if (!r.ok) throw new Error(`upload ${navn}: ${r.status} ${await r.text()}`);
}

// Kald edge-funktionen med retry/backoff. Returnerer { ok, varer, forventet }.
// ok=false betyder at siden IKKE kunne udtrækkes (så vi kan fejle højlydt i
// stedet for tavst at tabe dusinvis af varer).
async function udtrækSide(dataUrl, { forsøg = 3 } = {}) {
  const anon = process.env.SB_ANON;
  for (let f = 1; f <= forsøg; f++) {
    try {
      const r = await fetch(FUNK_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${anon}`, apikey: anon, 'Content-Type': 'application/json' },
        body: JSON.stringify({ billede: dataUrl }),
      });
      if (r.ok) {
        const j = await r.json();
        return {
          ok: true,
          varer: Array.isArray(j.varer) ? j.varer : [],
          forventet: Number(j.forventet_antal) || 0,
        };
      }
    } catch { /* netværksfejl — prøv igen */ }
    if (f < forsøg) await new Promise((res) => setTimeout(res, 600 * f));
  }
  return { ok: false, varer: [], forventet: 0 };
}

// Fjern dubletter (samme navn+pris) — fx hvis en side køres to gange.
function dedup(varer) {
  const set = new Set();
  return varer.filter((v) => {
    const k = `${String(v.navn).toLowerCase().replace(/\s+/g, ' ').trim()}|${v.pris}`;
    if (set.has(k)) return false;
    set.add(k);
    return true;
  });
}

async function skrivTilbud(butik, uge, varer) {
  await fetch(`${REST}/tilbud?butik=eq.${encodeURIComponent(butik)}&uge=eq.${uge}`, {
    method: 'DELETE', headers: svcHead(),
  });
  if (varer.length === 0) return;
  const rows = varer.map(v => ({ butik, uge, navn: v.navn, maengde: v.maengde ?? null, soeg: v.soeg ?? [], pris: v.pris }));
  for (let i = 0; i < rows.length; i += 500) {
    const r = await fetch(`${REST}/tilbud`, {
      method: 'POST',
      headers: { ...svcHead(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(rows.slice(i, i + 500)),
    });
    if (!r.ok) throw new Error(`insert tilbud: ${r.status} ${await r.text()}`);
  }
}

// Behandl én butik: render PDF-buffer, upload PDF+cover, udtræk pr. side, skriv.
// Returnerer { antal }. `log` kaldes med fremdrifts-tekst (default: ingenting).
export async function behandlButik({ slug, butik, uge, pdfBuffer, maxSider = Infinity, log = () => {} }) {
  // scale 2.5 sigter mod ~2000px lange led, så OpenAI (detail:"high") kan læse
  // småtryks-priser på tætte sider. 1.3 var for lavt → varer blev tabt.
  const doc = await pdf(pdfBuffer, { scale: 2.5 });
  const sider = Math.min(doc.length, maxSider);

  await uploadStorage(`${slug}-uge${uge}.pdf`, pdfBuffer, 'application/pdf');
  const cover = await doc.getPage(1);
  await uploadStorage(`${slug}-cover.png`, cover, 'image/png');
  log(`  PDF + cover uploadet (${doc.length} sider)`);

  const varer = [];
  const fejlSider = [];
  for (let i = 1; i <= sider; i++) {
    const png = await doc.getPage(i);
    const dataUrl = `data:image/png;base64,${png.toString('base64')}`;

    const res = await udtrækSide(dataUrl);
    if (!res.ok) { fejlSider.push(i); continue; }

    let sideVarer = res.varer;
    // Tæl-først: hvis modellen fandt færre end den selv talte, kør siden igen
    // og forén resultaterne (dedup fjerner overlap).
    if (res.forventet > 0 && sideVarer.length < res.forventet * 0.8) {
      const igen = await udtrækSide(dataUrl, { forsøg: 1 });
      if (igen.ok) sideVarer = dedup([...sideVarer, ...igen.varer]);
    }

    varer.push(...sideVarer);
    if (i % 10 === 0 || i === sider) log(`  side ${i}/${sider} — ${varer.length} tilbud i alt`);
  }

  // Fejl højlydt frem for at gemme en ufuldstændig avis uden besked.
  if (fejlSider.length) {
    throw new Error(`sider fejlede efter retry: ${fejlSider.join(', ')} — gemmer ikke ufuldstændig avis`);
  }

  const unikke = dedup(varer);
  await skrivTilbud(butik, uge, unikke);
  return { antal: unikke.length };
}
