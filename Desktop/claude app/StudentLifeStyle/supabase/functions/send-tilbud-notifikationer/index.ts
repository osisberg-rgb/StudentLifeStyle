// Henter watchlist + push_tokens + ugens tilbud, matcher pr. bruger i deres
// butikker, dedup'er via notifikationer_sendt og sender via Expo Push API.
// Beskyttet med CRON_SECRET (header x-cron-secret) — deployes med --no-verify-jwt,
// så pg_cron kan kalde den. ?dry_run=1 sender ikke og skriver ikke ledger.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Pr-enhed-tilbud udelukkes (samme regel som constants/tilbudspriser.ts: erPrEnhed)
function erPrEnhed(navn: string): boolean { return /\bpr\.\s*(\d|½|stk|kuvert|kg)/i.test(navn); }

// matcherSoegeord — kopi af constants/basispriser.ts (ord-start; ≤3 tegn = helt ord)
function matcherSoegeord(tekst: string, k: string): boolean {
  const norm = (s: string) => ' ' + s.toLowerCase().replace(/[^a-z0-9æøåé]+/g, ' ').trim() + ' ';
  const t = norm(tekst), kk = norm(k);
  if (kk.trim().length <= 3) return t.includes(kk);
  return t.includes(kk.substring(0, kk.length - 1));
}

// Samme uge-formel som appens getWeekNumber() (IKKE ISO) — så funktionen ser
// præcis de tilbud brugeren ser i appen.
function ugeNr(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dry_run') === '1';

  // Adgangskontrol: kun kald med korrekt CRON_SECRET (cron eller manuel test).
  const secret = Deno.env.get('CRON_SECRET') ?? '';
  if (req.headers.get('x-cron-secret') !== secret) {
    return new Response('forbidden', { status: 403 });
  }

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const uge = ugeNr();
  const [{ data: watch }, { data: tokens }, { data: profiler }, { data: tilbud }, { data: sendt }] =
    await Promise.all([
      sb.from('watchlist').select('user_id, term, label'),
      sb.from('push_tokens').select('user_id, token'),
      sb.from('profiles').select('id, stores'),
      sb.from('tilbud').select('butik, navn, soeg, pris, uge').eq('uge', uge),
      sb.from('notifikationer_sendt').select('user_id, term').eq('uge', uge),
    ]);

  const butikkerFor = new Map<string, string[]>();
  for (const p of (profiler ?? [])) butikkerFor.set(p.id, p.stores ?? []);
  const tokensFor = new Map<string, string[]>();
  for (const t of (tokens ?? [])) {
    if (!tokensFor.has(t.user_id)) tokensFor.set(t.user_id, []);
    tokensFor.get(t.user_id)!.push(t.token);
  }
  const alleredeSendt = new Set((sendt ?? []).map((s) => `${s.user_id}|${s.term}`));

  type Besked = { to: string; title: string; body: string; data: unknown; _user: string; _term: string };
  const beskeder: Besked[] = [];

  for (const w of (watch ?? [])) {
    if (alleredeSendt.has(`${w.user_id}|${w.term}`)) continue;
    const userTokens = tokensFor.get(w.user_id) ?? [];
    if (userTokens.length === 0) continue;
    const brugersButikker = butikkerFor.get(w.user_id) ?? [];

    // Find billigste matchende tilbud i brugerens butikker (eller alle hvis ingen valgt)
    let bedst: { butik: string; pris: number } | null = null;
    for (const d of (tilbud ?? [])) {
      if (brugersButikker.length && !brugersButikker.includes(d.butik)) continue;
      if (erPrEnhed(d.navn)) continue;
      const tekst = `${d.navn} ${(d.soeg ?? []).join(' ')}`;
      if (!matcherSoegeord(tekst, w.term)) continue;
      if (!bedst || Number(d.pris) < bedst.pris) bedst = { butik: d.butik, pris: Number(d.pris) };
    }
    if (!bedst) continue;

    for (const to of userTokens) {
      beskeder.push({
        to,
        title: `🏷️ ${w.label} er på tilbud`,
        body: `${bedst.pris} kr i ${bedst.butik} denne uge`,
        data: { skærm: 'tilbud', term: w.term },
        _user: w.user_id, _term: w.term,
      });
    }
  }

  if (dryRun) {
    return Response.json({ uge, antal: beskeder.length, beskeder: beskeder.map(({ _user, _term, ...b }) => b) });
  }

  // Send i batches á 100 til Expo Push API
  const ugyldige: string[] = [];
  for (let i = 0; i < beskeder.length; i += 100) {
    const batch = beskeder.slice(i, i + 100);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch.map(({ _user, _term, ...b }) => b)),
    });
    const json = await res.json().catch(() => ({} as any));
    const data = (json?.data ?? []) as any[];
    data.forEach((r, idx) => {
      if (r?.status === 'error' && r?.details?.error === 'DeviceNotRegistered') {
        ugyldige.push(batch[idx].to);
      }
    });
  }

  // Skriv ledger (én pr. user+term+uge) og ryd ugyldige tokens
  const ledger = [...new Map(
    beskeder.map((b) => [`${b._user}|${b._term}`, { user_id: b._user, term: b._term, uge }]),
  ).values()];
  if (ledger.length) await sb.from('notifikationer_sendt').upsert(ledger, { onConflict: 'user_id,term,uge' });
  if (ugyldige.length) await sb.from('push_tokens').delete().in('token', ugyldige);

  return Response.json({ uge, sendt: beskeder.length, ledger: ledger.length, ryddedeTokens: ugyldige.length });
});
