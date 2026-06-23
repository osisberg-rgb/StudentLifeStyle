# Kogebøger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lade brugeren samle opskrifter (både indbyggede og egne) i navngivne kogebøger, og bulk-importere flere opskrifter på én gang fra sidefotos af en fysisk kogebog.

**Architecture:** To nye per-bruger Supabase-tabeller (`kogeboeger` + `kogebog_medlemskab`, RLS) bag en in-memory klient-store (`lib/kogebøger.ts`) der spejler `lib/favoritter.ts`. Browsing sker via en ny "📚 Kogebøger"-tilstand i den eksisterende ret-vælger; tildeling sker fra opskrift-detaljen. Foto-bulk er en klient-side løkke der kalder den allerede deployede `importer-opskrift` edge-funktion én gang pr. billede.

**Tech Stack:** React Native + Expo SDK 54 (TypeScript strict), Supabase (Postgres + RLS), `expo-image-picker`, `expo-image-manipulator`.

---

## Verifikations-model (VIGTIGT — læs før du starter)

Dette projekt har **ingen test-runner** (se `CLAUDE.md`: "There is **no test runner**; tsc is the check after every change"). `scripts/test-tilbud.ts` kan ikke køre lokalt. Derfor **afviger denne plan bevidst fra unit-test-TDD**: i hver task er verifikations-porten

1. `npx tsc --noEmit` skal være **ren** (0 fejl), og
2. en konkret **manuel røgtest** hvor det er relevant.

Kør altid tsc fra projektroden: `C:\Users\gust5\claude\StudentLifeStyle\Desktop\claude app\StudentLifeStyle`.

Migrationer køres med den eksisterende helper (token fra Windows Credential Manager, ingen interaktiv login):
`pwsh scripts/sb-sql.ps1 -File <fil>` og ad-hoc-SQL med `pwsh scripts/sb-sql.ps1 -Query "<sql>"`.

Commit-sprog: dansk, samme stil som git-historikken (`feat: …`, `docs: …`).

---

## Filstruktur

**Nye filer**
- `supabase/migrations/005_kogeboeger.sql` — de to tabeller + RLS.
- `lib/kogebøger.ts` — in-memory store + DB-mutationer (ansvar: al kogebog-state).
- `components/NavngivModal.tsx` — lille genbrugelig navn-input-modal (opret/omdøb; cross-platform, da `Alert.prompt` kun findes på iOS).
- `components/VælgKogebogModal.tsx` — enkelt-vælger: vælg/opret/fjern kogebog for én opskrift.
- `components/ImportKogebogModal.tsx` — foto-bulk: flere billeder → sekventiel import → batch-review → gem alle i en kogebog.

**Ændrede filer**
- `App.tsx` — hent kogebøger + medlemskaber ved opstart.
- `components/OpskriftDetaljeModal.tsx` — "Læg i kogebog"-række.
- `components/VælgRetterModal.tsx` — "📚 Kogebøger"-chip, reol-view, drill-in, opret/omdøb/slet, samt åbning af foto-bulk.
- `components/TilføjOpskriftSheet.tsx` — nyt "Importér fra kogebog"-valg (ny `TilføjMetode`).

Ingen ændringer til edge-funktioner.

---

## Task 1: DB-migration — `kogeboeger` + `kogebog_medlemskab`

**Files:**
- Create: `supabase/migrations/005_kogeboeger.sql`

- [ ] **Step 1: Skriv migrationen**

Create `supabase/migrations/005_kogeboeger.sql`:

```sql
-- Brugerens kogebøger (navngivne samlinger) + medlemskab. Per bruger, RLS.
-- opskrift_id er TEKST, så både statiske ("dessert-1") og importerede
-- ("bruger-...") opskrifter kan ligge i en kogebog — samme mønster som
-- favoritter (003). Én kogebog pr. opskrift håndhæves af primærnøglen på
-- medlemskabs-tabellen.

create table if not exists public.kogeboeger (
  id text primary key,                       -- app-genereret, fx "kogebog-<rand>"
  user_id uuid references auth.users on delete cascade not null,
  navn text not null,
  emoji text not null default '📕',
  created_at timestamptz default now()
);

alter table public.kogeboeger enable row level security;

create policy "Brugere ser egne kogeboeger" on public.kogeboeger
  for select using (auth.uid() = user_id);
create policy "Brugere aendrer egne kogeboeger" on public.kogeboeger
  for all using (auth.uid() = user_id);

create index if not exists kogeboeger_user_idx
  on public.kogeboeger (user_id);

create table if not exists public.kogebog_medlemskab (
  user_id uuid references auth.users on delete cascade not null,
  opskrift_id text not null,                 -- statisk ELLER "bruger-..." id
  kogebog_id text not null references public.kogeboeger(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, opskrift_id)         -- én kogebog pr. opskrift
);

alter table public.kogebog_medlemskab enable row level security;

create policy "Brugere ser egne medlemskaber" on public.kogebog_medlemskab
  for select using (auth.uid() = user_id);
create policy "Brugere aendrer egne medlemskaber" on public.kogebog_medlemskab
  for all using (auth.uid() = user_id);

create index if not exists kogebog_medlemskab_kogebog_idx
  on public.kogebog_medlemskab (user_id, kogebog_id);
```

- [ ] **Step 2: Kør migrationen mod Supabase**

Run: `pwsh scripts/sb-sql.ps1 -File supabase/migrations/005_kogeboeger.sql`
Expected: kommandoen returnerer uden fejl (HTTP 200 fra Management API). Den er idempotent (`if not exists`).

- [ ] **Step 3: Verificér at tabellerne findes**

Run:
```
pwsh scripts/sb-sql.ps1 -Query "select table_name from information_schema.tables where table_schema='public' and table_name in ('kogeboeger','kogebog_medlemskab') order by table_name"
```
Expected: to rækker — `kogebog_medlemskab` og `kogeboeger`.

- [ ] **Step 4: Commit**

```bash
git add "supabase/migrations/005_kogeboeger.sql"
git commit -m "feat(kogebøger): migration — kogeboeger + kogebog_medlemskab (RLS)"
```

---

## Task 2: Klient-store — `lib/kogebøger.ts`

**Files:**
- Create: `lib/kogebøger.ts`

- [ ] **Step 1: Skriv storen**

Create `lib/kogebøger.ts` (spejler `lib/favoritter.ts` + `lib/brugerOpskrifter.ts`: in-memory, synkrone opslag, version-bump, optimistisk-venlige mutationer):

```ts
// Brugerens kogebøger + medlemskab (hvilken opskrift ligger i hvilken kogebog).
// Hentes ved opstart og holdes i en in-memory store, så opslag er SYNKRONE i
// vælgeren (samme mønster som lib/favoritter.ts). Bakkes af Supabase-tabellerne
// kogeboeger + kogebog_medlemskab (per bruger, RLS). Én kogebog pr. opskrift.
import { supabase } from './supabase';

export type Kogebog = { id: string; navn: string; emoji: string };

let kogeboegerStore: Kogebog[] = [];
// opskrift_id -> kogebog_id
let medlemskab = new Map<string, string>();

// Bumpes ved hver ændring — så grids/filtre kan opdage nye kogebøger/medlemskaber
let version = 0;
export function kogebøgerVersion(): number {
  return version;
}

export function kogebøger(): Kogebog[] {
  return kogeboegerStore;
}

export function kogebogForOpskrift(opskriftId: string): Kogebog | undefined {
  const id = medlemskab.get(opskriftId);
  return id ? kogeboegerStore.find(k => k.id === id) : undefined;
}

export function opskrifterIKogebog(kogebogId: string): string[] {
  const ud: string[] = [];
  medlemskab.forEach((kid, oid) => { if (kid === kogebogId) ud.push(oid); });
  return ud;
}

export function antalIKogebog(kogebogId: string): number {
  let n = 0;
  medlemskab.forEach(kid => { if (kid === kogebogId) n++; });
  return n;
}

export function nyKogebogId(): string {
  return `kogebog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Hent kogebøgerne ind i storen. Fejler det (ingen tabel, offline, ikke logget
// ind) røres storen ikke — appen virker uændret uden kogebøger.
export async function hentKogebøger(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('kogeboeger')
      .select('id, navn, emoji')
      .order('created_at', { ascending: true });
    if (error || !data) return;
    kogeboegerStore = data.map(r => ({
      id: r.id as string,
      navn: r.navn as string,
      emoji: (r.emoji as string) ?? '📕',
    }));
    version++;
  } catch {
    /* netværksfejl o.l. — behold nuværende store */
  }
}

export async function hentMedlemskaber(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('kogebog_medlemskab')
      .select('opskrift_id, kogebog_id');
    if (error || !data) return;
    medlemskab = new Map(data.map(r => [r.opskrift_id as string, r.kogebog_id as string]));
    version++;
  } catch {
    /* behold nuværende store */
  }
}

export async function opretKogebog(navn: string, emoji = '📕'): Promise<Kogebog | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const id = nyKogebogId();
  const { error } = await supabase
    .from('kogeboeger')
    .insert({ id, user_id: user.id, navn, emoji });
  if (error) {
    console.error('opretKogebog fejl:', error.message);
    return null;
  }
  const k: Kogebog = { id, navn, emoji };
  kogeboegerStore = [...kogeboegerStore, k];
  version++;
  return k;
}

export async function omdøbKogebog(id: string, navn: string): Promise<boolean> {
  const { error } = await supabase.from('kogeboeger').update({ navn }).eq('id', id);
  if (error) return false;
  kogeboegerStore = kogeboegerStore.map(k => (k.id === id ? { ...k, navn } : k));
  version++;
  return true;
}

export async function sletKogebog(id: string): Promise<boolean> {
  // on delete cascade rydder medlemskaberne i DB; vi rydder også den lokale map.
  const { error } = await supabase.from('kogeboeger').delete().eq('id', id);
  if (error) return false;
  kogeboegerStore = kogeboegerStore.filter(k => k.id !== id);
  medlemskab.forEach((kid, oid) => { if (kid === id) medlemskab.delete(oid); });
  version++;
  return true;
}

// Sæt (eller fjern, ved kogebogId=null) hvilken kogebog en opskrift ligger i.
// Upsert på (user_id, opskrift_id) håndhæver "én kogebog pr. opskrift" — at
// flytte er bare at overskrive kogebog_id.
export async function sætKogebogForOpskrift(
  opskriftId: string,
  kogebogId: string | null,
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  if (kogebogId === null) {
    const { error } = await supabase
      .from('kogebog_medlemskab')
      .delete()
      .eq('user_id', user.id)
      .eq('opskrift_id', opskriftId);
    if (error) return false;
    medlemskab.delete(opskriftId);
  } else {
    const { error } = await supabase
      .from('kogebog_medlemskab')
      .upsert(
        { user_id: user.id, opskrift_id: opskriftId, kogebog_id: kogebogId },
        { onConflict: 'user_id,opskrift_id' },
      );
    if (error) return false;
    medlemskab.set(opskriftId, kogebogId);
  }
  version++;
  return true;
}
```

- [ ] **Step 2: Verificér tsc**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 3: Commit**

```bash
git add "lib/kogebøger.ts"
git commit -m "feat(kogebøger): in-memory store + DB-mutationer (a la favoritter)"
```

---

## Task 3: Hent kogebøger ved opstart — `App.tsx`

**Files:**
- Modify: `App.tsx:26-28` (imports) og `App.tsx:205-209` (opstarts-effekt)

- [ ] **Step 1: Tilføj import**

I `App.tsx`, efter linjen `import { hentFavoritter } from './lib/favoritter';` (linje 27), indsæt:

```ts
import { hentKogebøger, hentMedlemskaber } from './lib/kogebøger';
```

- [ ] **Step 2: Kald hent ved session-opstart**

I `App.tsx` i `RootNavigator`-effekten, find blokken (omkring linje 205-209):

```ts
    // Hent brugerens importerede opskrifter + favoritter + overvågede varer ind
    // i storen (fire-and-forget) — fejler det, virker appen videre uden dem
    hentBrugerOpskrifter();
    hentFavoritter();
    hentWatchlist();
```

Erstat med:

```ts
    // Hent brugerens importerede opskrifter + favoritter + kogebøger + overvågede
    // varer ind i storen (fire-and-forget) — fejler det, virker appen videre uden dem
    hentBrugerOpskrifter();
    hentFavoritter();
    hentKogebøger();
    hentMedlemskaber();
    hentWatchlist();
```

- [ ] **Step 3: Verificér tsc**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat(kogebøger): hent kogebøger + medlemskaber ved opstart"
```

---

## Task 4: Genbrugelig navn-input — `components/NavngivModal.tsx`

`Alert.prompt` findes kun på iOS. Denne lille modal bruges til BÅDE at oprette og omdøbe kogebøger (Task 5 + Task 7), så navngivning er cross-platform og ikke duplikeres.

**Files:**
- Create: `components/NavngivModal.tsx`

- [ ] **Step 1: Skriv komponenten**

Create `components/NavngivModal.tsx`:

```tsx
// Lille genbrugelig navn-input (opret/omdøb). Cross-platform — Alert.prompt
// findes kun på iOS, så vi bruger en rigtig TextInput-modal i stedet.
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';

type Props = {
  synlig: boolean;
  titel: string;
  startVærdi?: string;
  placeholder?: string;
  gemTekst?: string;
  onGem: (navn: string) => void;
  onLuk: () => void;
};

export default function NavngivModal({
  synlig, titel, startVærdi = '', placeholder = 'Navn', gemTekst = 'Gem', onGem, onLuk,
}: Props) {
  const [navn, setNavn] = useState(startVærdi);
  useEffect(() => { if (synlig) setNavn(startVærdi); }, [synlig, startVærdi]);

  function gem() {
    const rent = navn.trim();
    if (!rent) return;
    onGem(rent);
  }

  return (
    <Modal visible={synlig} transparent animationType="fade" onRequestClose={onLuk}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onLuk} />
        <View style={styles.boks}>
          <Text style={styles.titel}>{titel}</Text>
          <TextInput
            style={styles.input}
            value={navn}
            onChangeText={setNavn}
            placeholder={placeholder}
            placeholderTextColor={Colors.inkSoft}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={gem}
          />
          <View style={styles.knapper}>
            <TouchableOpacity style={styles.annullerKnap} onPress={onLuk}>
              <Text style={styles.annullerTekst}>Annuller</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.gemKnap, !navn.trim() && styles.gemKnapDisabled]}
              onPress={gem}
              disabled={!navn.trim()}
            >
              <Text style={styles.gemTekst}>{gemTekst}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 28 },
  boks: { backgroundColor: Colors.paper, borderRadius: Radii.card, padding: 20 },
  titel: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, marginBottom: 14 },
  input: {
    backgroundColor: Colors.card, borderRadius: Radii.btn, borderWidth: 1, borderColor: Colors.line,
    padding: 14, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.ink,
  },
  knapper: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  annullerKnap: { paddingVertical: 12, paddingHorizontal: 16 },
  annullerTekst: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  gemKnap: { backgroundColor: Colors.green, borderRadius: Radii.btn, paddingVertical: 12, paddingHorizontal: 22 },
  gemKnapDisabled: { backgroundColor: Colors.line },
  gemTekst: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
});
```

- [ ] **Step 2: Verificér tsc**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 3: Commit**

```bash
git add "components/NavngivModal.tsx"
git commit -m "feat(kogebøger): NavngivModal — cross-platform navn-input"
```

---

## Task 5: Vælg-kogebog-modal — `components/VælgKogebogModal.tsx`

Enkelt-vælger (én kogebog pr. opskrift). Bruges fra opskrift-detaljen (Task 6) og foto-bulken (Task 9).

**Files:**
- Create: `components/VælgKogebogModal.tsx`

- [ ] **Step 1: Skriv komponenten**

Create `components/VælgKogebogModal.tsx`:

```tsx
// Enkelt-vælger: vælg hvilken kogebog en opskrift skal ligge i (eller fjern).
// "+ Ny kogebog" opretter via NavngivModal og vælger den nye med det samme.
// Kalderen får det valgte kogebog-id (eller null = fjern fra kogebog).
import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';
import { kogebøger, opretKogebog, antalIKogebog } from '../lib/kogebøger';
import NavngivModal from './NavngivModal';

type Props = {
  synlig: boolean;
  valgtKogebogId: string | null;     // hvilken kogebog opskriften ligger i nu
  onVælg: (kogebogId: string | null) => void;
  onLuk: () => void;
};

export default function VælgKogebogModal({ synlig, valgtKogebogId, onVælg, onLuk }: Props) {
  const [navngivÅben, setNavngivÅben] = useState(false);
  const liste = kogebøger();

  async function opret(navn: string) {
    setNavngivÅben(false);
    const k = await opretKogebog(navn);
    if (!k) { Alert.alert('Fejl', 'Kunne ikke oprette kogebogen. Er du logget ind?'); return; }
    onVælg(k.id);
  }

  return (
    <Modal visible={synlig} animationType="slide" presentationStyle="pageSheet" onRequestClose={onLuk}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onLuk} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.luk}>Luk</Text>
          </TouchableOpacity>
          <Text style={styles.titel}>Læg i kogebog</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.indhold}>
          <TouchableOpacity style={styles.nyRække} onPress={() => setNavngivÅben(true)}>
            <Text style={styles.nyPlus}>＋</Text>
            <Text style={styles.nyTekst}>Ny kogebog</Text>
          </TouchableOpacity>

          {valgtKogebogId && (
            <TouchableOpacity style={styles.række} onPress={() => onVælg(null)}>
              <Text style={styles.rækkeEmoji}>🚫</Text>
              <Text style={styles.rækkeNavn}>Fjern fra kogebog</Text>
            </TouchableOpacity>
          )}

          {liste.length === 0 ? (
            <Text style={styles.tom}>Du har ingen kogebøger endnu — opret en ovenfor.</Text>
          ) : (
            liste.map(k => {
              const valgt = k.id === valgtKogebogId;
              return (
                <TouchableOpacity
                  key={k.id}
                  style={[styles.række, valgt && styles.rækkeValgt]}
                  onPress={() => onVælg(k.id)}
                >
                  <Text style={styles.rækkeEmoji}>{k.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rækkeNavn}>{k.navn}</Text>
                    <Text style={styles.rækkeAntal}>{antalIKogebog(k.id)} opskrifter</Text>
                  </View>
                  {valgt && <Text style={styles.flueben}>✓</Text>}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <NavngivModal
          synlig={navngivÅben}
          titel="Ny kogebog"
          placeholder="Fx Min mors kogebog"
          gemTekst="Opret"
          onGem={opret}
          onLuk={() => setNavngivÅben(false)}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.canvas },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, paddingTop: 12, backgroundColor: Colors.paper,
    borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  luk: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, width: 40 },
  titel: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink },
  indhold: { padding: 16, gap: 10 },
  nyRække: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.green, borderStyle: 'dashed', padding: 16,
  },
  nyPlus: { fontSize: 20, color: Colors.green, fontFamily: 'Inter_700Bold' },
  nyTekst: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.green },
  række: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, padding: 16,
  },
  rækkeValgt: { borderColor: Colors.green, borderWidth: 2 },
  rækkeEmoji: { fontSize: 22 },
  rækkeNavn: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  rækkeAntal: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 2 },
  flueben: { fontSize: 16, color: Colors.green, fontFamily: 'Inter_700Bold' },
  tom: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textAlign: 'center', padding: 24 },
});
```

- [ ] **Step 2: Verificér tsc**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 3: Commit**

```bash
git add "components/VælgKogebogModal.tsx"
git commit -m "feat(kogebøger): VælgKogebogModal — enkelt-vælger (vælg/opret/fjern)"
```

---

## Task 6: "Læg i kogebog" i opskrift-detaljen

**Files:**
- Modify: `components/OpskriftDetaljeModal.tsx` (imports, state, en ny række i indholdet, styles)

- [ ] **Step 1: Tilføj imports**

I `components/OpskriftDetaljeModal.tsx`, efter `import KlokkeKnap from './KlokkeKnap';` (linje 10), indsæt:

```ts
import VælgKogebogModal from './VælgKogebogModal';
import { kogebogForOpskrift, sætKogebogForOpskrift, kogebøgerVersion } from '../lib/kogebøger';
```

- [ ] **Step 2: Tilføj state + synk**

I komponenten, efter de eksisterende `useEffect`-blokke (efter linje 42, `useEffect(() => { if (opskrift) hentWatchlist(); }, [opskrift?.id]);`), indsæt:

```ts
  // Hvilken kogebog ligger opskriften i? Synkroniseres når en ny åbnes, og
  // når kogebog-storen ændrer sig (kogebøgerVersion bumpes ved valg/opret).
  const [kogebogÅben, setKogebogÅben] = useState(false);
  const [kogebogNavn, setKogebogNavn] = useState<string | null>(null);
  useEffect(() => {
    setKogebogNavn(opskrift ? (kogebogForOpskrift(opskrift.id)?.navn ?? null) : null);
  }, [opskrift?.id, kogebøgerVersion()]);

  async function vælgKogebog(kogebogId: string | null) {
    if (!opskrift) return;
    setKogebogÅben(false);
    const ok = await sætKogebogForOpskrift(opskrift.id, kogebogId);
    if (ok) setKogebogNavn(kogebogId ? (kogebogForOpskrift(opskrift.id)?.navn ?? null) : null);
    else Alert.alert('Fejl', 'Kunne ikke gemme. Er du logget ind?');
  }
```

Tilføj `Alert` til import-listen fra `react-native` øverst (linje 2-5) hvis det ikke allerede er der — opdatér til:

```ts
import {
  Modal, View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, ActivityIndicator, ImageBackground, Alert,
} from 'react-native';
```

- [ ] **Step 3: Indsæt "Læg i kogebog"-rækken**

I `indholdPadding`-blokken, lige FØR `{/* Ingredienser */}` (linje 116), indsæt:

```tsx
          {/* Kogebog-tilhørsforhold */}
          <TouchableOpacity style={styles.kogebogRække} onPress={() => setKogebogÅben(true)}>
            <Text style={styles.kogebogIkon}>📚</Text>
            <Text style={styles.kogebogTekst} numberOfLines={1}>
              {kogebogNavn ? kogebogNavn : 'Læg i kogebog'}
            </Text>
            <Text style={styles.kogebogSkift}>{kogebogNavn ? 'Skift' : 'Vælg'}</Text>
          </TouchableOpacity>
```

- [ ] **Step 4: Monter vælgeren**

Lige FØR den afsluttende `</SafeAreaView>` (linje 196), indsæt:

```tsx
        <VælgKogebogModal
          synlig={kogebogÅben}
          valgtKogebogId={opskrift ? (kogebogForOpskrift(opskrift.id)?.id ?? null) : null}
          onVælg={vælgKogebog}
          onLuk={() => setKogebogÅben(false)}
        />
```

- [ ] **Step 5: Tilføj styles**

I `StyleSheet.create({ ... })`, før den afsluttende `});` (efter `sletKnapTekst`-linjen, linje 296), indsæt:

```ts
  kogebogRække: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, padding: 14, marginBottom: 20,
  },
  kogebogIkon: { fontSize: 18 },
  kogebogTekst: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  kogebogSkift: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.green },
```

- [ ] **Step 6: Verificér tsc**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 7: Manuel røgtest**

Start appen (`npx expo start`), åbn en opskrift fra ret-vælgeren. Forventet: en "📚 Læg i kogebog"-række over ingredienserne. Tryk → vælg/opret en kogebog → rækken viser nu kogebogens navn. Genåbn opskriften → navnet huskes.

- [ ] **Step 8: Commit**

```bash
git add "components/OpskriftDetaljeModal.tsx"
git commit -m "feat(kogebøger): Læg i kogebog fra opskrift-detaljen"
```

---

## Task 7: "📚 Kogebøger" i ret-vælgeren (reol + drill-in + administrér)

**Files:**
- Modify: `components/VælgRetterModal.tsx` (imports, Filter-type, state, filter-logik, chip, reol-render, drill-in-header, handlers, styles)

- [ ] **Step 1: Tilføj imports**

I `components/VælgRetterModal.tsx`, efter `import { erFavorit } from '../lib/favoritter';` (linje 18), indsæt:

```ts
import {
  kogebøger, opskrifterIKogebog, antalIKogebog, kogebogForOpskrift,
  opretKogebog, omdøbKogebog, sletKogebog,
} from '../lib/kogebøger';
import NavngivModal from './NavngivModal';
```

- [ ] **Step 2: Udvid Filter-typen**

Find (linje 23):

```ts
type Filter = KategoriId | 'favoritter' | 'mine';
```

Erstat med:

```ts
type Filter = KategoriId | 'favoritter' | 'mine' | 'kogeboeger';
```

- [ ] **Step 3: Tilføj state**

Efter `const [kategori, setKategori] = useState<Filter | null>(null);` (linje 53), indsæt:

```ts
  // Drill-in: når en kogebog er åbnet, filtreres grid'et til dens opskrifter.
  const [valgtKogebog, setValgtKogebog] = useState<string | null>(null);
  // Opret/omdøb-navngivning (omdøb sætter et id; opret = null-id)
  const [navngiv, setNavngiv] = useState<{ id: string | null; start: string } | null>(null);
```

- [ ] **Step 4: Udvid filter-logikken**

Find `matcherKategori`-udtrykket (linje 90-98):

```ts
    const matcherKategori = !kategori
      || (kategori === 'favoritter'
        ? erFavorit(o.id)
        : kategori === 'mine'
          ? !!o.importeret
          : kategori === 'aftensmad'
            // Aftensmad = alt der ikke er tagget suppe, salat eller brød
            ? !(kat?.includes('suppe') || kat?.includes('salat') || kat?.includes('broed') || kat?.includes('dessert'))
            : kat?.includes(kategori));
```

Erstat med (tilføjer `kogeboeger`-grenen — i reol-tilstand uden valgt kogebog vises ingen opskriftskort, da reolen rendres separat):

```ts
    const matcherKategori = !kategori
      || (kategori === 'favoritter'
        ? erFavorit(o.id)
        : kategori === 'mine'
          ? !!o.importeret
          : kategori === 'kogeboeger'
            ? (valgtKogebog ? opskrifterIKogebog(valgtKogebog).includes(o.id) : false)
            : kategori === 'aftensmad'
              // Aftensmad = alt der ikke er tagget suppe, salat eller brød
              ? !(kat?.includes('suppe') || kat?.includes('salat') || kat?.includes('broed') || kat?.includes('dessert'))
              : kat?.includes(kategori));
```

- [ ] **Step 5: Tilføj handlers**

Efter `vælgKategori`-funktionen (linje 112-114), indsæt:

```ts
  // Skift til kogebog-reolen (eller væk fra den). Nulstiller drill-in.
  function vælgKogebøger() {
    setValgtKogebog(null);
    setKategori(kategori === 'kogeboeger' ? null : 'kogeboeger');
  }

  async function gemNavngivning(navn: string) {
    const mål = navngiv;
    setNavngiv(null);
    if (!mål) return;
    if (mål.id) {
      const ok = await omdøbKogebog(mål.id, navn);
      if (!ok) Alert.alert('Fejl', 'Kunne ikke omdøbe kogebogen.');
      else setImportNonce(n => n + 1);
    } else {
      const k = await opretKogebog(navn);
      if (!k) Alert.alert('Fejl', 'Kunne ikke oprette kogebogen. Er du logget ind?');
      else { setImportNonce(n => n + 1); setValgtKogebog(k.id); }
    }
  }

  function administrérKogebog(id: string, navn: string) {
    Alert.alert(navn, undefined, [
      { text: 'Omdøb', onPress: () => setNavngiv({ id, start: navn }) },
      {
        text: 'Slet', style: 'destructive', onPress: () => {
          Alert.alert('Slet kogebog', `Slet "${navn}"? Opskrifterne slettes ikke — de fjernes bare fra kogebogen.`, [
            { text: 'Annuller', style: 'cancel' },
            {
              text: 'Slet', style: 'destructive', onPress: async () => {
                const ok = await sletKogebog(id);
                if (ok) { if (valgtKogebog === id) setValgtKogebog(null); setImportNonce(n => n + 1); }
                else Alert.alert('Fejl', 'Kunne ikke slette kogebogen.');
              },
            },
          ]);
        },
      },
      { text: 'Annuller', style: 'cancel' },
    ]);
  }
```

- [ ] **Step 6: Nulstil drill-in når kategori skifter væk fra kogebøger**

I `håndterAnnuller` (linje 161-166) og `håndterBekræft` (linje 151-159), tilføj `setValgtKogebog(null);` lige efter `setKategori(null);` i begge funktioner.

- [ ] **Step 7: Tilføj "📚 Kogebøger"-chip**

I chip-rækken, efter "🔗 Dine opskrifter"-chippen (efter linje 284, den afsluttende `</TouchableOpacity>` for `kategori === 'mine'`), indsæt:

```tsx
            <TouchableOpacity
              style={[styles.chip, kategori === 'kogeboeger' && styles.chipAktiv]}
              onPress={vælgKogebøger}
            >
              <Text style={[styles.chipTekst, kategori === 'kogeboeger' && styles.chipTekstAktiv]}>📚 Kogebøger</Text>
            </TouchableOpacity>
```

- [ ] **Step 8: Render reolen (når kogebøger valgt, men ingen drill-in)**

Find starten af indholds-`ScrollView` (linje 299):

```tsx
        <ScrollView contentContainerStyle={styles.indhold} showsVerticalScrollIndicator={false}>
          {/* Tom kategori */}
```

Indsæt LIGE EFTER `<ScrollView ...>`-linjen (før `{/* Tom kategori */}`):

```tsx
          {/* Kogebog-reol: liste af kogebøger + opret. Drill-in sætter valgtKogebog. */}
          {kategori === 'kogeboeger' && !valgtKogebog && (
            <View style={styles.reol}>
              <TouchableOpacity style={styles.nyKogebogKort} onPress={() => setNavngiv({ id: null, start: '' })}>
                <Text style={styles.nyKogebogPlus}>＋</Text>
                <Text style={styles.nyKogebogTekst}>Ny kogebog</Text>
              </TouchableOpacity>
              {kogebøger().length === 0 ? (
                <Text style={styles.reolTom}>Ingen kogebøger endnu. Opret en, eller åbn en opskrift og tryk "Læg i kogebog".</Text>
              ) : (
                kogebøger().map(k => (
                  <TouchableOpacity
                    key={k.id}
                    style={styles.kogebogKort}
                    onPress={() => setValgtKogebog(k.id)}
                    onLongPress={() => administrérKogebog(k.id, k.navn)}
                  >
                    <Text style={styles.kogebogKortEmoji}>{k.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.kogebogKortNavn}>{k.navn}</Text>
                      <Text style={styles.kogebogKortAntal}>{antalIKogebog(k.id)} opskrifter</Text>
                    </View>
                    <Text style={styles.kogebogKortPil}>›</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* Drill-in-header: tilbage til reolen */}
          {kategori === 'kogeboeger' && valgtKogebog && (
            <TouchableOpacity style={styles.drillHeader} onPress={() => setValgtKogebog(null)}>
              <Text style={styles.drillTilbage}>‹ Alle kogebøger</Text>
              <Text style={styles.drillNavn} numberOfLines={1}>
                {kogebøger().find(k => k.id === valgtKogebog)?.navn ?? ''}
              </Text>
            </TouchableOpacity>
          )}
```

- [ ] **Step 9: Skjul grid'et i reol-tilstand**

Find `{/* Grid af opskrifter */}` (linje 318) og dens `<View style={styles.grid}>` (linje 319). Wrap grid'et + "tom kategori"-blokken, så de ikke vises i ren reol-tilstand. Konkret: ændr `{/* Tom kategori */}`-betingelsen (linje 301) fra:

```tsx
          {viste.length === 0 && (
```

til:

```tsx
          {viste.length === 0 && !(kategori === 'kogeboeger' && !valgtKogebog) && (
```

Og ændr "Indsæt egen opskrift"-kortets betingelse (linje 321) fra:

```tsx
            {!dagMode && (
```

til (skjul tilføj-kortet i reol-tilstand uden drill-in):

```tsx
            {!dagMode && !(kategori === 'kogeboeger' && !valgtKogebog) && (
```

> Bemærk: når `kategori === 'kogeboeger' && !valgtKogebog` er `viste` tom (Step 4), så grid'et rendrer ingen opskriftskort — kun reolen ovenfor vises. Ingen yderligere wrap nødvendig.

- [ ] **Step 10: Tom-tekst for tom kogebog**

I `tomKategoriTekst`-blokken (linje 306-314), tilføj en gren for drill-in i en tom kogebog. Find:

```tsx
                  : kategori === 'mine'
                    ? 'Du har ingen egne opskrifter endnu — tryk "+ Tilføj opskrift" øverst'
                    : 'Ingen retter i denne kategori endnu'}
```

Erstat med:

```tsx
                  : kategori === 'mine'
                    ? 'Du har ingen egne opskrifter endnu — tryk "+ Tilføj opskrift" øverst'
                    : kategori === 'kogeboeger'
                      ? 'Denne kogebog er tom — åbn en opskrift og tryk "Læg i kogebog"'
                      : 'Ingen retter i denne kategori endnu'}
```

- [ ] **Step 11: Monter NavngivModal**

Lige FØR `<TilføjOpskriftSheet`-blokken (linje 439), indsæt:

```tsx
        <NavngivModal
          synlig={!!navngiv}
          titel={navngiv?.id ? 'Omdøb kogebog' : 'Ny kogebog'}
          startVærdi={navngiv?.start ?? ''}
          placeholder="Fx Min mors kogebog"
          gemTekst={navngiv?.id ? 'Gem' : 'Opret'}
          onGem={gemNavngivning}
          onLuk={() => setNavngiv(null)}
        />
```

- [ ] **Step 12: Tilføj styles**

I `StyleSheet.create`, før den afsluttende `});` (efter `genererKnapTekst`, linje 642), indsæt:

```ts
  reol: { gap: 10 },
  nyKogebogKort: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.green, borderStyle: 'dashed', padding: 16,
  },
  nyKogebogPlus: { fontSize: 20, color: Colors.green, fontFamily: 'Inter_700Bold' },
  nyKogebogTekst: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.green },
  kogebogKort: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, padding: 16,
  },
  kogebogKortEmoji: { fontSize: 24 },
  kogebogKortNavn: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  kogebogKortAntal: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 2 },
  kogebogKortPil: { fontSize: 22, color: Colors.inkSoft, fontFamily: 'Inter_400Regular' },
  reolTom: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textAlign: 'center', padding: 24, lineHeight: 20 },
  drillHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  drillTilbage: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.green },
  drillNavn: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
```

- [ ] **Step 13: Verificér tsc**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 14: Manuel røgtest**

I ret-vælgeren: tryk "📚 Kogebøger"-chippen → reolen vises. Opret en kogebog → den vises. Læg et par opskrifter i den (fra detalje-modalen, Task 6) → tryk kogebogen → kun de opskrifter vises, med "‹ Alle kogebøger"-tilbage. Long-press en kogebog → Omdøb/Slet. Slet → kogebogen forsvinder, opskrifterne består (tjek under "Alle").

- [ ] **Step 15: Commit**

```bash
git add "components/VælgRetterModal.tsx"
git commit -m "feat(kogebøger): reol + drill-in + opret/omdøb/slet i ret-vælgeren"
```

---

## Task 8: Nyt "Importér fra kogebog"-valg i tilføj-arket

**Files:**
- Modify: `components/TilføjOpskriftSheet.tsx:12` (type) og `:20-25` (VALG-listen)

- [ ] **Step 1: Udvid TilføjMetode**

Find (linje 12):

```ts
export type TilføjMetode = 'kamera' | 'galleri' | 'link' | 'skriv';
```

Erstat med:

```ts
export type TilføjMetode = 'kamera' | 'galleri' | 'link' | 'skriv' | 'kogebog';
```

- [ ] **Step 2: Tilføj valget i listen**

Find `VALG`-arrayet (linje 20-25) og tilføj en linje før den afsluttende `];`:

```ts
  { key: 'kogebog', ikon: 'library-outline', titel: 'Fra kogebog', sub: 'Flere sidefotos på én gang' },
```

- [ ] **Step 3: Verificér tsc**

Run: `npx tsc --noEmit`
Expected: ingen fejl. (Bemærk: `App.tsx`s `vælgMetode` har en `switch`-lignende if-kæde; den ukendte `'kogebog'`-nøgle falder pt. ned i `setMetode('kogebog')`-grenen, som `ImportOpskriftModal` ignorerer. Den korrekte routing tilføjes i Task 9, hvor arket bruges i `VælgRetterModal`. For at undgå at den centrale "+"-knap i App.tsx åbner et halvt flow, håndteres `'kogebog'` eksplicit i næste step.)

- [ ] **Step 4: Gør App.tsx's "+"-knap robust over for det nye valg**

I `App.tsx`s `vælgMetode` (linje 104-114), lige efter `if (m === 'skriv') { … return; }` (linje 109), indsæt:

```ts
    if (m === 'kogebog') {
      // Foto-bulk bor i ret-vælgeren (Planer). Fra den centrale +-knap sender
      // vi brugeren ikke videre her — undgå at åbne et halvt flow.
      setTimeout(() => Alert.alert('Importér fra kogebog', 'Åbn “Vælg retter” på Planer-fanen og tryk + for at importere flere sider fra en kogebog.'), 280);
      return;
    }
```

Tilføj `Alert` til `react-native`-importen i App.tsx (linje 3):

```ts
import { View, Text, TouchableOpacity, Alert } from 'react-native';
```

- [ ] **Step 5: Verificér tsc**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 6: Commit**

```bash
git add "components/TilføjOpskriftSheet.tsx" App.tsx
git commit -m "feat(kogebøger): 'Fra kogebog'-valg i tilføj-arket"
```

---

## Task 9: Foto-bulk-import — `components/ImportKogebogModal.tsx` + wiring

**Files:**
- Create: `components/ImportKogebogModal.tsx`
- Modify: `components/VælgRetterModal.tsx` (route `'kogebog'`-metoden til den nye modal)

- [ ] **Step 1: Skriv bulk-import-modalen**

Create `components/ImportKogebogModal.tsx`. Flow: vælg mål-kogebog → vælg flere billeder → sekventiel import via `importer-opskrift` med fremgang → batch-review (navn redigerbart, fravælg, advarsler) → "Gem alle" gemmer hver opskrift og lægger den i kogebogen. Per-ingrediens-finredigering er bevidst henvist til den eksisterende "Rediger opskrift" på den gemte opskrift (holder bulk-flowet let).

```tsx
// Foto-bulk: importér flere opskrifter fra sidefotos af en fysisk kogebog.
// Ét billede = én opskrift (klient-side løkke over den eksisterende edge-
// funktion importer-opskrift). Alle gemte opskrifter lægges i én kogebog.
// Finredigering pr. ingrediens sker bagefter via "Rediger opskrift".
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, ActivityIndicator, Image, Alert,
} from 'react-native';
import type * as ImagePickerTyper from 'expo-image-picker';
import { Colors, Radii } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { gemBrugerOpskrift } from '../lib/brugerOpskrifter';
import { kogebøger, opretKogebog, sætKogebogForOpskrift } from '../lib/kogebøger';
import type { OpskriftIngrediens } from '../types/opskrift';
import NavngivModal from './NavngivModal';

const MAKS_BILLEDER = 10;

type ImporteretRet = {
  lokaltBillede: string;
  status: 'venter' | 'henter' | 'ok' | 'fejl';
  inkluder: boolean;
  navn: string;
  koed: string;
  portioner: number;
  minutter?: number;
  kategorier?: string[];
  billede_url?: string | null;
  ingredienser: OpskriftIngrediens[];
  fremgangsmaade: string[];
  lavSikkerhed: number;
};

type Props = {
  synlig: boolean;
  onLuk: () => void;
  onFærdig: () => void;   // kald efter at opskrifter er gemt, så vælgeren gen-læser
};

export default function ImportKogebogModal({ synlig, onLuk, onFærdig }: Props) {
  const [kogebogId, setKogebogId] = useState<string | null>(null);
  const [navngivÅben, setNavngivÅben] = useState(false);
  const [retter, setRetter] = useState<ImporteretRet[]>([]);
  const [kører, setKører] = useState(false);
  const [fremgang, setFremgang] = useState<{ nu: number; i_alt: number } | null>(null);
  const [gemmer, setGemmer] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);

  useEffect(() => {
    if (!synlig) {
      setKogebogId(null); setNavngivÅben(false); setRetter([]);
      setKører(false); setFremgang(null); setGemmer(false); setFejl(null);
    }
  }, [synlig]);

  const liste = kogebøger();
  const målNavn = liste.find(k => k.id === kogebogId)?.navn ?? null;

  async function opret(navn: string) {
    setNavngivÅben(false);
    const k = await opretKogebog(navn);
    if (!k) { Alert.alert('Fejl', 'Kunne ikke oprette kogebogen. Er du logget ind?'); return; }
    setKogebogId(k.id);
  }

  // Vælg flere billeder og kør dem sekventielt gennem importer-opskrift.
  async function vælgOgImportér() {
    setFejl(null);
    try {
      const ImagePicker = await import('expo-image-picker');
      const tilladelse = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!tilladelse.granted) {
        Alert.alert('Adgang mangler', 'Giv adgang til dine billeder for at vælge sidefotos.');
        return;
      }
      const valg: ImagePickerTyper.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: MAKS_BILLEDER,
      };
      const res = await ImagePicker.launchImageLibraryAsync(valg);
      if (res.canceled || !res.assets?.length) return;

      const assets = res.assets.slice(0, MAKS_BILLEDER);
      const ImageManipulator = await import('expo-image-manipulator');

      // Init liste med pladsholdere, så brugeren ser fremgang
      const init: ImporteretRet[] = assets.map(a => ({
        lokaltBillede: a.uri, status: 'venter', inkluder: true,
        navn: '', koed: 'Alt', portioner: 4, ingredienser: [], fremgangsmaade: [], lavSikkerhed: 0,
      }));
      setRetter(init);
      setKører(true);

      for (let i = 0; i < assets.length; i++) {
        setFremgang({ nu: i + 1, i_alt: assets.length });
        setRetter(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'henter' } : r));
        try {
          const lille = await ImageManipulator.manipulateAsync(
            assets[i].uri,
            [{ resize: { width: 1024 } }],
            { compress: 0.6, base64: true, format: ImageManipulator.SaveFormat.JPEG },
          );
          if (!lille.base64) throw new Error('tomt billede');
          const { data: svar, error } = await supabase.functions.invoke('importer-opskrift', {
            body: { billede: `data:image/jpeg;base64,${lille.base64}` },
          });
          if (error || !svar || svar.error) throw new Error(svar?.error ?? 'læsefejl');
          const ingr: OpskriftIngrediens[] = Array.isArray(svar.ingredienser) ? svar.ingredienser : [];
          setRetter(prev => prev.map((r, idx) => idx === i ? {
            ...r, status: 'ok',
            navn: svar.navn ?? 'Importeret opskrift',
            koed: svar.koed ?? 'Alt',
            portioner: svar.portioner ?? 4,
            minutter: svar.minutter,
            kategorier: svar.kategorier ?? [],
            billede_url: svar.billede_url ?? null,
            ingredienser: ingr,
            fremgangsmaade: Array.isArray(svar.fremgangsmaade) ? svar.fremgangsmaade : [],
            lavSikkerhed: ingr.filter(x => x.lav_sikkerhed).length,
          } : r));
        } catch {
          setRetter(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'fejl', inkluder: false } : r));
        }
      }
    } catch {
      setFejl('Kunne ikke åbne billederne. Prøv igen.');
    } finally {
      setKører(false);
      setFremgang(null);
    }
  }

  function sætNavn(i: number, navn: string) {
    setRetter(prev => prev.map((r, idx) => idx === i ? { ...r, navn } : r));
  }
  function toggleInkluder(i: number) {
    setRetter(prev => prev.map((r, idx) => idx === i ? { ...r, inkluder: !r.inkluder } : r));
  }

  const klarTilGem = retter.filter(r => r.status === 'ok' && r.inkluder && r.navn.trim());

  async function gemAlle() {
    if (!kogebogId) { Alert.alert('Vælg kogebog', 'Vælg eller opret en kogebog først.'); return; }
    if (klarTilGem.length === 0) return;
    setGemmer(true);
    try {
      for (const r of klarTilGem) {
        const gemt = await gemBrugerOpskrift({
          navn: r.navn.trim(), koed: r.koed, portioner: r.portioner, minutter: r.minutter,
          kategorier: r.kategorier, billede_url: r.billede_url, kilde_navn: 'Kogebog',
          ingredienser: r.ingredienser, fremgangsmaade: r.fremgangsmaade,
        });
        if (gemt) await sætKogebogForOpskrift(gemt.id, kogebogId);
      }
      onFærdig();
    } finally {
      setGemmer(false);
    }
  }

  return (
    <Modal visible={synlig} animationType="slide" presentationStyle="pageSheet" onRequestClose={onLuk}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onLuk} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.luk}>Luk</Text>
          </TouchableOpacity>
          <Text style={styles.titel}>Importér fra kogebog</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.indhold}>
          {/* Mål-kogebog */}
          <Text style={styles.label}>Kogebog</Text>
          <TouchableOpacity style={styles.kogebogVælger} onPress={() => setNavngivÅben(true)}>
            <Text style={styles.kogebogVælgerTekst}>{målNavn ? `📚 ${målNavn}` : '＋ Opret ny kogebog'}</Text>
          </TouchableOpacity>
          {liste.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {liste.map(k => (
                <TouchableOpacity
                  key={k.id}
                  style={[styles.chip, kogebogId === k.id && styles.chipAktiv]}
                  onPress={() => setKogebogId(k.id)}
                >
                  <Text style={[styles.chipTekst, kogebogId === k.id && styles.chipTekstAktiv]}>{k.emoji} {k.navn}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Vælg billeder */}
          <TouchableOpacity
            style={[styles.vælgKnap, kører && styles.knapDisabled]}
            onPress={vælgOgImportér}
            disabled={kører}
          >
            <Text style={styles.vælgKnapTekst}>
              {retter.length ? 'Vælg billeder igen' : `🖼️ Vælg sidefotos (maks ${MAKS_BILLEDER})`}
            </Text>
          </TouchableOpacity>
          <Text style={styles.hjælp}>Ét billede = én opskrift. Får en opskrift to sider, så tag ét billede med begge sider.</Text>

          {fremgang && (
            <View style={styles.fremgangBoks}>
              <ActivityIndicator color={Colors.green} />
              <Text style={styles.fremgangTekst}>Læser {fremgang.nu} af {fremgang.i_alt}…</Text>
            </View>
          )}
          {fejl && <Text style={styles.fejl}>{fejl}</Text>}

          {/* Batch-review */}
          {retter.map((r, i) => (
            <View key={i} style={[styles.retKort, !r.inkluder && styles.retKortFra]}>
              <Image source={{ uri: r.lokaltBillede }} style={styles.miniBillede} />
              <View style={{ flex: 1 }}>
                {r.status === 'henter' || r.status === 'venter' ? (
                  <Text style={styles.retStatus}>{r.status === 'henter' ? 'Læser…' : 'Venter…'}</Text>
                ) : r.status === 'fejl' ? (
                  <Text style={styles.retFejl}>Kunne ikke læses — prøv et tydeligere billede</Text>
                ) : (
                  <>
                    <TextInput
                      style={styles.retNavn}
                      value={r.navn}
                      onChangeText={t => sætNavn(i, t)}
                      placeholder="Navn på retten"
                      placeholderTextColor={Colors.inkSoft}
                    />
                    <Text style={styles.retMeta}>
                      {r.ingredienser.length} ingredienser{r.lavSikkerhed > 0 ? ` · ⚠️ ${r.lavSikkerhed} uden pris` : ''}
                    </Text>
                  </>
                )}
              </View>
              {r.status === 'ok' && (
                <TouchableOpacity onPress={() => toggleInkluder(i)} style={styles.inkluderKnap}>
                  <Text style={styles.inkluderTekst}>{r.inkluder ? '✓' : '＋'}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>

        {retter.some(r => r.status === 'ok') && (
          <View style={styles.bund}>
            <TouchableOpacity
              style={[styles.gemKnap, (gemmer || klarTilGem.length === 0 || !kogebogId) && styles.knapDisabled]}
              onPress={gemAlle}
              disabled={gemmer || klarTilGem.length === 0 || !kogebogId}
            >
              {gemmer
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.gemKnapTekst}>Gem {klarTilGem.length} opskrifter i kogebog</Text>}
            </TouchableOpacity>
          </View>
        )}

        <NavngivModal
          synlig={navngivÅben}
          titel="Ny kogebog"
          placeholder="Fx Min mors kogebog"
          gemTekst="Opret"
          onGem={opret}
          onLuk={() => setNavngivÅben(false)}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.canvas },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, paddingTop: 12, backgroundColor: Colors.paper,
    borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  luk: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, width: 40 },
  titel: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink },
  indhold: { padding: 20, paddingBottom: 40 },
  label: {
    fontSize: 12, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.inkSoft,
    letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8,
  },
  kogebogVælger: {
    backgroundColor: Colors.card, borderRadius: Radii.btn,
    borderWidth: 1, borderColor: Colors.line, padding: 14,
  },
  kogebogVælgerTekst: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  chips: { gap: 8, paddingVertical: 12 },
  chip: {
    borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.line,
  },
  chipAktiv: { backgroundColor: Colors.green, borderColor: Colors.green },
  chipTekst: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  chipTekstAktiv: { color: '#fff' },
  vælgKnap: {
    backgroundColor: Colors.green, borderRadius: Radii.btn,
    padding: 16, alignItems: 'center', marginTop: 16,
  },
  knapDisabled: { backgroundColor: Colors.line },
  vælgKnapTekst: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  hjælp: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, lineHeight: 18, marginTop: 8 },
  fremgangBoks: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  fremgangTekst: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  fejl: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.red, marginTop: 10 },
  retKort: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, padding: 12,
  },
  retKortFra: { opacity: 0.5 },
  miniBillede: { width: 52, height: 52, borderRadius: 8, backgroundColor: Colors.line },
  retStatus: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  retFejl: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.red },
  retNavn: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink, padding: 0 },
  retMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 4 },
  inkluderKnap: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.green,
    alignItems: 'center', justifyContent: 'center',
  },
  inkluderTekst: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
  bund: {
    padding: 20, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: Colors.paper,
  },
  gemKnap: { backgroundColor: Colors.green, borderRadius: Radii.btn, padding: 16, alignItems: 'center' },
  gemKnapTekst: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
```

- [ ] **Step 2: Wire modalen ind i ret-vælgeren**

I `components/VælgRetterModal.tsx`, tilføj importen efter `import TilføjOpskriftSheet, { TilføjMetode } from './TilføjOpskriftSheet';` (linje 17):

```ts
import ImportKogebogModal from './ImportKogebogModal';
```

- [ ] **Step 3: Tilføj state for bulk-modalen**

Efter `const [importÅben, setImportÅben] = useState(false);` (linje 59), indsæt:

```ts
  const [kogebogImportÅben, setKogebogImportÅben] = useState(false);
```

- [ ] **Step 4: Route 'kogebog'-metoden**

I `vælgMetode` (linje 118-134), lige efter `setSheetÅben(false);` (linje 119), indsæt:

```ts
    if (m === 'kogebog') {
      setTimeout(() => setKogebogImportÅben(true), 280);
      return;
    }
```

- [ ] **Step 5: Monter bulk-modalen**

Lige efter `<ImportOpskriftModal … />`-blokken (efter linje 460), indsæt:

```tsx
        <ImportKogebogModal
          synlig={kogebogImportÅben}
          onLuk={() => setKogebogImportÅben(false)}
          onFærdig={() => { setKogebogImportÅben(false); setImportNonce(n => n + 1); }}
        />
```

- [ ] **Step 6: Verificér tsc**

Run: `npx tsc --noEmit`
Expected: ingen fejl.

- [ ] **Step 7: Manuel røgtest**

I ret-vælgeren: tryk "+ Tilføj opskrift" → "Fra kogebog". Opret/vælg en kogebog. Vælg 2-3 billeder (brug fotos af opskriftssider; tag gerne ét bevidst sløret). Forventet: fremgangs-tæller "Læser 1 af 3…", derefter en review-liste; det slørede markeres "Kunne ikke læses" og fravælges automatisk. Ret et navn, tryk "Gem N opskrifter i kogebog". Luk → åbn "📚 Kogebøger" → kogebogen indeholder de gemte opskrifter, og de har priser/tilbuds-badges som andre opskrifter.

- [ ] **Step 8: Commit**

```bash
git add "components/ImportKogebogModal.tsx" "components/VælgRetterModal.tsx"
git commit -m "feat(kogebøger): foto-bulk import (flere sider → opskrifter i en kogebog)"
```

---

## Task 10: Slut-integration & oprydning

**Files:**
- (ingen nye — verifikation på tværs)

- [ ] **Step 1: Fuld tsc**

Run: `npx tsc --noEmit`
Expected: ingen fejl i hele projektet.

- [ ] **Step 2: End-to-end røgtest (hele flowet)**

Start appen (`npx expo start`). Gennemgå:
1. Opret kogebog "Test" via "📚 Kogebøger" → reol.
2. Læg en **indbygget** opskrift i "Test" (detalje → Læg i kogebog).
3. Foto-bulk: importér 2 sider til en ny kogebog "Bog".
4. Flyt en opskrift fra "Bog" til "Test" (detalje → Skift) → forsvinder fra "Bog", dukker op i "Test" (én-pr-opskrift).
5. Slet "Bog" → kogebogen væk, dens (resterende) opskrifter består under "Alle" / "🔗 Dine opskrifter".
6. Læg en opskrift fra en kogebog på madplanen → den prissættes og kan på indkøbslisten som normalt.

- [ ] **Step 3: Opdatér ROADMAP**

I `ROADMAP.md`: afkryds/tilføj kogebog-feature i relevant milepæl og tilføj en linje i beslutningsloggen ("Kogebøger: samlinger + foto-bulk; én pr. opskrift; hjemmeside-crawl udskudt"). (`AGENTS.md` kræver at ROADMAP holdes opdateret.)

- [ ] **Step 4: Commit**

```bash
git add ROADMAP.md
git commit -m "docs(kogebøger): ROADMAP — kogebøger leveret (samlinger + foto-bulk)"
```

---

## Self-review (udført ved skrivning)

**Spec-dækning:**
- Datamodel (`kogeboeger` + `kogebog_medlemskab`, RLS, én-pr-opskrift) → Task 1. ✓
- Klient-store der spejler favoritter → Task 2. ✓
- Hent ved opstart i App.tsx → Task 3. ✓
- "Læg i kogebog" i detaljen (egne + indbyggede) → Task 6 (via Task 4+5). ✓
- "📚 Kogebøger"-chip, reol, drill-in, opret/omdøb/slet → Task 7. ✓
- Foto-bulk (nyt ark-valg, multi-pick, sekventiel import m. fremgang, batch-review, gem alle i kogebog, maks 10, delvis fejl) → Task 8 + Task 9. ✓
- Ingen ny edge-funktion → bekræftet (Task 9 bruger `importer-opskrift` uændret). ✓
- Uden for scope (crawl, deling, tags, cover, egen fane) → ikke implementeret. ✓

**Type-konsistens:** Store-API'et (`hentKogebøger`, `hentMedlemskaber`, `kogebøger`, `kogebogForOpskrift`, `opskrifterIKogebog`, `antalIKogebog`, `opretKogebog`, `omdøbKogebog`, `sletKogebog`, `sætKogebogForOpskrift`, `kogebøgerVersion`, `Kogebog`-typen) er defineret i Task 2 og bruges med samme signaturer i Task 3/5/6/7/9. `TilføjMetode` udvides i Task 8 og forbruges i Task 9/App.tsx. ✓

**Placeholder-scan:** ingen TBD/TODO; alle kode-steps indeholder fuld kode. ✓

**Afvigelse fra default-TDD:** bevidst — projektet har ingen test-runner (CLAUDE.md). Verifikation = `npx tsc --noEmit` + manuelle røgtests pr. task.
