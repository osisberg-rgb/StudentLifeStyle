// Onboarding — brugerens FØRSTE møde med appen. Rejsen er bygget om kring den
// nye niche (familier der gemmer opskrifter): hvert trin er en lille
// INVESTERING (navn → husstand → butikker → favoritter), så brugeren bygger
// noget der er deres eget (IKEA-effekten). Vi slutter ikke i et besparelses-tal,
// men i DERES egen samling af favoritter — som straks fylder forsiden.
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView,
  KeyboardAvoidingView, Platform, ScrollView, ImageBackground,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';
import { StoreColors } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { OPSKRIFTER } from '../constants/opskrifter';
import { billedeFor } from '../constants/opskriftBilleder';
import { sætFavorit } from '../lib/favoritter';
import { sætForvalgteRetter } from '../constants/onboardingHandoff';

// Samme butiksliste som ProfilScreen — onboardingens svar genfindes/ændres dér
const BUTIKKER = ['Netto', 'Rema 1000', 'Føtex', 'SuperBrugsen', 'Bilka'];

const KOED_EMOJI: Record<string, string> = {
  Kylling: '🐔', Oksekød: '🥩', Svinekød: '🐷', Alt: '🍽️',
};

// Retter man kan vælge som favoritter i onboardingen — hovedretterne
// (alt der ikke er tagget suppe/salat/brød/dessert).
const FAVORIT_VALG = OPSKRIFTER.filter(o => {
  const kat = (o as any).kategorier as string[] | undefined;
  return !(kat?.includes('suppe') || kat?.includes('salat') || kat?.includes('broed') || kat?.includes('dessert'));
});

const SPOERGSMAALS_TRIN = 5; // trin 1-5 har progress-bar (velkomst har ikke)

type Props = { onDone: () => void };

export default function OnboardingScreen({ onDone }: Props) {
  const [trin, setTrin] = useState(0);
  const [fornavn, setFornavn] = useState('');
  const [personer, setPersoner] = useState(4);
  const [butikker, setButikker] = useState<string[]>(['Netto', 'Rema 1000']);
  const [favoritter, setFavoritter] = useState<string[]>([]);
  const [gemmer, setGemmer] = useState(false);

  function toggleButik(b: string) {
    setButikker(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  }
  function toggleFavorit(id: string) {
    setFavoritter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  // Navne på de valgte favoritter (til payoff-trinnet)
  const favoritNavne = favoritter
    .map(id => OPSKRIFTER.find(o => o.id === id)?.navn)
    .filter((n): n is string => !!n);

  async function færdig() {
    setGemmer(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          household_size: personer,
          stores: butikker,
        });
        // display_name i separat kald — kolonnen kræver SQL i dashboardet og
        // må aldrig kunne vælte gemningen af kerne-felterne ovenfor
        const navn = fornavn.trim();
        if (navn) {
          await supabase.from('profiles').update({ display_name: navn }).eq('id', user.id);
        }
        // Gem favoritterne, så de straks står på forsidens favorit-stribe
        for (const id of favoritter) {
          await sætFavorit(id, true);
        }
      }
    } catch (_) {}
    // Seed Planer-vælgeren med favoritterne, så første madplan bygges af
    // præcis det brugeren lige har valgt
    if (favoritter.length >= 2) sætForvalgteRetter(favoritter);
    setGemmer(false);
    onDone();
  }

  const kanVidere =
    trin === 3 ? butikker.length > 0 :
    trin === 4 ? favoritter.length > 0 :
    true;

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Progress — fyldes trin for trin (skjult på velkomsten) */}
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
                Saml familiens yndlingsopskrifter ét sted, planlæg ugens aftensmad,
                og lad os finde ugens tilbud på ingredienserne.
              </Text>
              <View style={styles.punktListe}>
                <Punkt emoji="❤️" tekst="Gem jeres favoritopskrifter — eller indsæt jeres egne" />
                <Punkt emoji="🍽️" tekst="Byg ugens madplan på få tryk" />
                <Punkt emoji="🛒" tekst="Få indkøbslisten med ugens tilbud regnet ind" />
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
              <Text style={styles.titel}>Vælg et par favoritter ❤️</Text>
              <Text style={styles.broedtekstSmal}>
                Tryk på de retter I godt kan lide — de samles på din forside, og vi
                bygger din første madplan ud fra dem.
              </Text>
              <View style={styles.favGrid}>
                {FAVORIT_VALG.map(o => {
                  const valgt = favoritter.includes(o.id);
                  const billede = billedeFor(o);
                  return (
                    <TouchableOpacity
                      key={o.id}
                      style={[styles.favKort, valgt && styles.favKortValgt]}
                      activeOpacity={0.85}
                      onPress={() => toggleFavorit(o.id)}
                    >
                      {billede ? (
                        <ImageBackground source={billede} style={styles.favBillede} imageStyle={styles.favBilledeImg}>
                          <View style={[styles.favHjerte, valgt && styles.favHjerteAktiv]}>
                            <Text style={styles.favHjerteTekst}>{valgt ? '❤️' : '🤍'}</Text>
                          </View>
                        </ImageBackground>
                      ) : (
                        <View style={[styles.favBillede, styles.favFallback]}>
                          <Text style={{ fontSize: 34 }}>{KOED_EMOJI[o.koed] ?? '🍽️'}</Text>
                          <View style={[styles.favHjerte, valgt && styles.favHjerteAktiv]}>
                            <Text style={styles.favHjerteTekst}>{valgt ? '❤️' : '🤍'}</Text>
                          </View>
                        </View>
                      )}
                      <Text style={styles.favNavn} numberOfLines={2}>{o.navn}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {trin === 5 && (
            <>
              <Text style={styles.titel}>
                Din samling er klar{fornavn.trim() ? `, ${fornavn.trim()}` : ''}
              </Text>
              <View style={styles.ahaKort}>
                <Text style={styles.ahaLabel}>Du har gemt</Text>
                <Text style={styles.ahaTal}>{favoritter.length} {favoritter.length === 1 ? 'favorit' : 'favoritter'}</Text>
                <Text style={styles.ahaSub}>
                  De står klar på din forside — og vi finder ugens tilbud på ingredienserne.
                </Text>
              </View>
              {favoritNavne.length > 0 && (
                <Text style={styles.ahaRetter} numberOfLines={3}>
                  {favoritNavne.slice(0, 4).join(' · ')}
                </Text>
              )}
              <Text style={styles.hjælpetekst}>
                Du kan altid tilføje flere — eller indsætte dine egne opskrifter fra et link eller billede.
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
                {trin === 0 ? 'Kom godt i gang — under 1 minut'
                  : trin === 4 ? (favoritter.length > 0 ? `Videre (${favoritter.length} valgt)` : 'Vælg mindst én')
                  : trin < 5 ? 'Videre'
                  : 'Kom i gang'}
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
  broedtekstSmal: {
    fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft,
    lineHeight: 20, marginBottom: 18,
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

  // Favorit-grid (trin 4)
  favGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  favKort: {
    width: '47.5%', backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1.5, borderColor: Colors.line, overflow: 'hidden', marginBottom: 4,
  },
  favKortValgt: { borderColor: Colors.green },
  favBillede: { height: 90, backgroundColor: Colors.canvas, justifyContent: 'flex-start' },
  favBilledeImg: { borderTopLeftRadius: Radii.card, borderTopRightRadius: Radii.card },
  favFallback: { backgroundColor: Colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  favHjerte: {
    position: 'absolute', top: 6, right: 6,
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  favHjerteAktiv: { backgroundColor: '#fff' },
  favHjerteTekst: { fontSize: 14 },
  favNavn: {
    fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.ink,
    paddingHorizontal: 10, paddingVertical: 8, lineHeight: 16,
  },

  ahaKort: {
    backgroundColor: Colors.green, borderRadius: Radii.hero,
    padding: 24, alignItems: 'center', marginTop: 8,
  },
  ahaLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.7)' },
  ahaTal: {
    fontSize: 40, fontFamily: 'BricolageGrotesque_800ExtraBold', color: Colors.yellow,
    letterSpacing: -0.8, marginVertical: 4,
  },
  ahaSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 19 },
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
