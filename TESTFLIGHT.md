# TestFlight — sådan får du MadUgen i luften (fra MacBook)

> Skrevet 23. jun 2026. Formål: tag den committede kode → en iOS-build → TestFlight.
> Builden kører i **EAS' sky** (ikke lokalt), så du behøver **ikke Xcode**. Alle
> kommandoer køres fra **repo-roden** (projektet ligger nu fladt i roden).

## 0) Forudsætninger (engangs — uden disse kan du ikke nå TestFlight)

- [ ] **Apple Developer Program** — betalt medlemskab (99 USD/år), tilmeld på
  https://developer.apple.com/programs/ . TestFlight kræver det; uden er der ingen vej.
- [ ] **Expo-konto** (gratis) — opret på https://expo.dev hvis du ikke har en.
- [ ] **Node LTS + git** på Mac'en (`brew install node git` eller fra nodejs.org).
- [ ] (Kun hvis du senere vil bygge LOKALT: Xcode fra App Store. Til sky-build behøves det ikke.)

## 1) Hent koden på Mac'en

```bash
git clone https://github.com/osisberg-rgb/StudentLifeStyle.git
cd StudentLifeStyle
npm install
```

## 2) Installér EAS CLI og log ind

```bash
npm install -g eas-cli
eas login            # din Expo-konto
```

## 3) Knyt projektet til EAS (sætter projectId i app.json)

```bash
eas init
```
Dette skriver `expo.extra.eas.projectId` ind i `app.json`. **Commit den ændring** bagefter:
```bash
git add app.json && git commit -m "chore(eas): projectId fra eas init"
```

## 4) Tjek app-identiteten i `app.json` (allerede sat — bekræft før første build)

- `expo.name` = **"MadUgen"** ✅
- `expo.ios.bundleIdentifier` = **`dk.madugen.app`** — dette er app'ens permanente id i
  App Store. Vil du have et andet (fx eget domæne), så **ret det NU**, før du bygger/uploader.
- `expo.version` = `1.0.0` (markedsføringsversion). Build-nummeret styres automatisk af EAS
  (`appVersionSource: "remote"` + `autoIncrement` i `eas.json`), så du skal ikke tælle selv.
- **Ikon:** App Store kræver et **1024×1024 px ikon uden gennemsigtighed**. `assets/icon.png`
  bruges nu. Vil du bruge `assets/nyt icon.png`, så omdøb det UDEN mellemrum (fx `icon.png`)
  og peg `expo.icon` på det — mellemrum i filnavne giver ballade.

## 5) Byg iOS-appen i skyen

```bash
eas build --platform ios --profile production
```
- EAS spørger om at oprette **distributions-certifikat + provisioning profile** for dig —
  sig **ja** (EAS administrerer dem). Log ind med din Apple ID når den beder om det; EAS kan
  også registrere bundle id'et `dk.madugen.app` på din konto automatisk.
- Builden kører på EAS' servere (~10-20 min). Du får et link til en `.ipa` når den er færdig.

## 6) Send til TestFlight

```bash
eas submit --platform ios --profile production
```
- Vælg den netop byggede build (eller seneste). EAS uploader til **App Store Connect**.
- Første gang: hvis app-posten ikke findes, opretter `eas submit` den (eller opret den manuelt
  på https://appstoreconnect.apple.com → Apps → +, med samme bundle id).
- **Tip:** du kan slå build+submit sammen med `eas build --platform ios --profile production --auto-submit`.

## 7) Aktivér testere i App Store Connect

1. https://appstoreconnect.apple.com → din app → fanen **TestFlight**.
2. Builden står som **"Processing"** i 5-30 min; derefter skal du udfylde
   **Export Compliance** (appen bruger kun standard-HTTPS → typisk "Nej" til ikke-undtaget kryptering).
3. **Intern test:** tilføj dig selv/teamet under *Internal Testing* → de får en mail + kan
   installere via **TestFlight-appen** på deres iPhone. (Ekstern test kræver en kort Apple-review.)

---

## Valgfrit: rigtige push-notifikationer i builden

Appen kører fint i TestFlight UDEN dette (push fejler blot blødt, som i Expo Go). Vil du have
**ægte push** med i builden (den aktive store-feature), så gør dette FØR trin 5:

```bash
npx expo install expo-notifications expo-device
```
Tilføj derefter `"expo-notifications"` i `expo.plugins` i `app.json`, commit, og byg.
Efter installation på en testers telefon: tillad notifikationer → token lander i
`push_tokens` → kald `send-tilbud-notifikationer` med `x-cron-secret`. (Detaljer:
`docs/superpowers/plans/2026-06-18-tilbuds-notifikationer.md`, Task C1–C2.)

## Hvad jeg allerede har gjort klar i repo'et (23. jun)

- **`eas.json`** oprettet — profiler `development` / `preview` / `production` + iOS-submit
  (din `appleId` er sat; `eas submit` udfylder resten interaktivt).
- **`app.json`**: tilføjet `ios.bundleIdentifier = "dk.madugen.app"` og
  **expo-image-picker-tilladelser** (kamera + fotos på dansk) — ellers crasher iOS-builden,
  når brugeren importerer en opskrift fra foto.
- Resten (projectId, certifikater, App Store Connect-post) sættes på Mac'en i trinene ovenfor —
  det kan kun gøres med din Apple-konto.

## Kendte fælder

- Projektet ligger nu **fladt i repo-roden** — kør alle kommandoer her (ingen nestet sti mere).
- **Sky-build anbefales** (ingen Xcode nødvendig). Lokal build (`eas build --local`) virker nu også,
  da stien ikke længere har mellemrum.
- **`CRON_SECRET`/Supabase-secrets** er ikke i git; de er kun nødvendige for push-testen, ikke for selve TestFlight-builden.
