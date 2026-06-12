// Onboarding i 6 trin — brugerens FØRSTE møde med appen.
// Princip: under 60 sekunder, og beviset kommer FØR indsatsen — flowet
// slutter i et ÆGTE besparelses-tal beregnet lokalt med samme motor som
// resten af appen (findAnbefaledeRetter), aldrig et marketing-tal.
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';
import { StoreColors } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { OPSKRIFTER } from '../constants/opskrifter';
import { findAnbefaledeRetter, måltiderPrRet } from '../constants/anbefaling';
import { hentOpskriftPriser } from '../constants/opskriftPriser';
import { sætForvalgteRetter } from '../constants/onboardingHandoff';
import { formatKr } from '../constants/besparelse';

// Samme butiksliste som ProfilScreen — onboardingens svar skal kunne
// genfindes og ændres dér
const BUTIKKER = ['Netto', 'Rema 1000', 'Lidl', '365discount', 'Føtex', 'SuperBrugsen', 'Kvikly', 'Bilka'];

// SKAL matche motorens kost-model (opskrifternes koed-felt) — de gamle
// muligheder (Vegetar/Vegansk/Glutenfri) fandtes ikke i motoren
const KOST_VALG: { label: string; ikon: string }[] = [
  { label: 'Alt',      ikon: '🍽️' },
  { label: 'Kylling',  ikon: '🍗' },
  { label: 'Oksekød',  ikon: '🥩' },
  { label: 'Svinekød', ikon: '🐷' },
];

const SPOERGSMAALS_TRIN = 5; // trin 1-5 har progress-bar (velkomst har ikke)

type Props = { onDone: () => void };

export default function OnboardingScreen({ onDone }: Props) {
  const [trin, setTrin] = useState(0);
  const [fornavn, setFornavn] = useState('');
  const [personer, setPersoner] = useState(4);
  const [butikker, setButikker] = useState<string[]>(['Netto', 'Rema 1000']);
  const [kost, setKost] = useState<string[]>(['Alt']);
  const [gemmer, setGemmer] = useState(false);

  // Budget er bevidst IKKE et spørgsmål (tre spørgsmål, ikke fire) —
  // sættes automatisk ud fra husstanden og kan justeres i Profil
  const budget = Math.max(100, Math.round((personer * 90) / 50) * 50);

  // Aha-tallet: ægte anbefaling med ugens tilbud, skaleret til husstanden.
  // Beregnes lokalt og øjeblikkeligt — intet server-kald.
  const aha = useMemo(() => {
    if (trin !== 5) return null;
    const valgteKoed = kost.filter(k => ['Kylling', 'Oksekød', 'Svinekød'].includes(k));
    const vilHaveAlt = kost.includes('Alt') || valgteKoed.length === 0;
    const tilgængelige = OPSKRIFTER.filter(o =>
      vilHaveAlt || valgteKoed.includes(o.koed) || o.koed === 'Alt'
    );
    const ids = findAnbefaledeRetter(tilgængelige, budget, butikker, personer);
    const priser = hentOpskriftPriser(butikker, personer);
    let pris = 0, spar = 0, måltider = 0;
    const navne: string[] = [];
    for (const id of ids) {
      const info = priser.get(id);
      pris += info?.pris ?? 0;
      spar += info?.besparelse ?? 0;
      måltider += info ? måltiderPrRet(info.portioner, personer) : 1;
      const o = OPSKRIFTER.find(x => x.id === id);
      if (o) navne.push(o.navn);
    }
    return { ids, navne, pris: Math.round(pris), spar: Math.round(spar), måltider };
  }, [trin, kost, butikker, personer, budget]);

  function toggleButik(b: string) {
    setButikker(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  }

  function toggleKost(k: string) {
    if (k === 'Alt') { setKost(['Alt']); return; }
    setKost(prev => {
      const uden = prev.filter(x => x !== 'Alt');
      const ny = uden.includes(k) ? uden.filter(x => x !== k) : [...uden, k];
      return ny.length === 0 ? ['Alt'] : ny;
    });
  }

  async function færdig() {
    setGemmer(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          budget_per_week: budget,
          household_size: personer,
          diet: kost,
          stores: butikker,
        });
        // display_name i separat kald — kolonnen kræver SQL i dashboardet
        // (alter table profiles add column display_name text;) og må aldrig
        // kunne vælte gemningen af kerne-felterne ovenfor
        const navn = fornavn.trim();
        if (navn) {
          await supabase.from('profiles').update({ display_name: navn }).eq('id', user.id);
        }
      }
    } catch (_) {}
    // Aha-tallet skal holde: Planer-fanen åbner vælgeren med præcis
    // de samme retter præ-valgt
    if (aha && aha.ids.length >= 2) sætForvalgteRetter(aha.ids);
    setGemmer(false);
    onDone();
  }

  const kanVidere =
    trin === 3 ? butikker.length > 0 : true;

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Ægte progress — fyldes trin for trin (skjult på velkomsten) */}
          {trin > 0 && (
            <View style={styles.progress}>
              {Array.from({ length: SPOERGSMAALS_TRIN }).map((_, i) => (
                <View key={i} style={[styles.bar, i < trin && styles.barFilled]} />
              ))}
            </View>
          )}

          {trin === 0 && (
            <>
              <Text style={styles.logo}>Mæt<Text style={{ color: Colors.red }}>.</Text></Text>
              <Text style={styles.titel}>Velkommen 👋</Text>
              <Text style={styles.broedtekst}>
                Familier som jeres sparer typisk 400-700 kr om måneden på aftensmaden.
              </Text>
              <View style={styles.punktListe}>
                <Punkt emoji="🍽️" tekst="Vælg ugens aftensmad blandt vores opskrifter" />
                <Punkt emoji="🛒" tekst="Få indkøbslisten — med ugens tilbud regnet ind" />
                <Punkt emoji="💰" tekst="Se hvad I sparer, uge for uge" />
              </View>
            </>
          )}

          {trin === 1 && (
            <>
              <Text style={styles.titel}>Hvad skal vi kalde dig?</Text>
              <TextInput
                style={styles.navnFelt}
                placeholder="Dit fornavn"
                placeholderTextColor={Colors.inkSoft}
                value={fornavn}
                onChangeText={setFornavn}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={() => setTrin(2)}
              />
              <Text style={styles.hjælpetekst}>
                Så siger forsiden "Hej {fornavn.trim() || 'Mette'}" — du kan springe over.
              </Text>
            </>
          )}

          {trin === 2 && (
            <>
              <Text style={styles.titel}>Hvor mange skal mætte?</Text>
              <View style={styles.stepperRække}>
                <TouchableOpacity
                  style={[styles.stepKnap, personer <= 1 && styles.stepKnapDisabled]}
                  onPress={() => setPersoner(Math.max(1, personer - 1))}
                  disabled={personer <= 1}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.stepTekst}>−</Text>
                </TouchableOpacity>
                <Text style={styles.personerTal}>{personer}</Text>
                <TouchableOpacity
                  style={[styles.stepKnap, personer >= 8 && styles.stepKnapDisabled]}
                  onPress={() => setPersoner(Math.min(8, personer + 1))}
                  disabled={personer >= 8}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.stepTekst}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.hjælpetekst}>
                {personer <= 2
                  ? 'Vi planlægger med rester, så én ret rækker til flere aftener.'
                  : `Vi skalerer alle opskrifter og pakker til ${personer} personer.`}
              </Text>
            </>
          )}

          {trin === 3 && (
            <>
              <Text style={styles.titel}>Hvor handler I?</Text>
              <View style={styles.butikChips}>
                {BUTIKKER.map(b => {
                  const aktiv = butikker.includes(b);
                  const farver = StoreColors[b] ?? { bg: Colors.green, text: '#fff' };
                  return (
                    <TouchableOpacity
                      key={b}
                      style={[
                        styles.butikChip,
                        aktiv && { backgroundColor: farver.bg, borderColor: farver.bg },
                      ]}
                      onPress={() => toggleButik(b)}
                    >
                      <Text style={[styles.butikChipTekst, aktiv && { color: farver.text }]}>
                        {b}{aktiv ? '  ✓' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.hjælpetekst}>
                Vi tjekker tilbuddene i jeres butikker hver uge.
              </Text>
            </>
          )}

          {trin === 4 && (
            <>
              <Text style={styles.titel}>Hvad spiser I derhjemme?</Text>
              {KOST_VALG.map(k => {
                const aktiv = kost.includes(k.label);
                return (
                  <TouchableOpacity
                    key={k.label}
                    style={[styles.kostRække, aktiv && styles.kostRækkeAktiv]}
                    onPress={() => toggleKost(k.label)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.kostIkon}>{k.ikon}</Text>
                    <Text style={[styles.kostLabel, aktiv && { color: Colors.green }]}>{k.label}</Text>
                    <View style={[styles.kostCheck, aktiv && styles.kostCheckAktiv]}>
                      {aktiv && <Text style={styles.kostCheckmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {trin === 5 && aha && (
            <>
              <Text style={styles.titel}>
                Jeres første uge er klar{fornavn.trim() ? `, ${fornavn.trim()}` : ''}
              </Text>
              <View style={styles.ahaKort}>
                {aha.spar > 0 ? (
                  <>
                    <Text style={styles.ahaLabel}>I kan spare</Text>
                    <Text style={styles.ahaTal}>{formatKr(aha.spar)} kr</Text>
                    <Text style={styles.ahaSub}>
                      i denne uge · {aha.måltider} aftensmåltider · ca. {formatKr(aha.pris)} kr
                    </Text>
                  </>
                ) : (
                  /* Aldrig "spar 0 kr" i første minut — vis værdien uden tilbuds-vinklen */
                  <>
                    <Text style={styles.ahaLabel}>Jeres uge er klar</Text>
                    <Text style={styles.ahaTal}>{aha.måltider} aftensmåltider</Text>
                    <Text style={styles.ahaSub}>for ca. {formatKr(aha.pris)} kr til {personer} personer</Text>
                  </>
                )}
              </View>
              <Text style={styles.ahaRetter} numberOfLines={3}>
                Blandt andet: {aha.navne.slice(0, 3).join(' · ')}
              </Text>
              <Text style={styles.hjælpetekst}>
                Budgettet er sat til {budget} kr/uge — du kan altid justere det i Profil.
              </Text>
            </>
          )}
        </ScrollView>

        {/* Bund-navigation */}
        <View style={styles.footer}>
          {trin === 1 && (
            <TouchableOpacity style={styles.springOver} onPress={() => setTrin(2)}>
              <Text style={styles.springOverTekst}>Spring over</Text>
            </TouchableOpacity>
          )}
          <View style={styles.footerRække}>
            {trin > 0 && (
              <TouchableOpacity
                style={styles.tilbageKnap}
                onPress={() => setTrin(trin - 1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.tilbageTekst}>‹ Tilbage</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btnPrimary, (!kanVidere || gemmer) && styles.btnDisabled]}
              onPress={() => (trin < 5 ? setTrin(trin + 1) : færdig())}
              disabled={!kanVidere || gemmer}
            >
              <Text style={styles.btnText}>
                {trin === 0 ? 'Sæt os op — under 1 minut'
                  : trin < 5 ? 'Videre'
                  : 'Se jeres madplan'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Punkt({ emoji, tekst }: { emoji: string; tekst: string }) {
  return (
    <View style={styles.punkt}>
      <Text style={styles.punktEmoji}>{emoji}</Text>
      <Text style={styles.punktTekst}>{tekst}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  scroll: { padding: 24, paddingTop: 20, flexGrow: 1 },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.line },
  barFilled: { backgroundColor: Colors.greenBright },

  logo: {
    fontSize: 40, fontFamily: 'BricolageGrotesque_800ExtraBold',
    color: Colors.ink, letterSpacing: -0.8, marginBottom: 24,
  },
  titel: {
    fontSize: 26, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink,
    letterSpacing: -0.5, marginBottom: 12,
  },
  broedtekst: {
    fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.inkSoft,
    lineHeight: 22, marginBottom: 28,
  },
  punktListe: { gap: 16 },
  punkt: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  punktEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  punktTekst: { flex: 1, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink, lineHeight: 21 },

  navnFelt: {
    backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.line,
    borderRadius: Radii.btn, paddingHorizontal: 16, height: 52,
    fontSize: 16, fontFamily: 'Inter_400Regular', color: Colors.ink,
    marginTop: 8,
  },
  hjælpetekst: {
    fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft,
    lineHeight: 19, marginTop: 14,
  },

  stepperRække: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 28, marginTop: 24, marginBottom: 8,
  },
  stepKnap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  stepKnapDisabled: { opacity: 0.35 },
  stepTekst: { fontSize: 24, fontFamily: 'Inter_700Bold', color: Colors.ink },
  personerTal: {
    fontSize: 44, fontFamily: 'BricolageGrotesque_800ExtraBold', color: Colors.green,
    minWidth: 60, textAlign: 'center',
  },

  butikChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  butikChip: {
    borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10,
    backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.line,
  },
  butikChipTekst: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },

  kostRække: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1.5, borderColor: Colors.line,
    padding: 16, marginBottom: 10,
  },
  kostRækkeAktiv: { borderColor: Colors.green, backgroundColor: Colors.greenSoft },
  kostIkon: { fontSize: 24, marginRight: 14 },
  kostLabel: { flex: 1, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  kostCheck: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  kostCheckAktiv: { backgroundColor: Colors.greenBright, borderColor: Colors.greenBright },
  kostCheckmark: { color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold' },

  ahaKort: {
    backgroundColor: Colors.green, borderRadius: Radii.hero,
    padding: 24, alignItems: 'center', marginTop: 8,
  },
  ahaLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.7)' },
  ahaTal: {
    fontSize: 40, fontFamily: 'BricolageGrotesque_800ExtraBold', color: Colors.yellow,
    letterSpacing: -0.8, marginVertical: 4,
  },
  ahaSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  ahaRetter: {
    fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.ink,
    lineHeight: 19, marginTop: 16,
  },

  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: Colors.paper },
  footerRække: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  springOver: { alignSelf: 'center', marginBottom: 12 },
  springOverTekst: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  tilbageKnap: { paddingVertical: 14, paddingHorizontal: 4 },
  tilbageTekst: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  btnPrimary: {
    flex: 1, backgroundColor: Colors.green, borderRadius: Radii.btn,
    padding: 15, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
