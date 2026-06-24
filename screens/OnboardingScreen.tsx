// Onboarding — brugerens FØRSTE møde med MadUgen. Rækkefølgen følger en
// psykologisk bue, der maksimerer interesse og investering:
//   1) HOOK: social proof — vis værdien, bed ikke om noget endnu.
//   2) ENGAGÉR: mål (let første "ja" = tap) → bekræftelse (belønning).
//   3) VIS VÆRDI: værditilbud → import-guide (lær kerne-magien).
//   4) INVESTÉR: favoritter (saml DIN samling) → 3-dages plan (byg noget
//      konkret — IKEA-effekten/peak investering), FØR vi beder om opsætning.
//   5) SÆT OP: navn → husstand → butikker → kategorier (admin, men nu er
//      brugeren committet, så sunk-cost bærer dem igennem).
//   6) ATTRIBUTION: hvor-hørt-om-os (lav indsats, sent — som ReciMe).
//   7) BED OM: notifikationer + overvåg varer (efter MAX investering → ja).
//   8) FEJR: payoff (peak-end — slut på en høj note).
// Inspireret af de store mad-apps (ReciMe m.fl.), men i MadUgens varme stil og
// med ÆRLIG tekst (ingen opfundne bruger-tal). Rækkefølgen styres af TRIN-
// arrayet; render-blokke keyes på navn, ikke tal, så trin kan flyttes/indsættes
// uden omnummerering. Mål og kilde holdes kun i hukommelsen for nu.
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView,
  KeyboardAvoidingView, Platform, ScrollView, ImageBackground, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii } from '../constants/theme';
import { StoreColors } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { OPSKRIFTER } from '../constants/opskrifter';
import { billedeFor } from '../constants/opskriftBilleder';
import { sætFavorit } from '../lib/favoritter';
import { registrérForPush } from '../lib/notifikationer';
import { tilføjWatch } from '../lib/watchlist';
import { sætMineVarer } from '../lib/mineVarer';
import { MINE_VARER_VALG } from '../constants/mineVarer';
import { sætLandPåPlaner } from '../constants/onboardingHandoff';
import { tomUgeplan, byggAftensmadForRet } from '../constants/ugeplan';
import { getWeekNumber } from '../constants/uge';
import { findOpskrift } from '../lib/brugerOpskrifter';
import type { Madplan } from '../types/madplan';

// Samme butiksliste som ProfilScreen — onboardingens svar genfindes/ændres dér
const BUTIKKER = ['Netto', 'Rema 1000', 'Føtex', 'SuperBrugsen', 'Bilka', 'Lidl', 'Meny', '365discount', 'Kvikly'];

const KOED_EMOJI: Record<string, string> = {
  Kylling: '🐔', Oksekød: '🥩', Svinekød: '🐷', Alt: '🍽️',
};

// Trin 1 — hvad brugeren gerne vil opnå (multi-select, kun i hukommelsen)
const MAAL = [
  { id: 'spar',     emoji: '💰', tekst: 'Spare penge på maden' },
  { id: 'samle',    emoji: '📇', tekst: 'Samle mine opskrifter ét sted' },
  { id: 'planlaeg', emoji: '📅', tekst: 'Planlægge ugens aftensmad' },
  { id: 'tilbud',   emoji: '🏷️', tekst: 'Finde ugens tilbud' },
  { id: 'nye',      emoji: '🍽️', tekst: 'Prøve nye retter' },
  { id: 'familie',  emoji: '👨‍👩‍👧‍👦', tekst: 'Lave mad til familien' },
] as const;

// Trin 4 — hvor brugeren hørte om os (single-select, kun i hukommelsen)
const KILDER = [
  { id: 'instagram', ikon: 'logo-instagram',       farve: '#E1306C', tekst: 'Instagram' },
  { id: 'google',    ikon: 'logo-google',          farve: '#4285F4', tekst: 'Google-søgning' },
  { id: 'tiktok',    ikon: 'logo-tiktok',          farve: Colors.ink, tekst: 'TikTok' },
  { id: 'facebook',  ikon: 'logo-facebook',        farve: '#1877F2', tekst: 'Facebook' },
  { id: 'appstore',  ikon: 'logo-apple',           farve: Colors.ink, tekst: 'App Store' },
  { id: 'youtube',   ikon: 'logo-youtube',         farve: '#FF0000', tekst: 'YouTube' },
  { id: 'ven',       ikon: 'people',               farve: Colors.green, tekst: 'Gennem en ven' },
  { id: 'andet',     ikon: 'ellipsis-horizontal',  farve: Colors.inkSoft, tekst: 'Andet' },
] as const;

// Trin "kategorier" — favorit-tilbudskategorier (gemmes i profiles.deal_categories).
// Værdierne matcher indkøbslistens kategorinavne, så de kan bruges til rangering.
const TILBUDS_KATEGORIER = [
  { id: 'Kød', emoji: '🥩' },
  { id: 'Fisk', emoji: '🐟' },
  { id: 'Mejeri & æg', emoji: '🥛' },
  { id: 'Pasta, ris & korn', emoji: '🍝' },
  { id: 'Grøntsager', emoji: '🥦' },
  { id: 'Dåse & konserves', emoji: '🥫' },
  { id: 'Brød', emoji: '🍞' },
  { id: 'Drikkevarer', emoji: '🥤' },
] as const;

// Retter man kan vælge som favoritter i onboardingen — hovedretterne
// (alt der ikke er tagget salat/brød/dessert; supper tæller som aftensmad).
const FAVORIT_VALG = OPSKRIFTER.filter(o => {
  const kat = (o as any).kategorier as string[] | undefined;
  return !(kat?.includes('salat') || kat?.includes('broed') || kat?.includes('dessert'));
});

// De tre dage 3-dages-planen udfyldes på (label til skærmen)
const DAG3_LABELS = ['I dag', 'I morgen', 'Om 2 dage'];

// Trin-rækkefølgen ét sted: indsæt/flyt et trin ved at ændre dette array, så
// render-blokkene (keyet på navn, ikke tal) aldrig skal omnummereres.
type Trin =
  | 'social' | 'maal' | 'bekraeft' | 'vaerdi' | 'import' | 'kilde'
  | 'navn' | 'husstand' | 'butikker' | 'kategorier' | 'favoritter' | 'plan3' | 'notif' | 'payoff';
const TRIN: Trin[] = [
  // Psykologisk bue: hook → engagér → vis værdi → INVESTÉR (saml + planlæg)
  // → sæt op → attribution → bed om notifikationer → fejr. Investeringen
  // (favoritter + plan) ligger FØR opsætningen, så brugeren bygger noget der
  // er deres eget, før vi beder om admin og tilladelser.
  'social', 'maal', 'bekraeft', 'vaerdi', 'import', 'favoritter', 'plan3',
  'navn', 'husstand', 'butikker', 'kategorier', 'kilde', 'notif', 'payoff',
];

type Props = { onDone: () => void };

export default function OnboardingScreen({ onDone }: Props) {
  const [trin, setTrin] = useState(0);
  // Engagement-svar (kun i hukommelsen)
  const [maal, setMaal] = useState<string[]>([]);
  const [kilde, setKilde] = useState<string | null>(null);
  const [kodeÅben, setKodeÅben] = useState(false);
  const [kode, setKode] = useState('');
  // Opsætnings-svar (gemmes i Supabase)
  const [fornavn, setFornavn] = useState('');
  const [personer, setPersoner] = useState(4);
  const [butikker, setButikker] = useState<string[]>(['Netto', 'Rema 1000']);
  const [tilbudsKategorier, setTilbudsKategorier] = useState<string[]>([]);
  const [favoritter, setFavoritter] = useState<string[]>([]);
  const [dagsRetter, setDagsRetter] = useState<string[]>([]); // ordnet, max 3 (én pr. dag)
  const [mineLabels, setMineLabels] = useState<string[]>([]); // favorit-kategorier → forsidens "Tilbud til dig"
  const [pushVarer, setPushVarer] = useState<string[]>([]);   // specifikke varer → push (watchlist)
  const [pushTekst, setPushTekst] = useState('');
  const [gemmer, setGemmer] = useState(false);

  function toggleMaal(id: string) {
    setMaal(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleButik(b: string) {
    setButikker(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  }
  function toggleKategori(id: string) {
    setTilbudsKategorier(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleFavorit(id: string) {
    setFavoritter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  // 3-dages-vælgeren: vælg op til 3 retter; rækkefølgen = dag-rækkefølgen
  function toggleDagsRet(id: string) {
    setDagsRetter(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev; // max 3 dage
      return [...prev, id];
    });
  }
  // Notif-trin: vælg/fravælg en favorit-kategori (driver forsidens "Tilbud til dig")
  function toggleMineLabel(label: string) {
    setMineLabels(prev => prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]);
  }
  // Notif-trin: tilføj en specifik vare til push-overvågning (fritekst)
  function tilføjPushVare() {
    const v = pushTekst.trim();
    if (!v) return;
    setPushVarer(prev => prev.includes(v) ? prev : [...prev, v]);
    setPushTekst('');
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
        // Gem favorit-tilbudskategorier separat — kolonnen må aldrig kunne
        // vælte gemningen af kerne-felterne ovenfor
        try {
          if (tilbudsKategorier.length) {
            await supabase.from('profiles').update({ deal_categories: tilbudsKategorier }).eq('id', user.id);
          }
        } catch (_) {}
        // Byg en færdig 3-dages madplan af de valgte retter og gem den, så
        // brugeren lander i Planer med en plan klar
        await byggOgGemPlan(user.id);
      }
    } catch (_) {}
    setGemmer(false);
    onDone();
  }

  // Bygger en madplan hvor de(n) valgte ret(ter) ligger på de næste dage fra i
  // dag, gemmer den i madplaner (samme form som PlanerScreen bruger), og sætter
  // flaget så App.tsx lander brugeren i Planer.
  async function byggOgGemPlan(userId: string) {
    const ids = dagsRetter.filter(Boolean);
    if (ids.length === 0) return;
    const ugeNr = getWeekNumber();
    const start = (new Date().getDay() + 6) % 7; // Mandag = 0
    const basis = tomUgeplan(personer, ugeNr);
    const dage = [...basis.dage];
    const valgte: NonNullable<Madplan['valgte_opskrifter']> = [];
    ids.forEach((id, i) => {
      const bygget = byggAftensmadForRet(id, butikker, personer);
      const op = findOpskrift(id);
      if (!bygget || !op) return;
      const idx = (start + i) % 7;
      dage[idx] = { ...dage[idx], aftensmad: bygget.maltid };
      valgte.push({ id, navn: op.navn, portioner: bygget.portioner });
    });
    const plan: Madplan = { ...basis, dage, valgte_opskrifter: valgte };
    try {
      await supabase.from('madplaner').upsert({
        user_id: userId,
        uge_nr: ugeNr,
        plan,
        total_pris: plan.indkoebspris ?? 0,
        total_spar: plan.besparelse ?? 0,
      }, { onConflict: 'user_id,uge_nr' });
      sætLandPåPlaner();
    } catch (_) {}
  }

  const aktuel = TRIN[trin];
  const kanVidere =
    aktuel === 'maal' ? maal.length > 0 :
    aktuel === 'butikker' ? butikker.length > 0 :
    aktuel === 'kategorier' ? tilbudsKategorier.length > 0 :
    aktuel === 'favoritter' ? favoritter.length > 0 :
    aktuel === 'plan3' ? dagsRetter.length > 0 :
    true;

  const progressPct = ((trin + 1) / TRIN.length) * 100;

  // Primær-knappen pulserer KUN på notifikations-trinnet, så øjet trækkes mod
  // trykket. Ringen bag knappen breder sig ud og fader; fingeren bobber.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (aktuel !== 'notif') { pulse.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(450),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [trin]);
  const btnScale    = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const ringScale   = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.28] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0] });
  const fingerY     = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -9, 0] });

  // Næste-knappen: notifikations-trinnet beder om tilladelse (fejler blødt i
  // Expo Go) og går videre uanset; sidste trin gemmer profilen.
  async function håndterNæste() {
    if (aktuel === 'notif') {
      // Favorit-kategorier → forsidens "Tilbud til dig" (profiles.watch_items).
      // Specifikke varer → push (watchlist). Push-tilladelse fejler blødt i Expo Go.
      registrérForPush();
      if (mineLabels.length) sætMineVarer(mineLabels);
      for (const v of pushVarer) tilføjWatch(v);
    }
    if (trin < TRIN.length - 1) { setTrin(trin + 1); return; }
    await færdig();
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Vedvarende top: logo + progress-bånd (som ReciMe) */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Ionicons name="pricetag" size={20} color={Colors.green} style={{ marginRight: 7, marginTop: 2 }} />
            <Text style={styles.logo}>MadUgen<Text style={{ color: Colors.red }}>.</Text></Text>
          </View>
          <View style={styles.progressRow}>
            {trin > 0 ? (
              <TouchableOpacity
                onPress={() => setTrin(trin - 1)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="chevron-back" size={22} color={Colors.inkSoft} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 22 }} />
            )}
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progressPct}%` }]} />
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* ───────── ENGAGEMENT ───────── */}

          {/* Social proof / velkomst (ærlig, værdiledt) */}
          {aktuel === 'social' && (
            <>
              <Text style={styles.bigTitel}>
                Saml dine opskrifter.{'\n'}
                <Text style={{ color: Colors.greenBright }}>Spar på maden.</Text>
              </Text>
              <Text style={styles.broedtekst}>
                Alt det I elsker at lave — og ugens bedste priser på ingredienserne. Samlet ét sted.
              </Text>
              <View style={styles.værdiKort}>
                <Punkt emoji="❤️" tekst="Gem jeres favoritopskrifter — eller indsæt jeres egne" />
                <View style={styles.kortLinje} />
                <Punkt emoji="🍽️" tekst="Byg ugens madplan på få tryk" />
                <View style={styles.kortLinje} />
                <Punkt emoji="🛒" tekst="Få indkøbslisten med ugens tilbud regnet ind" />
              </View>
            </>
          )}

          {/* Mål (multi-select) */}
          {aktuel === 'maal' && (
            <>
              <Text style={styles.titel}>Hvad vil du gerne?</Text>
              <Text style={styles.broedtekstSmal}>Vælg alt det der passer.</Text>
              <View style={{ gap: 12, marginTop: 4 }}>
                {MAAL.map(m => (
                  <ValgKort
                    key={m.id}
                    emoji={m.emoji}
                    tekst={m.tekst}
                    valgt={maal.includes(m.id)}
                    onPress={() => toggleMaal(m.id)}
                  />
                ))}
              </View>
            </>
          )}

          {/* Bekræftelse */}
          {aktuel === 'bekraeft' && (
            <View style={styles.midtStil}>
              <Text style={styles.titel}>Perfekt 🙌</Text>
              <Text style={styles.broedtekst}>
                Det er præcis det MadUgen er bygget til. Vi hjælper dig hele vejen — fra opskrift til indkøbskurv.
              </Text>
              <View style={styles.heroBlob}>
                <Text style={{ fontSize: 96 }}>🧑‍🍳</Text>
              </View>
              <Text style={styles.heroLinje}>Vi hjælper dig i mål 🤝</Text>
            </View>
          )}

          {/* Værditilbud */}
          {aktuel === 'vaerdi' && (
            <>
              <Text style={styles.bigTitel}>
                Alle dine opskrifter —{'\n'}ét sted 📇
              </Text>
              <Text style={styles.broedtekst}>
                Uanset om du gemmer fra et link, et foto eller skriver dem selv — vi holder styr på dem alle.
              </Text>
              <View style={styles.metodeRække}>
                <MetodeChip emoji="🔗" tekst="Fra link" />
                <MetodeChip emoji="📷" tekst="Fra foto" />
                <MetodeChip emoji="✍️" tekst="Skriv selv" />
              </View>
            </>
          )}

          {/* Import-guide — telefon-mockup der peger på MadUgens +-ark */}
          {aktuel === 'import' && (
            <>
              <Text style={styles.titel}>Importér fra et link 🔗</Text>
              <Text style={styles.broedtekstSmal}>
                Find en opskrift online, kopiér linket, og indsæt det med +-knappen — så henter vi opskriften og finder tilbud på ingredienserne.
              </Text>
              <ImportGuideMock />
            </>
          )}

          {/* Hvor hørt om os (single-select, valgfri) */}
          {aktuel === 'kilde' && (
            <>
              <Text style={styles.titel}>Hvor har du hørt om os?</Text>
              <TouchableOpacity onPress={() => setKodeÅben(v => !v)} style={styles.kodeLink}>
                <Text style={styles.kodeLinkTekst}>Jeg har en henvisningskode</Text>
              </TouchableOpacity>
              {kodeÅben && (
                <TextInput
                  style={styles.kodeFelt}
                  placeholder="Indtast kode"
                  placeholderTextColor={Colors.inkSoft}
                  value={kode}
                  onChangeText={setKode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              )}
              <View style={{ gap: 10, marginTop: 8 }}>
                {KILDER.map(k => (
                  <KildeKort
                    key={k.id}
                    ikon={k.ikon}
                    farve={k.farve}
                    tekst={k.tekst}
                    valgt={kilde === k.id}
                    onPress={() => setKilde(k.id)}
                  />
                ))}
              </View>
            </>
          )}

          {/* ───────── OPSÆTNING ───────── */}

          {/* Navn */}
          {aktuel === 'navn' && (
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
                onSubmitEditing={() => setTrin(trin + 1)}
              />
              <Text style={styles.hjælpetekst}>
                Så siger forsiden "Hej {fornavn.trim() || 'Mette'}" — du kan springe over.
              </Text>
            </>
          )}

          {/* Husstand */}
          {aktuel === 'husstand' && (
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

          {/* Butikker */}
          {aktuel === 'butikker' && (
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

          {/* Favorit-tilbudskategorier (gemmes i profiles.deal_categories) */}
          {aktuel === 'kategorier' && (
            <>
              <Text style={styles.titel}>Hvilke tilbud vil du følge?</Text>
              <Text style={styles.broedtekstSmal}>
                Vælg de kategorier I helst vil spare på — så fremhæver vi dem i "Tilbud til dig".
              </Text>
              <View style={{ gap: 10, marginTop: 4 }}>
                {TILBUDS_KATEGORIER.map(k => (
                  <ValgKort
                    key={k.id}
                    emoji={k.emoji}
                    tekst={k.id}
                    valgt={tilbudsKategorier.includes(k.id)}
                    onPress={() => toggleKategori(k.id)}
                  />
                ))}
              </View>
            </>
          )}

          {/* Favoritter */}
          {aktuel === 'favoritter' && (
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

          {/* 3-dages plan — vælg op til 3 retter, rækkefølgen = dagene */}
          {aktuel === 'plan3' && (
            <>
              <Text style={styles.titel}>Mad til de næste 3 dage 📅</Text>
              <Text style={styles.broedtekstSmal}>
                Vælg op til 3 retter — vi lægger dem på i dag, i morgen og i overmorgen og bygger din plan med det samme.
              </Text>
              <View style={styles.favGrid}>
                {FAVORIT_VALG.map(o => {
                  const dagIdx = dagsRetter.indexOf(o.id);
                  const valgt = dagIdx >= 0;
                  const billede = billedeFor(o);
                  return (
                    <TouchableOpacity
                      key={o.id}
                      style={[styles.favKort, valgt && styles.favKortValgt]}
                      activeOpacity={0.85}
                      onPress={() => toggleDagsRet(o.id)}
                    >
                      {billede ? (
                        <ImageBackground source={billede} style={styles.favBillede} imageStyle={styles.favBilledeImg}>
                          {valgt && (
                            <View style={styles.dagBadge}>
                              <Text style={styles.dagBadgeTekst}>{DAG3_LABELS[dagIdx]}</Text>
                            </View>
                          )}
                        </ImageBackground>
                      ) : (
                        <View style={[styles.favBillede, styles.favFallback]}>
                          <Text style={{ fontSize: 34 }}>{KOED_EMOJI[o.koed] ?? '🍽️'}</Text>
                          {valgt && (
                            <View style={styles.dagBadge}>
                              <Text style={styles.dagBadgeTekst}>{DAG3_LABELS[dagIdx]}</Text>
                            </View>
                          )}
                        </View>
                      )}
                      <Text style={styles.favNavn} numberOfLines={2}>{o.navn}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Notifikations-tilladelse (med animation) + vælg varer */}
          {aktuel === 'notif' && (
            <>
              <Text style={styles.titel}>Vær først til ugens tilbud 🔔</Text>
              <Text style={styles.broedtekstSmal}>
                Vælg dine varer — så samler vi dine bedste tilbud på forsiden og giver besked når de er på tilbud.
              </Text>
              <NotifBanner />

              <Text style={styles.watchLabel}>Vis mine bedste tilbud på:</Text>
              <View style={styles.watchChips}>
                {MINE_VARER_VALG.map(v => {
                  const valgt = mineLabels.includes(v.label);
                  return (
                    <TouchableOpacity
                      key={v.label}
                      style={[styles.watchChip, valgt && styles.watchChipValgt]}
                      onPress={() => toggleMineLabel(v.label)}
                    >
                      <Text style={[styles.watchChipTekst, valgt && styles.watchChipTekstValgt]}>
                        {v.emoji} {v.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.watchLabel}>Følg en specifik vare (få push):</Text>
              {pushVarer.length > 0 && (
                <View style={styles.watchChips}>
                  {pushVarer.map(v => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.watchChip, styles.watchChipValgt]}
                      onPress={() => setPushVarer(prev => prev.filter(x => x !== v))}
                    >
                      <Text style={[styles.watchChipTekst, styles.watchChipTekstValgt]}>🔔 {v}  ✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.watchTilføjRække}>
                <TextInput
                  style={styles.watchFelt}
                  placeholder="fx Faxe Kondi…"
                  placeholderTextColor={Colors.inkSoft}
                  value={pushTekst}
                  onChangeText={setPushTekst}
                  returnKeyType="done"
                  onSubmitEditing={tilføjPushVare}
                />
                <TouchableOpacity style={styles.watchTilføjKnap} onPress={tilføjPushVare}>
                  <Text style={styles.watchTilføjTekst}>Følg</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.hjælpetekst}>Ingen spam — kun dine varer. Slå fra når som helst i Profil.</Text>
            </>
          )}

          {/* Payoff */}
          {aktuel === 'payoff' && (
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
          {aktuel === 'navn' && (
            <TouchableOpacity style={styles.springOver} onPress={() => setTrin(trin + 1)}>
              <Text style={styles.springOverTekst}>Spring over</Text>
            </TouchableOpacity>
          )}
          {aktuel === 'notif' && (
            <TouchableOpacity style={styles.springOver} onPress={() => setTrin(trin + 1)}>
              <Text style={styles.springOverTekst}>Måske senere</Text>
            </TouchableOpacity>
          )}
          <View style={styles.btnWrap}>
            {aktuel === 'notif' && (
              <Animated.View
                pointerEvents="none"
                style={[styles.btnRing, { opacity: ringOpacity, transform: [{ scaleX: ringScale }, { scaleY: ringScale }] }]}
              />
            )}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[styles.btnPrimary, (!kanVidere || gemmer) && styles.btnDisabled]}
                onPress={håndterNæste}
                disabled={!kanVidere || gemmer}
              >
                <Text style={styles.btnText}>
                  {aktuel === 'maal' && maal.length === 0 ? 'Vælg mindst ét'
                    : aktuel === 'kategorier' && tilbudsKategorier.length === 0 ? 'Vælg mindst én'
                    : aktuel === 'favoritter' ? (favoritter.length > 0 ? `Fortsæt (${favoritter.length} valgt)` : 'Vælg mindst én')
                    : aktuel === 'plan3' ? (dagsRetter.length > 0 ? `Fortsæt (${dagsRetter.length}/3)` : 'Vælg mindst én')
                    : aktuel === 'notif' ? 'Slå notifikationer til'
                    : aktuel === 'payoff' ? 'Kom i gang'
                    : 'Fortsæt'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
            {aktuel === 'notif' && (
              <Animated.Text pointerEvents="none" style={[styles.finger, { transform: [{ translateY: fingerY }] }]}>
                👆
              </Animated.Text>
            )}
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

// Multi-select-kort (trin 1) — emoji + tekst, grøn ramme + flueben når valgt
function ValgKort({ emoji, tekst, valgt, onPress }: {
  emoji: string; tekst: string; valgt: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.valgKort, valgt && styles.valgKortValgt]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.valgEmoji}>{emoji}</Text>
      <Text style={[styles.valgTekst, valgt && styles.valgTekstValgt]}>{tekst}</Text>
      {valgt && <Ionicons name="checkmark-circle" size={22} color={Colors.green} />}
    </TouchableOpacity>
  );
}

// Single-select-kort (trin 4) — brand-ikon + tekst
function KildeKort({ ikon, farve, tekst, valgt, onPress }: {
  ikon: string; farve: string; tekst: string; valgt: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.kildeKort, valgt && styles.valgKortValgt]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons name={ikon as keyof typeof Ionicons.glyphMap} size={22} color={farve} style={{ width: 28 }} />
      <Text style={[styles.valgTekst, valgt && styles.valgTekstValgt]}>{tekst}</Text>
      {valgt && <Ionicons name="checkmark-circle" size={22} color={Colors.green} />}
    </TouchableOpacity>
  );
}

function MetodeChip({ emoji, tekst }: { emoji: string; tekst: string }) {
  return (
    <View style={styles.metodeChip}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
      <Text style={styles.metodeTekst}>{tekst}</Text>
    </View>
  );
}

// Import-guiden — telefon-mockup af MadUgens "+"-ark med en "Tryk her"-boble
// der bobber over "Indsæt et link". Lærer den faktiske import-flow (ikke en
// iOS share-extension, som appen ikke har).
function ImportGuideMock() {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const calloutY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  return (
    <View style={styles.telefon}>
      <View style={styles.telefonDim}>
        <View style={styles.dimBar} />
        <View style={[styles.dimBar, { width: '55%' }]} />
        <View style={styles.dimBlok} />
      </View>
      <View style={styles.ark}>
        <View style={styles.grabber} />
        <Text style={styles.arkTitel}>Tilføj opskrift</Text>
        <ArkRække emoji="📷" tekst="Tag et billede" />
        <ArkRække emoji="🖼️" tekst="Vælg fra galleri" />
        <View style={styles.arkRækkeWrap}>
          <ArkRække emoji="🔗" tekst="Indsæt et link" highlight />
          <Animated.View style={[styles.callout, { transform: [{ translateY: calloutY }] }]} pointerEvents="none">
            <Text style={styles.calloutTekst}>Tryk her</Text>
            <Text style={styles.calloutFinger}>👇</Text>
          </Animated.View>
        </View>
        <ArkRække emoji="✍️" tekst="Skriv selv" />
      </View>
    </View>
  );
}

function ArkRække({ emoji, tekst, highlight }: { emoji: string; tekst: string; highlight?: boolean }) {
  return (
    <View style={[styles.arkRække, highlight && styles.arkRækkeHigh]}>
      <Text style={{ fontSize: 18, width: 26 }}>{emoji}</Text>
      <Text style={[styles.arkRækkeTekst, highlight && { color: Colors.green }]}>{tekst}</Text>
    </View>
  );
}

// Mock push-notifikation der glider ind fra toppen med et lille hop,
// holder, og glider ud igen i loop. Viser værdien: du får besked om tilbud.
function NotifBanner() {
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(slide, { toValue: 1, duration: 650, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        Animated.delay(2200),
        Animated.timing(slide, { toValue: 0, duration: 450, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.delay(600),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [-130, 0] });
  const opacity = slide.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] });
  return (
    <View style={styles.bannerStage}>
      <Animated.View style={[styles.notifBanner, { transform: [{ translateY }], opacity }]}>
        <View style={styles.notifIkon}><Text style={{ fontSize: 18 }}>🏷️</Text></View>
        <View style={{ flex: 1 }}>
          <View style={styles.notifTop}>
            <Text style={styles.notifApp}>MadUgen</Text>
            <Text style={styles.notifTid}>nu</Text>
          </View>
          <Text style={styles.notifTekst}>Faxe Kondi er på tilbud i Netto denne uge 🎉</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },

  // Vedvarende top
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  logoRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', marginBottom: 18 },
  logo: {
    fontSize: 24, fontFamily: 'BricolageGrotesque_800ExtraBold',
    color: Colors.ink, letterSpacing: -0.5,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.line, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: Colors.greenBright },

  scroll: { padding: 24, paddingTop: 20, flexGrow: 1 },
  midtStil: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 12 },

  bigTitel: {
    fontSize: 30, fontFamily: 'BricolageGrotesque_800ExtraBold', color: Colors.ink,
    letterSpacing: -0.6, lineHeight: 36, marginBottom: 14,
  },
  titel: {
    fontSize: 26, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink,
    letterSpacing: -0.5, marginBottom: 12, textAlign: 'center',
  },
  broedtekst: {
    fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.inkSoft,
    lineHeight: 22, marginBottom: 24, textAlign: 'center',
  },
  broedtekstSmal: {
    fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft,
    lineHeight: 20, marginBottom: 18, textAlign: 'center',
  },

  // Værdikort (trin 0)
  værdiKort: {
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, padding: 18, gap: 14,
    shadowColor: '#1A1714', shadowOpacity: 0.06, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 2,
  },
  kortLinje: { height: 1, backgroundColor: Colors.line },
  punkt: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  punktEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  punktTekst: { flex: 1, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink, lineHeight: 21 },

  // Multi-/single-select kort (trin 1 + 4)
  valgKort: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1.5, borderColor: Colors.line, paddingHorizontal: 16, paddingVertical: 16,
  },
  valgKortValgt: { borderColor: Colors.green, backgroundColor: Colors.greenSoft },
  valgEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
  valgTekst: { flex: 1, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  valgTekstValgt: { color: Colors.green },
  kildeKort: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1.5, borderColor: Colors.line, paddingHorizontal: 16, paddingVertical: 15,
  },

  // Bekræftelse (trin 2)
  heroBlob: {
    width: 200, height: 200, borderRadius: 100, backgroundColor: Colors.greenSoft,
    alignItems: 'center', justifyContent: 'center', marginVertical: 28,
  },
  heroLinje: { fontSize: 18, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, textAlign: 'center' },

  // Værditilbud (trin 3)
  metodeRække: { flexDirection: 'row', gap: 10, marginTop: 8 },
  metodeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.line,
    borderRadius: Radii.pill, paddingHorizontal: 14, paddingVertical: 10,
  },
  metodeTekst: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.ink },

  // Henvisningskode (trin 4)
  kodeLink: { alignSelf: 'center', marginBottom: 18 },
  kodeLinkTekst: {
    fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft,
    textDecorationLine: 'underline',
  },
  kodeFelt: {
    backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.line,
    borderRadius: Radii.btn, paddingHorizontal: 16, height: 50,
    fontSize: 16, fontFamily: 'Inter_400Regular', color: Colors.ink, marginBottom: 16,
  },

  // Navn (trin 5)
  navnFelt: {
    backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.line,
    borderRadius: Radii.btn, paddingHorizontal: 16, height: 52,
    fontSize: 16, fontFamily: 'Inter_400Regular', color: Colors.ink,
    marginTop: 8,
  },
  hjælpetekst: {
    fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft,
    lineHeight: 19, marginTop: 14, textAlign: 'center',
  },

  // Husstand (trin 6)
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

  // Butikker (trin 7)
  butikChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, justifyContent: 'center' },
  butikChip: {
    borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10,
    backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.line,
  },
  butikChipTekst: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },

  // Favorit-grid (trin 8)
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
  // Dag-badge i 3-dages-vælgeren (I dag / I morgen / Om 2 dage)
  dagBadge: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: Colors.green, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  dagBadgeTekst: { color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold' },
  favNavn: {
    fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.ink,
    paddingHorizontal: 10, paddingVertical: 8, lineHeight: 16,
  },

  // Payoff (trin 9)
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
    lineHeight: 19, marginTop: 16, textAlign: 'center',
  },

  // Import-guide (telefon-mockup)
  telefon: {
    alignSelf: 'center', width: 232, height: 380, marginTop: 10,
    borderRadius: 30, borderWidth: 6, borderColor: Colors.canvas,
    backgroundColor: Colors.canvas, overflow: 'hidden', position: 'relative',
  },
  telefonDim: { padding: 16, gap: 8, opacity: 0.5 },
  dimBar: { height: 10, width: '80%', borderRadius: 5, backgroundColor: Colors.card },
  dimBlok: { height: 90, borderRadius: 12, backgroundColor: Colors.card, marginTop: 6 },
  ark: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: Colors.card,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 16,
  },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.line, marginBottom: 10 },
  arkTitel: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.ink, marginBottom: 8, marginLeft: 4 },
  arkRække: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  arkRækkeHigh: { borderColor: Colors.green, backgroundColor: Colors.greenSoft },
  arkRækkeTekst: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  arkRækkeWrap: { position: 'relative' },
  callout: {
    position: 'absolute', right: 0, top: -26,
    backgroundColor: Colors.blue, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6,
    alignItems: 'center',
  },
  calloutTekst: { color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold' },
  calloutFinger: { fontSize: 16, marginTop: -1 },

  // Notifikations-trin
  bannerStage: { height: 100, marginTop: 10, marginBottom: 20, overflow: 'hidden' },
  notifBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.line,
    borderRadius: 16, padding: 12, marginTop: 8,
    shadowColor: '#1A1714', shadowOpacity: 0.08, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  notifIkon: {
    width: 36, height: 36, borderRadius: 9, backgroundColor: Colors.greenSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  notifTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  notifApp: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.ink },
  notifTid: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  notifTekst: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.ink, lineHeight: 18, marginTop: 2 },

  // Overvåg-varer (chips + fritekst) på notif-trinnet
  watchLabel: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.ink, marginBottom: 10, marginTop: 4 },
  watchChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  watchChip: {
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.line,
  },
  watchChipValgt: { backgroundColor: Colors.greenSoft, borderColor: Colors.green },
  watchChipTekst: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  watchChipTekstValgt: { color: Colors.green },
  watchTilføjRække: { flexDirection: 'row', gap: 8, marginTop: 12 },
  watchFelt: {
    flex: 1, backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.line,
    borderRadius: Radii.btn, paddingHorizontal: 14, height: 46,
    fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.ink,
  },
  watchTilføjKnap: {
    paddingHorizontal: 18, borderRadius: Radii.btn, backgroundColor: Colors.greenSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  watchTilføjTekst: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.green },

  // Footer
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: Colors.paper },
  springOver: { alignSelf: 'center', marginBottom: 12 },
  springOverTekst: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  btnWrap: { position: 'relative' },
  btnRing: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: Colors.green, borderRadius: Radii.btn,
  },
  btnPrimary: {
    backgroundColor: Colors.green, borderRadius: Radii.btn,
    padding: 15, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  finger: { position: 'absolute', right: 26, bottom: -8, fontSize: 26 },
});
