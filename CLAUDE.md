# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

`ROADMAP.md` is the living product plan (milestones, status, decision log) — read it before larger changes and keep it updated. UI text is **Danish**; many source files use Danish names with `æøå` (e.g. `IndkøbScreen.tsx`, `lib/indkøbsliste.ts`, `VælgRetterModal.tsx`).

> Note: Plans are built **client-side** (see Architecture); the legacy `dynamic-action` edge function is no longer invoked. The RN app calls `importer-opskrift` (recipe import); `importer-tilbud` (deal extraction) is invoked by the weekly `scripts/opdater-tilbud.ps1`, not the app. `README.md` was rewritten (juni 2026) to match the current niche/architecture — it is now accurate, but the code remains the source of truth for the plan/deal flow.

## Commands

- **Run the app:** `npx expo start` (Expo SDK 54, tested via Expo Go). After changing dependencies or seeing stale-bundle errors (e.g. `"main" was not registered`), restart with `npx expo start --clear`.
- **Verification gate:** `npx tsc --noEmit` must stay clean. There is **no test runner**; `scripts/test-tilbud.ts` cannot run here (it pulls in `react-native` via the Supabase client → esbuild fails). tsc is the check after every change.
- **Add an Expo package:** always `npx expo install <pkg>` (not bare npm) so the version matches SDK 54. A mismatched native module (e.g. `expo-image-picker@56` on SDK 54) crashes the bundle at load.
- **Project ref:** `oqolcifpmdybimspnadc`.

### Supabase (no interactive login needed)
The CLI access token is in Windows Credential Manager under target `Supabase CLI:supabase`. Read it via Win32 `CredRead` and set `$env:SUPABASE_ACCESS_TOKEN` (see PowerShell snippets used in this repo's history).

- **Deploy an edge function:** `npx supabase functions deploy <name> --project-ref oqolcifpmdybimspnadc` (the "Docker is not running" warning is harmless — CLI v2 bundles via API).
- **Run SQL / migrations:** `POST https://api.supabase.com/v1/projects/oqolcifpmdybimspnadc/database/query` with `Authorization: Bearer <token>` and `{ "query": "<sql>" }`. Migrations also live in `supabase/migrations/`.

## Architecture

React Native + Expo + TypeScript (strict) on the front; Supabase (Auth, Postgres+RLS, Edge Functions/Deno) on the back. Navigation and startup live in `App.tsx` (auth gate → onboarding gate → bottom tabs: Hjem / Planer / Indkøb / Profil). Always use `Colors`/`Radii` from `constants/theme.ts`, never hardcoded values.

### Price engine (the core, three layers)
1. `constants/basispriser.ts` — base prices for a fixed vocabulary of grocery search-words. **Never edited**; it is the fallback source of truth.
2. `constants/tilbud/*.ts` — per-store weekly deals (currently netto, rema1000, superbrugsen, bilka, fotex). Each entry: `{ navn, soeg: string[], pris }` with a `uge` number that must match the current week or the file is ignored. Registered in `constants/tilbudspriser.ts`.
3. Live overlay: `lib/tilbudSync.ts` pulls the Supabase `tilbud` table and calls `sætTilbudskilder()` to override the hardcoded files at runtime (no app redeploy). Empty/failed sync → falls back to the files.

`constants/tilbudspriser.ts` merges these in-memory (`slåEffektivPrisOp`, `aktiveTilbud`, `bedsteTilbud`): effective price = base price, replaced by a deal only when the deal is cheaper. Prices are **whole-package**, never per-gram. `soeg` words connect a recipe ingredient to a priced grocery item — an ingredient with no matching `soeg` word is invisible to the deal engine (the import edge function flags these as `lav_sikkerhed`).

### Recipe book (static + user, unified accessor)
- Static recipes live in `supabase/functions/dynamic-action/opskrifter.ts`, re-exported via `constants/opskrifter.ts`. Each: `id`, `navn`, `koed` (`Oksekød`/`Kylling`/`Svinekød`/`Alt` — filtered against the user's meat choice), `portioner`, `minutter`, `kategorier`, and `ingredienser` with `soeg[]`, `vaelgBilligstPerKg`, `estimeret`/`estimereretPris`.
- User-imported recipes live in the `bruger_opskrifter` table and are marked `importeret: true`.
- `lib/brugerOpskrifter.ts` merges both into one in-memory store: **`alleOpskrifter()` / `findOpskrift(id)` are the accessors used everywhere** (not direct array access), so imported recipes get prices, badges, images and can be planned. A `version` counter busts caches (e.g. `constants/opskriftPriser.ts`) when the store changes.
- Category chips in the picker (`constants/kategorier.ts`): `aftensmad` / `suppe` / `salat` / `broed`. **"Aftensmad" means "not tagged suppe/salat/broed"** — tag a recipe by adding to its `kategorier` array. The picker also has special non-category filters: Alle, ❤️ Favoritter (`lib/favoritter.ts` + `favoritter` table), 🔗 Dine opskrifter (`importeret`).
- Images: bundled PNGs in `assets/opskrifter/<id>.png`, mapped in `constants/opskriftBilleder.ts`; `billedeFor(opskrift)` returns the bundled image or the imported recipe's remote `billede_url`, else null (emoji fallback).

### Meal plan & shopping list (built client-side)
- `constants/ugeplan.ts` builds the weekly `Madplan`: `byggUgeplan` (auto-distribute 2+ recipes across days, including leftover "Rester" days) and `byggAftensmadForRet` (one cooked meal for a single day). A `Dag` has one `aftensmad` plus optional `ekstraAftensmad: Maltid[]` (extra dishes the same evening). Plans persist in the `madplaner` table (`uge_nr`, `plan` JSONB). All shared types are in `types/madplan.ts`.
- The shopping list is **never auto-filled**; it grows when the user opens a recipe and taps "Tilføj til indkøbsliste". `constants/indkoeb.ts` (`bygIndkøbsliste`) categorises ingredients and converts kitchen measures (spsk/tsk/dl/ml/L/skiver/fed…) into "1 pakke eller <mængde>" since you buy whole packages. `lib/indkøbsliste.ts` merges single items (deal items and free-text items) into the categorised list.

### Edge functions (Deno, `supabase/functions/`)
- `importer-opskrift` — the only function the **app** calls. Body is either `{ url }` (fetch page, parse JSON-LD/microdata/og:image or raw text) or `{ billede }` (a downscaled data-URL; read via gpt-4o-mini **vision**). It normalises to the recipe schema, picking `soeg` words from a fixed vocabulary, and flags un-priceable ingredients. Image import resizes to ~1024px (`expo-image-manipulator`) before sending to avoid freezing the JS thread. (Un-tagged ingredients also get a client-side fallback: `medGættedeSoeg`/`gætSoeg` in `lib/brugerOpskrifter.ts` fills empty `soeg` from the name on save.)
- `importer-tilbud` — one weekly-deal page (image) → `{ varer: [{ navn, maengde, pris, soeg }], forventet_antal }` via Claude vision (`claude-haiku-4-5`). The **model** picks `soeg` from a fixed vocab (it knows Coca-Cola → `sodavand`); `udledSoeg(navn)` is the local fallback when the model returns none. Without a `soeg` an offer can't reach the price engine, so it's invisible to shopping-list/best-offers/price-comparison. Prompt also restricts to food/drink, with a conservative `erNonFood` safety net. Invoked by `scripts/opdater-tilbud.ps1`/`.mjs` (the weekly PDF→`tilbud`-table pipeline), **not** the app.
- `send-tilbud-notifikationer` — deal notifications. Matches the `watchlist` table against the current week's `tilbud` (using the same `getWeekNumber()` formula as the app, **not** ISO week) in each user's `profiles.stores`, dedups via the `notifikationer_sendt` ledger, and sends via the Expo Push API. Idempotent; guarded by the `CRON_SECRET` env var (header `x-cron-secret`); deployed with `--no-verify-jwt` so `pg_cron` (daily, via `pg_net`) can call it. `?dry_run=1` returns the plan without sending. Client registers push tokens (`lib/notifikationer.ts`, requires an EAS dev build) and watches items (`lib/watchlist.ts`, `components/KlokkeKnap.tsx`). SQL helpers: `scripts/sb-sql.ps1` / `scripts/sb-token.ps1`. Spec/plan in `docs/superpowers/`.
- `dynamic-action` — legacy GPT plan generator; kept in the tree but no longer invoked by the current app.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
