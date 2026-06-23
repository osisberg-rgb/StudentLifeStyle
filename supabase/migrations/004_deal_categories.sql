-- Favorit-tilbudskategorier valgt i onboardingen (fx 'Kød', 'Grøntsager').
-- Gemmes pr. bruger; kan redigeres i Profil. Bruges (senere) til at rangere
-- "Tilbud til dig". Nullable text[] — eksisterende profiler påvirkes ikke.
alter table profiles add column if not exists deal_categories text[];
