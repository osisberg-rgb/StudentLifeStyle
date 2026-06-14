import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ImageBackground,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Radii, Shadow } from '../constants/theme';
import ButiksPill from '../components/ButiksPill';
import OpskriftDetaljeModal from '../components/OpskriftDetaljeModal';
import BesparelseGraf from '../components/BesparelseGraf';
import BesparelsesHistorikModal from '../components/BesparelsesHistorikModal';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Ingrediens, Madplan } from '../types/madplan';
import { kategoriserIngrediens } from '../constants/indkoeb';
import { bedsteTilbud, aktiveTilbud } from '../constants/tilbudspriser';
import { tælTilbudsMatch } from '../constants/tilbudsMatch';
import { useSamletBesparelse } from '../hooks/useSamletBesparelse';
import { OPSKRIFTER } from '../constants/opskrifter';
import { hentBillede } from '../constants/opskriftBilleder';

const KATEGORI_EMOJI: Record<string, string> = {
  'Kød': '🥩',
  'Fisk': '🐟',
  'Mejeri & æg': '🥛',
  'Pasta, ris & korn': '🍝',
  'Grøntsager': '🥦',
  'Dåse & konserves': '🥫',
  'Brød': '🍞',
  'Andet': '🏷️',
};

const UGEDAGE = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];

type Props = { navigation: any };

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [madplan, setMadplan] = useState<Madplan | null>(null);
  const [butikker, setButikker] = useState<string[]>([]);
  const [personer, setPersoner] = useState(4);
  const [navn, setNavn] = useState<string | null>(null);
  const [åbenOpskrift, setÅbenOpskrift] = useState<typeof OPSKRIFTER[0] | null>(null);
  const [historikÅben, setHistorikÅben] = useState(false);
  const { samletTilbud, antalPlaner, uger, klar: besparelseKlar } = useSamletBesparelse();

  const firstName = navn ?? user?.email?.split('@')[0] ?? 'dig';
  const weekNo = getWeekNumber();
  const idag = new Date().getDay();

  // Tilbuds-count for indeværende uge
  const alleVarer = (madplan?.indkoebsliste ?? []).flatMap(s => s.varer);
  const ugeTilbud = alleVarer.filter(v => v.paa_tilbud).length;
  const alleVarerAntal = alleVarer.length;
  // Looper tilbudsvarer + basispris-opslag + sortering — skal ikke køre
  // ved hvert re-render (fetch-svarene alene giver 3-4 renders pr. fokus)
  const ugensTilbud = useMemo(() => bedsteTilbud(3, butikker), [butikker, weekNo]);
  const harTilbudsdata = useMemo(() => aktiveTilbud().length > 0, [weekNo]);

  // Familiens vigtigste spørgsmål kl. 17: hvad skal vi have i aften?
  const dagIndex = idag === 0 ? 6 : idag - 1;
  const aftensmad = madplan?.dage?.[dagIndex]?.aftensmad;
  const erRester = !!aftensmad?.rester_fra;

  // Slå opskriften op ud fra måltidsnavnet — giver billede, tid og detalje-visning
  const aftenOpskrift = useMemo(() => {
    if (!aftensmad?.navn) return null;
    const navn = aftensmad.navn.replace(/^Rester:\s*/i, '').trim().toLowerCase();
    return OPSKRIFTER.find(o => o.navn.toLowerCase() === navn)
      ?? OPSKRIFTER.find(o => navn.includes(o.navn.toLowerCase()))
      ?? null;
  }, [aftensmad?.navn]);

  const aftenBillede = aftenOpskrift ? hentBillede(aftenOpskrift.id) : null;
  const aftenMinutter = (aftenOpskrift as any)?.minutter as number | undefined;
  const aftenTilbud = aftenOpskrift && !erRester
    ? tælTilbudsMatch(aftenOpskrift.id, butikker)
    : null;

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        supabase.from('madplaner').select('plan, total_pris, total_spar').eq('uge_nr', weekNo).maybeSingle(),
        supabase.from('profiles').select('stores, household_size').maybeSingle(),
      ]).then(([{ data: plan }, { data: profil }]) => {
        if (plan) setMadplan(plan.plan);
        if (profil?.stores) setButikker(profil.stores);
        if (profil?.household_size) setPersoner(profil.household_size);
      });
      // Separat kald: display_name-kolonnen kræver SQL i dashboardet og må
      // ikke kunne vælte hentningen af budget/butikker ovenfor
      supabase.from('profiles').select('display_name').maybeSingle().then(({ data, error }) => {
        if (!error && data?.display_name) setNavn(data.display_name);
      });
    }, [])
  );

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.weekLabel}>{UGEDAGE[idag]} · Uge {weekNo}</Text>
          <Text style={styles.greeting}>Hej {firstName} 👋</Text>
        </View>
        <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profil')}>
          <Text style={styles.avatarText}>{firstName[0]?.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {madplan ? (
          <>
            {/* I aften — aftensmaden er det, familien åbner appen for */}
            {aftensmad && (
              <View style={styles.section}>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>I aften</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Planer')}>
                    <Text style={styles.sectionLink}>Hele ugen</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.aftenKort}>
                  {aftenBillede ? (
                    <ImageBackground source={aftenBillede} style={styles.aftenBillede}>
                      {aftenMinutter != null && (
                        <View style={styles.aftenTid}>
                          <Text style={styles.aftenTidTekst}>⏱ {aftenMinutter} min</Text>
                        </View>
                      )}
                    </ImageBackground>
                  ) : (
                    <View style={[styles.aftenBillede, styles.aftenFallback]}>
                      <Text style={{ fontSize: 44 }}>🍽️</Text>
                      {aftenMinutter != null && (
                        <View style={styles.aftenTid}>
                          <Text style={styles.aftenTidTekst}>⏱ {aftenMinutter} min</Text>
                        </View>
                      )}
                    </View>
                  )}
                  <View style={styles.aftenInfo}>
                    <Text style={styles.aftenNavn} numberOfLines={2}>
                      {erRester ? `Rester: ${aftensmad.navn.replace(/^Rester:\s*/i, '')}` : aftensmad.navn}
                    </Text>
                    <View style={styles.aftenMetaRække}>
                      <Text style={styles.aftenMeta}>👤 {aftensmad.portioner} portioner</Text>
                      {aftenTilbud && aftenTilbud.antal > 0 && (
                        <View style={styles.aftenTilbudBadge}>
                          <Text style={styles.aftenTilbudTekst}>🏷 {aftenTilbud.antal} tilbud</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.aftenKnap}
                      onPress={() => aftenOpskrift ? setÅbenOpskrift(aftenOpskrift) : navigation.navigate('Planer')}
                    >
                      <Text style={styles.aftenKnapTekst}>Se opskrift</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Tilbuds-kort — ugens deal-count */}
            <View style={styles.sparekort}>
              <Text style={styles.spareLabel}>Tilbud brugt denne uge</Text>
              <Text style={styles.spareBeløb}>{ugeTilbud} varer</Text>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, {
                  width: `${alleVarerAntal === 0 ? 0 : Math.min(100, Math.round((ugeTilbud / alleVarerAntal) * 100))}%`
                }]} />
              </View>
              <Text style={styles.spareSub}>
                {ugeTilbud} af {alleVarerAntal} ingredienser er på tilbud
              </Text>
            </View>
          </>
        ) : (
          /* Tom tilstand — sælg handlingen, ikke "0 kr" */
          <View style={styles.ctaKort}>
            <Text style={styles.ctaTitel}>Klar til ugens madplan?</Text>
            <Text style={styles.ctaSub}>
              Vælg ugens retter — vi finder hvilke ingredienser der er på tilbud i dine butikker.
            </Text>
            <TouchableOpacity style={styles.ctaKnap} onPress={() => navigation.navigate('Planer')}>
              <Text style={styles.ctaKnapTekst}>Lav ugens plan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Besparelse over tid — det stærkeste argument mod opsigelse.
            Vises så snart der findes mindst én gemt plan, uanfor om der
            er en plan for netop denne uge. */}
        {besparelseKlar && antalPlaner > 0 && (
          <TouchableOpacity
            style={styles.tidKort}
            onPress={() => setHistorikÅben(true)}
            activeOpacity={0.8}
          >
            <View style={styles.tidHeader}>
              <View>
                <Text style={styles.tidLabel}>Tilbud brugt i alt med Mæt</Text>
                <Text style={styles.tidTal}>{samletTilbud} varer</Text>
              </View>
              <Text style={styles.tidLink}>Se historik ›</Text>
            </View>
            {uger.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <BesparelseGraf uger={uger} maks={12} højde={52} />
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Bedste tilbud — fra ugens tilbudsfil */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bedste tilbud lige nu</Text>
          {ugensTilbud.length === 0 ? (
            <View style={styles.tilbudTom}>
              <Text style={styles.tilbudTomEmoji}>🏷️</Text>
              {harTilbudsdata ? (
                <>
                  <Text style={styles.tilbudTomTekst}>Ingen tilbud i dine valgte butikker</Text>
                  <Text style={styles.tilbudTomSub}>Tilføj flere butikker i din profil for at se ugens tilbud</Text>
                </>
              ) : (
                <>
                  <Text style={styles.tilbudTomTekst}>Ugens tilbud er ikke klar endnu</Text>
                  <Text style={styles.tilbudTomSub}>Kig forbi igen senere — vi opdaterer hver uge</Text>
                </>
              )}
            </View>
          ) : ugensTilbud.map((t, i) => (
            <View key={i} style={styles.tilbudKort}>
              <View style={styles.tilbudThumb}>
                <Text style={{ fontSize: 26 }}>
                  {KATEGORI_EMOJI[kategoriserIngrediens({ navn: t.navn, soeg: t.soeg })] ?? '🏷️'}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.tilbudNavn}>{t.navn}</Text>
                <ButiksPill name={t.butik} />
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.normalpris}>{t.normalpris},-</Text>
                <Text style={styles.tilbudspris}>{t.tilbudspris},-</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <OpskriftDetaljeModal
        opskrift={åbenOpskrift}
        butikker={butikker}
        personer={personer}
        onLuk={() => setÅbenOpskrift(null)}
      />

      <BesparelsesHistorikModal
        synlig={historikÅben}
        samletTilbud={samletTilbud}
        uger={uger}
        onLuk={() => setHistorikÅben(false)}
      />
    </SafeAreaView>
  );
}

function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((((now.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.canvas },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 12,
    backgroundColor: Colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  weekLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5 },
  greeting: { fontSize: 22, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.4 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.green },
  content: { padding: 20, paddingBottom: 32 },

  aftenKort: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.line,
    overflow: 'hidden',
  },
  aftenBillede: { height: 140, justifyContent: 'flex-end' },
  aftenFallback: { backgroundColor: Colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  aftenTid: {
    position: 'absolute', bottom: 10, left: 10,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  aftenTidTekst: { color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  aftenInfo: { padding: 14 },
  aftenNavn: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.3 },
  aftenMetaRække: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  aftenMeta: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  aftenTilbudBadge: {
    backgroundColor: '#F0FAF0', borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.green,
  },
  aftenTilbudTekst: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.green },
  aftenKnap: {
    backgroundColor: Colors.green, borderRadius: Radii.btn,
    padding: 13, alignItems: 'center', marginTop: 12,
  },
  aftenKnapTekst: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },

  sparekort: {
    backgroundColor: Colors.green,
    borderRadius: Radii.hero,
    padding: 18,
    marginBottom: 16,
    ...Shadow,
  },
  spareLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  spareBeløb: { fontSize: 30, fontFamily: 'BricolageGrotesque_800ExtraBold', color: '#fff', letterSpacing: -0.6 },
  spareSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 5 },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.yellow, borderRadius: 3 },

  tidKort: {
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line,
    padding: 16, marginBottom: 24,
  },
  tidHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tidLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft, marginBottom: 2 },
  tidTal: { fontSize: 24, fontFamily: 'BricolageGrotesque_800ExtraBold', color: Colors.green, letterSpacing: -0.5 },
  tidLink: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.green },

  ctaKort: {
    backgroundColor: Colors.green,
    borderRadius: Radii.hero,
    padding: 22,
    marginBottom: 24,
    ...Shadow,
  },
  ctaTitel: { fontSize: 20, fontFamily: 'BricolageGrotesque_700Bold', color: '#fff', letterSpacing: -0.4 },
  ctaSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)', marginTop: 6, lineHeight: 19 },
  ctaKnap: {
    backgroundColor: '#fff', borderRadius: Radii.btn,
    padding: 14, alignItems: 'center', marginTop: 16,
  },
  ctaKnapTekst: { color: Colors.green, fontSize: 15, fontFamily: 'Inter_700Bold' },

  section: { marginBottom: 24 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.3 },
  sectionLink: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.green },

  tilbudKort: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.line,
    marginBottom: 8,
  },
  tilbudThumb: {
    width: 52,
    height: 52,
    borderRadius: Radii.thumb,
    backgroundColor: Colors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tilbudNavn: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink, marginBottom: 4 },
  normalpris: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textDecorationLine: 'line-through' },
  tilbudspris: { fontSize: 18, fontFamily: 'BricolageGrotesque_800ExtraBold', color: Colors.red, letterSpacing: -0.36 },
  tilbudTom: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: 24,
    alignItems: 'center',
  },
  tilbudTomEmoji: { fontSize: 32, marginBottom: 8 },
  tilbudTomTekst: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink, marginBottom: 4 },
  tilbudTomSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textAlign: 'center', lineHeight: 17 },
});
