-- Tilføj mængde/pakkestørrelse til ugens tilbud, så brugeren kan se HVOR MEGET
-- af varen man får for prisen (fx "500 g", "8 stk", "1 l"). Fyldes af
-- importer-tilbud (AI-aflæsning) via tilbud-core.mjs. Valgfrit felt — gamle
-- rækker og hardkodede fallback-filer fungerer uændret uden det.
alter table public.tilbud add column if not exists maengde text;
