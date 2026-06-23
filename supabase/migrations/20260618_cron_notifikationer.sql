-- Aktivér extensions (idempotent) og planlæg dagligt kald af edge-funktionen.
-- Bemaerk: <CRON_SECRET> er en placeholder - den aegte vaerdi indsaettes ved koersel
-- (scripts/.cron-secret, gitignored) og committes ALDRIG til git.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Fjern evt. tidligere job med samme navn, så re-kørsel er idempotent
select cron.unschedule(jobid) from cron.job where jobname = 'send-tilbud-notifikationer-dagligt';

select cron.schedule(
  'send-tilbud-notifikationer-dagligt',
  '0 8 * * *',  -- hver dag kl. 08:00 (cron-jobbets tidszone, typisk UTC)
  $$
  select net.http_post(
    url     := 'https://oqolcifpmdybimspnadc.supabase.co/functions/v1/send-tilbud-notifikationer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body    := '{}'::jsonb
  );
  $$
);
