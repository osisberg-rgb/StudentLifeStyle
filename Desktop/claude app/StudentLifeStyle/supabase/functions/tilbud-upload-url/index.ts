// Giver admin signerede upload-URL'er til tilbudsaviser/inbox/. Appen kan ikke
// uploade direkte (Storage genkender ikke brugerens JWT som authenticated, så
// RLS afviser), så vi laver i stedet en SIGNERET upload-URL med service-role
// (bypasser RLS) — kun for admin (verificeret via getUser). Appen PUT'er filen
// til den returnerede URL. ?dry_run=1 understøttes ikke (ufarlig at kalde).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_EMAILS = ['os.isberg@gmail.com'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  const uge = Number(body?.uge);
  const slugs: string[] = Array.isArray(body?.slugs) ? body.slugs : [];
  if (!uge || slugs.length === 0) return json({ error: 'Mangler uge/slugs' }, 400);

  const svc = createClient(url0, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const urls: { slug: string; signedUrl: string; path: string }[] = [];
  for (const slug of slugs) {
    const path = `inbox/${slug}-uge${uge}.pdf`;
    const { data, error } = await svc.storage.from('tilbudsaviser')
      .createSignedUploadUrl(path, { upsert: true });
    if (error || !data) return json({ error: `Kunne ikke lave upload-URL (${slug}): ${error?.message}` }, 500);
    urls.push({ slug, signedUrl: data.signedUrl, path });
  }
  return json({ urls });
});

function json(b: unknown, status = 200): Response {
  return new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
