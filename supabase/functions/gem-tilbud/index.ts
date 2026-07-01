// Admin-vej til MANUEL indtastning af tilbud (uden AI/PDF). Appen sender
// { butik, uge, varer[] }; funktionen validerer, gater på admin (getUser +
// ADMIN_EMAILS) og skriver med service-role: DELETE alle rækker for (butik,
// uge) og INSERT de nye — samme erstat-semantik som scripts/tilbud-core.mjs
// `skrivTilbud`. Direkte klient-writes til `tilbud` er bevidst blokeret af RLS,
// så skrivningen SKAL gå gennem service-role her.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_EMAILS = ['os.isberg@gmail.com'];

// Skal matche ALLE_BUTIK_VALG i lib/tilbudUpload.ts (visningsnavne).
const GYLDIGE_BUTIKKER = new Set([
  'Netto', 'Rema 1000', 'Føtex', 'SuperBrugsen', 'Bilka', 'Lidl', 'Meny', '365discount',
]);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RaaVare = { navn?: unknown; maengde?: unknown; pris?: unknown; soeg?: unknown };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const url0 = Deno.env.get('SUPABASE_URL')!;
  const auth = req.headers.get('Authorization') ?? '';
  const sbUser = createClient(url0, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await sbUser.auth.getUser();
  if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return json({ error: 'forbidden' }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const butik = typeof body?.butik === 'string' ? body.butik : '';
  const uge = Number(body?.uge);
  const raaVarer: RaaVare[] = Array.isArray(body?.varer) ? body.varer : [];

  if (!GYLDIGE_BUTIKKER.has(butik)) return json({ error: 'Ugyldig butik' }, 400);
  if (!Number.isInteger(uge) || uge < 1 || uge > 53) return json({ error: 'Ugyldig uge (1-53)' }, 400);
  if (raaVarer.length === 0) return json({ error: 'Ingen varer at gemme' }, 400);

  // Rens + validér hver vare. navn + endelig pris er påkrævet; maengde valgfri;
  // soeg begrænses til strenge (uden gyldigt soeg er varen usynlig for motoren).
  const rows: { butik: string; uge: number; navn: string; maengde: string | null; soeg: string[]; pris: number }[] = [];
  for (const v of raaVarer) {
    const navn = typeof v?.navn === 'string' ? v.navn.trim() : '';
    const pris = Number(v?.pris);
    if (!navn || !Number.isFinite(pris) || pris <= 0) continue;
    const maengde = typeof v?.maengde === 'string' && v.maengde.trim() ? v.maengde.trim() : null;
    const soeg = Array.isArray(v?.soeg)
      ? [...new Set(v.soeg.filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0))]
      : [];
    rows.push({ butik, uge, navn, maengde, soeg, pris });
  }
  if (rows.length === 0) return json({ error: 'Ingen gyldige varer (navn + pris kræves)' }, 400);

  const svc = createClient(url0, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Erstat: fjern eksisterende tilbud for (butik, uge), indsæt så de nye.
  const del = await svc.from('tilbud').delete().eq('butik', butik).eq('uge', uge);
  if (del.error) return json({ error: `Kunne ikke rydde gamle tilbud: ${del.error.message}` }, 500);

  const ins = await svc.from('tilbud').insert(rows);
  if (ins.error) return json({ error: `Kunne ikke gemme tilbud: ${ins.error.message}` }, 500);

  return json({ ok: true, antal: rows.length });
});

function json(b: unknown, status = 200): Response {
  return new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
