# Lancering & go-to-market — MadUgen

Levende dokument: hvad vi gør, når appen er færdig — test, App Store/Google Play,
processen og marketing. Niche: **danske familier / 30+ der gemmer opskrifter og
vil spare på aftensmaden med ugens tilbud**. Stack: Expo (SDK 54) + Supabase.

> Status: udkast (sep. 2026-tråd). Forfin sektionerne efterhånden + før beslutninger
> ind nederst.

---

## 1. Før lancering — test & kvalitet
- [ ] **Manuel test-runbook** for de kritiske flows: onboarding → vælg butikker/favoritter → forside (Tilbud til dig) → byg madplan → indkøbsliste → afkrydsning. Skriv som tjekliste, kør på hver release.
- [ ] **Test på rigtige enheder** (ikke kun emulator): mindst én ældre Android + én iPhone. Tjek `æøå`, tastatur, billed-upload, in-app browser (aviser).
- [ ] **Edge cases:** ingen netforbindelse, ikke logget ind, tom madplan/indkøbsliste, butik uden tilbud, meget lang opskriftsliste.
- [ ] **Beta med rigtige familier** (5-10 husstande) i 1-2 uger via TestFlight (iOS) + Google Play internal testing. Saml feedback struktureret.
- [ ] **Crash-fri + performance:** ingen frys ved billed-import (allerede håndteret), hurtig forside.
- [ ] **Verifikations-gate:** `npx tsc --noEmit` + `node scripts/test-matchning.mjs` skal være grønne før hver build.
- [ ] **Tilbuds-pålidelighed:** den ugentlige opdatering (importer-tilbud, se OPTIMERING.md) skal virke før launch — forkerte priser dræber tilliden.

## 2. Konti & juridisk (forberedelse)
- [ ] **Apple Developer Program** — 99 USD/år (kræves for App Store + TestFlight).
- [ ] **Google Play Console** — 25 USD engangsbeløb.
- [ ] **App-identitet:** endeligt navn (MadUgen), bundle id (fx `dk.maet.app`), ikon, splash.
- [ ] **Privatlivspolitik + vilkår** (GDPR! I gemmer login, husstand, favoritter, watch_items i Supabase). Skal være offentligt URL — link i app + store.
- [ ] **Datasikkerheds-erklæring:** Apple "App Privacy" + Google "Data safety" — deklarér hvad I indsamler (email, brugsdata). Vær præcis.
- [ ] **Konto-sletning:** Apple kræver "slet din konto"-funktion i appen hvis man kan oprette konto. Skal bygges (sletter Supabase-bruger + data).

## 3. Build & indsendelse (Expo / EAS)
- [ ] **EAS opsætning:** `eas.json` med build-profiler (preview/production). `npx eas-cli build`.
- [ ] **iOS:** `eas build -p ios` → `eas submit -p ios` → App Store Connect → **TestFlight** først → indsend til review.
- [ ] **Android:** `eas build -p android` → `eas submit -p android` → Play Console: internal → closed test → production.
- [ ] **App Store Connect / Play Console udfyldes:** beskrivelse (DK), keywords, kategori (Food & Drink / Lifestyle), aldersgrænse, screenshots, support-URL.
- [ ] Forvent **review-tid** (iOS typisk 1-3 dage; afvisninger sker — hav privatlivspolitik + konto-sletning klar).

## 4. Store-assets
- [ ] **App-ikon** (allerede grøn brand) + **screenshots** pr. device-størrelse (forside m. Tilbud til dig, madplan, indkøbsliste, opskrift). Tilføj korte tekst-overlays ("Spar på aftensmaden", "Ugens tilbud regnet ind").
- [ ] Evt. **preview-video** (15-30 sek): onboarding → favoritter → madplan → tilbud.
- [ ] **ASO/keywords (DK):** madplan, aftensmad, tilbud, tilbudsavis, indkøbsliste, spar penge, opskrifter, familie.
- [ ] **Beskrivelse:** kort hook + 3-4 bullets (favoritter ét sted, madplan på få tryk, indkøbsliste med ugens tilbud, find billigste butik).

## 5. Marketing / go-to-market (Danmark)
**Positionering:** "Saml familiens yndlingsopskrifter, planlæg ugen, og spar på aftensmaden — vi finder tilbuddene i dine butikker."

- [ ] **Pre-launch:** simpel landingsside + venteliste (email), teaser på social. Byg lidt forventning før release.
- [ ] **Organiske kanaler:** Facebook-grupper (børnefamilier, "spar penge på mad", madplan-grupper), Instagram + TikTok (korte "ugens madplan / tilbuds-hacks"-klip).
- [ ] **Influencers / mommy- & madbloggere** (DK) — mikro-influencers med familie-følgere konverterer bedst.
- [ ] **Indhold/SEO:** blog/opslag om madplanlægning, tilbuds-tips, ugens billigste aftensmad — trækker organisk trafik.
- [ ] **Launch-dag:** Product Hunt (internationalt), dansk tech/forbruger-presse, opslag i alle relevante grupper, bed beta-familier dele.
- [ ] **Indbygget vækst:** del-funktion (del en opskrift / madplan), evt. referral. Word of mouth er motoren i denne niche.
- [ ] **Reviews:** bed om anmeldelse i appen efter en god oplevelse (fx efter 2. madplan) — rating driver ASO.

## 6. Efter lancering — mål & loop
- [ ] **Analytics** (fx PostHog/Firebase): aktivering (onboarding fuldført), retention (uge 1 / uge 4), favoritter gemt, madplaner lavet, "Tilbud til dig"-tryk.
- [ ] **Crash-monitoring** (Sentry) — fang fejl i marken.
- [ ] **Feedback-loop:** in-app feedback + læs alle reviews; prioritér ud fra det.
- [ ] **Nordstjerne-metric:** fx "antal husstande der laver en madplan om ugen". Optimér mod den.
- [ ] **Drift:** tilbuds-opdateringen hver uge SKAL køre pålideligt (afhænger af importer-tilbud).

## 7. Forretningsmodel (kort, beslut senere)
- Gratis kerneapp for adoption. Mulige premium-funktioner: flere butikker, ubegrænsede egne opskrifter, avanceret madplan, ingen reklamer.
- Introducér tidligst når retention er bevist — ikke ved launch.

---

## Beslutninger truffet
*(føres ind efterhånden som vi tager dem)*
- …
