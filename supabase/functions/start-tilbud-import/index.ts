// Admin starter sky-tilbuds-import: verificér kalderens JWT-email mod en
// allowlist, og affyr en GitHub repository_dispatch der trigger Action'en
// (.github/workflows/tilbud-import.yml). Funktionen gemmer INTET selv.
// ?dry_run=1 returnerer payloaden uden at affyre (kræver stadig admin).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_EMAILS = ['os.isberg@gmail.com'];
const REPO = 'osisberg-rgb/StudentLifeStyle';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const dryRun = new URL(req.url).searchParams.get('dry_run') === '1';

  // Admin-gate: læs brugeren ud af det medsendte JWT.
  const auth = req.headers.get('Authorization') ?? '';
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return json({ error: 'forbidden' }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const uge = Number(body?.uge);
  const jobs = Array.isArray(body?.jobs) ? body.jobs : [];
  if (!uge || jobs.length === 0) return json({ error: 'Mangler uge/jobs' }, 400);

  const payload = { event_type: 'tilbud-import', client_payload: { uge, jobs } };
  if (dryRun) return json({ dryRun: true, ...payload });

  const token = Deno.env.get('GITHUB_DISPATCH_TOKEN');
  if (!token) return json({ error: 'GITHUB_DISPATCH_TOKEN ikke sat' }, 500);

  const gh = await fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'maet-tilbud-import',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!gh.ok) return json({ error: `GitHub dispatch fejlede: ${gh.status} ${await gh.text()}` }, 502);
  return json({ ok: true, uge, antal: jobs.length });
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
