import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  Alert, Modal,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Colors, Radii } from '../constants/theme';
import ButiksPill from '../components/ButiksPill';
import Chip from '../components/Chip';
import BesparelsesHistorikModal from '../components/BesparelsesHistorikModal';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useSamletBesparelse, formatKr } from '../hooks/useSamletBesparelse';

const ALLE_BUTIKKER = ['Netto', 'Rema 1000', 'Lidl', '365discount', 'Føtex', 'SuperBrugsen', 'Kvikly', 'Bilka'];

const KOED_VALG: { label: string; ikon: string }[] = [
  { label: 'Alt',      ikon: '🍽️' },
  { label: 'Kylling',  ikon: '🍗' },
  { label: 'Oksekød',  ikon: '🥩' },
  { label: 'Svinekød', ikon: '🐷' },
];

export default function ProfilScreen() {
  const { user, signOut } = useAuth();
  const [valgteButikker, setValgteButikker] = useState(['Netto', 'Rema 1000', 'Lidl']);
  const [butikModalVisible, setButikModalVisible] = useState(false);
  const [budget, setBudget] = useState(350);
  const [budgetDraft, setBudgetDraft] = useState(350);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [koed, setKoed] = useState<string[]>(['Alt']);
  const [kostModalVisible, setKostModalVisible] = useState(false);
  const [personer, setPersoner] = useState(4);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [historikÅben, setHistorikÅben] = useState(false);
  const { samletTilbud, antalPlaner, uger, klar: besparelseKlar } = useSamletBesparelse();
  const harPlaner = antalPlaner > 0;

  const navn = displayName ?? user?.email?.split('@')[0] ?? 'Profil';
  const initial = navn[0]?.toUpperCase();

  // Hent profil fra DB ved opstart
  useEffect(() => {
    supabase.from('profiles').select('stores, budget_per_week, diet, household_size').maybeSingle().then(({ data }) => {
      if (data) {
        if (data.stores?.length) setValgteButikker(data.stores);
        if (data.budget_per_week) { setBudget(data.budget_per_week); setBudgetDraft(data.budget_per_week); }
        if (data.household_size) setPersoner(data.household_size);
        if (data.diet?.length) {
          const d = data.diet as string[];
          const koedFundet = d.filter(x => KOED_VALG.some(k => k.label === x));
          setKoed(koedFundet.length > 0 ? koedFundet : ['Alt']);
        }
      }
    });
    // Separat kald — display_name-kolonnen må ikke vælte resten af profilen
    supabase.from('profiles').select('display_name').maybeSingle().then(({ data, error }) => {
      if (!error && data?.display_name) setDisplayName(data.display_name);
    });
  }, []);

  async function gemButikker(butikker: string[]) {
    await supabase.from('profiles').update({ stores: butikker }).eq('id', user!.id);
  }

  async function gemBudget(b: number) {
    await supabase.from('profiles').update({ budget_per_week: b }).eq('id', user!.id);
  }

  async function gemKost() {
    await supabase.from('profiles').update({ diet: koed }).eq('id', user!.id);
  }

  // Gemmes med det samme ved tryk — bruges automatisk som standard i Ny plan
  async function gemPersoner(n: number) {
    setPersoner(n);
    await supabase.from('profiles').update({ household_size: n }).eq('id', user!.id);
  }

  function toggleButik(b: string) {
    setValgteButikker(prev =>
      prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]
    );
  }

  function handleLogUd() {
    Alert.alert('Log ud', 'Er du sikker på, at du vil logge ud?', [
      { text: 'Annuller', style: 'cancel' },
      { text: 'Log ud', style: 'destructive', onPress: signOut },
    ]);
  }

  const butikSummary = valgteButikker.length === 0
    ? 'Ingen valgt'
    : valgteButikker.slice(0, 2).join(', ') + (valgteButikker.length > 2 ? ` +${valgteButikker.length - 2}` : '');

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.navn}>{navn}</Text>
          <Text style={styles.rolle}>
            {personer} {personer === 1 ? 'person' : 'personer'} i husstanden · {budget} kr/uge
          </Text>
        </View>

        {/* Statistik — akkumuleret besparelse fra gemte madplaner.
            Besparelses-kortet åbner historikken når der er planer. */}
        <View style={styles.statRække}>
          <TouchableOpacity
            style={[styles.statKort, { flex: 1, marginRight: 8 }]}
            onPress={() => harPlaner && setHistorikÅben(true)}
            activeOpacity={harPlaner ? 0.7 : 1}
            disabled={!harPlaner}
          >
            <Text style={styles.statLabel}>Tilbud brugt i alt</Text>
            {besparelseKlar && !harPlaner ? (
              <Text style={styles.statTom}>Ingen tilbud registreret endnu.</Text>
            ) : (
              <>
                <Text style={styles.statVal}>{samletTilbud} varer</Text>
                <Text style={styles.statLink}>Se historik ›</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={[styles.statKort, { flex: 1 }]}>
            <Text style={styles.statLabel}>Madplaner</Text>
            <Text style={[styles.statVal, { color: Colors.ink }]}>{antalPlaner}</Text>
          </View>
        </View>

        {/* Indstillinger */}
        <Text style={styles.sektionLabel}>INDSTILLINGER</Text>
        <View style={styles.kort}>
          <TouchableOpacity style={styles.række} onPress={() => setButikModalVisible(true)}>
            <Text style={styles.rækkIkon}>🛒</Text>
            <Text style={styles.rækkeLabel}>Mine butikker</Text>
            <Text style={styles.værditekst}>{butikSummary} ›</Text>
          </TouchableOpacity>
          <Separator />
          <TouchableOpacity style={styles.række} onPress={() => { setBudgetDraft(budget); setBudgetModalVisible(true); }}>
            <Text style={styles.rækkIkon}>💰</Text>
            <Text style={styles.rækkeLabel}>Budget pr. uge</Text>
            <Text style={styles.værditekst}>{budget} kr ›</Text>
          </TouchableOpacity>
          <Separator />
          <TouchableOpacity style={styles.række} onPress={() => setKostModalVisible(true)}>
            <Text style={styles.rækkIkon}>🥗</Text>
            <Text style={styles.rækkeLabel}>Kostpræferencer</Text>
            <Text style={styles.værditekst}>{koed.includes('Alt') ? 'Alt kød' : koed.join(', ')} ›</Text>
          </TouchableOpacity>
          <Separator />
          <Række ikon="👥" label="Antal personer">
            <View style={styles.stepper}>
              <TouchableOpacity
                style={[styles.stepKnap, personer <= 1 && styles.stepKnapDisabled]}
                onPress={() => gemPersoner(Math.max(1, personer - 1))}
                disabled={personer <= 1}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              >
                <Text style={styles.stepTekst}>−</Text>
              </TouchableOpacity>
              <Text style={styles.personerVærdi}>{personer}</Text>
              <TouchableOpacity
                style={[styles.stepKnap, personer >= 8 && styles.stepKnapDisabled]}
                onPress={() => gemPersoner(Math.min(8, personer + 1))}
                disabled={personer >= 8}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              >
                <Text style={styles.stepTekst}>+</Text>
              </TouchableOpacity>
            </View>
          </Række>
        </View>

        {/* Andet */}
        <Text style={styles.sektionLabel}>ANDET</Text>
        <View style={styles.kort}>
          <TouchableOpacity style={styles.logUdRække} onPress={handleLogUd}>
            <Text style={styles.logUdIcon}>↩</Text>
            <Text style={styles.logUdTekst}>Log ud</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Butik-modal */}
      <Modal
        visible={butikModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setButikModalVisible(false)}
      >
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitel}>Mine butikker</Text>
            <TouchableOpacity onPress={() => setButikModalVisible(false)}>
              <Text style={styles.modalLuk}>Færdig</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSub}>Vælg de butikker du handler i. Vi finder de bedste tilbud på tværs af dem.</Text>

          <View style={styles.modalChips}>
            {ALLE_BUTIKKER.map(b => (
              <Chip
                key={b}
                label={b}
                active={valgteButikker.includes(b)}
                onPress={() => toggleButik(b)}
              />
            ))}
          </View>

          {valgteButikker.length > 0 && (
            <View style={styles.valgtePills}>
              <Text style={styles.valgteLabel}>Valgte butikker</Text>
              <View style={styles.pillsRække}>
                {valgteButikker.map(b => <ButiksPill key={b} name={b} />)}
              </View>
            </View>
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.btnPrimary, valgteButikker.length === 0 && { opacity: 0.4 }]}
              onPress={() => { gemButikker(valgteButikker); setButikModalVisible(false); }}
              disabled={valgteButikker.length === 0}
            >
              <Text style={styles.btnText}>Gem ændringer</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      {/* Kost-modal */}
      <Modal
        visible={kostModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setKostModalVisible(false)}
      >
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitel}>Kostpræferencer</Text>
            <TouchableOpacity onPress={() => { gemKost(); setKostModalVisible(false); }}>
              <Text style={styles.modalLuk}>Færdig</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSub}>Vælg de kødtyper I spiser derhjemme. Madplanen holder sig til dem.</Text>
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            {KOED_VALG.map(k => {
              const aktiv = koed.includes(k.label);
              return (
                <TouchableOpacity
                  key={k.label}
                  style={[styles.kostRække, aktiv && styles.kostRækkeAktiv]}
                  onPress={() => {
                    if (k.label === 'Alt') {
                      setKoed(['Alt']);
                    } else {
                      setKoed(prev => {
                        const uden = prev.filter(x => x !== 'Alt');
                        return uden.includes(k.label)
                          ? uden.filter(x => x !== k.label).length === 0 ? ['Alt'] : uden.filter(x => x !== k.label)
                          : [...uden, k.label];
                      });
                    }
                  }}
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
          </View>
        </SafeAreaView>
      </Modal>

      {/* Budget-modal */}
      <Modal
        visible={budgetModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setBudgetModalVisible(false)}
      >
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitel}>Budget pr. uge</Text>
            <TouchableOpacity onPress={() => setBudgetModalVisible(false)}>
              <Text style={styles.modalLuk}>Annuller</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSub}>
            Sæt dit ugentlige madbudget. Vi holder madplanen inden for dette beløb.
          </Text>

          <View style={styles.budgetVisning}>
            <Text style={styles.budgetBeløb}>{budgetDraft} kr</Text>
            <Text style={styles.budgetLabel}>pr. uge</Text>
          </View>

          <View style={styles.sliderWrap}>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={200}
              maximumValue={800}
              step={10}
              value={budgetDraft}
              onValueChange={v => setBudgetDraft(Math.round(v))}
              minimumTrackTintColor={Colors.green}
              maximumTrackTintColor={Colors.line}
              thumbTintColor={Colors.green}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>200 kr</Text>
              <Text style={styles.sliderLabel}>800 kr</Text>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => { setBudget(budgetDraft); gemBudget(budgetDraft); setBudgetModalVisible(false); }}
            >
              <Text style={styles.btnText}>Gem ændringer</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <BesparelsesHistorikModal
        synlig={historikÅben}
        samletTilbud={samletTilbud}
        uger={uger}
        onLuk={() => setHistorikÅben(false)}
      />
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={{ height: 1, backgroundColor: Colors.line, marginLeft: 52 }} />;
}

function Række({ ikon, label, children }: { ikon: string; label: string; children: React.ReactNode }) {
  return (
    <View style={styles.række}>
      <Text style={styles.rækkIkon}>{ikon}</Text>
      <Text style={styles.rækkeLabel}>{label}</Text>
      <View style={styles.rækkeRet}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.canvas },
  content: { padding: 20, paddingBottom: 40 },
  avatarWrap: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.greenSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.green },
  navn: { fontSize: 20, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.4 },
  rolle: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 2 },
  statRække: { flexDirection: 'row', marginBottom: 28 },
  statKort: {
    backgroundColor: Colors.card, borderRadius: Radii.card,
    padding: 18, borderWidth: 1, borderColor: Colors.line,
  },
  statLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft, marginBottom: 6 },
  statVal: { fontSize: 22, fontFamily: 'BricolageGrotesque_800ExtraBold', color: Colors.green, letterSpacing: -0.4 },
  statLink: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.green, marginTop: 4 },
  statTom: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, lineHeight: 18 },
  sektionLabel: {
    fontSize: 11, fontFamily: 'Inter_700Bold', color: Colors.inkSoft,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
  },
  kort: {
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, marginBottom: 24, overflow: 'hidden',
  },
  række: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  rækkIkon: { fontSize: 20, marginRight: 14, width: 24, textAlign: 'center' },
  rækkeLabel: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.ink },
  rækkeRet: { flexDirection: 'row', alignItems: 'center' },
  værditekst: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepKnap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.canvas, borderWidth: 1, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  stepKnapDisabled: { opacity: 0.35 },
  stepTekst: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.ink },
  personerVærdi: {
    fontSize: 15, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink,
    minWidth: 20, textAlign: 'center',
  },
  logUdRække: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  logUdIcon: { fontSize: 18, marginRight: 14, color: Colors.red },
  logUdTekst: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.red },

  // Modal
  modalRoot: { flex: 1, backgroundColor: Colors.paper },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  modalTitel: { fontSize: 20, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.4 },
  modalLuk: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.green },
  modalSub: {
    fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft,
    lineHeight: 20, margin: 20, marginBottom: 8,
  },
  modalChips: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, paddingTop: 12 },
  valgtePills: { margin: 20, marginTop: 24 },
  valgteLabel: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  pillsRække: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modalFooter: { padding: 20, marginTop: 'auto' },
  btnPrimary: { backgroundColor: Colors.green, borderRadius: Radii.btn, padding: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  budgetVisning: { alignItems: 'center', marginTop: 32, marginBottom: 24 },
  budgetBeløb: { fontSize: 52, fontFamily: 'BricolageGrotesque_800ExtraBold', color: Colors.green, letterSpacing: -1 },
  budgetLabel: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 4 },
  sliderWrap: { paddingHorizontal: 24 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sliderLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  kostSektionLabel: {
    fontSize: 11, fontFamily: 'Inter_700Bold', color: Colors.inkSoft,
    letterSpacing: 1, textTransform: 'uppercase', marginTop: 20, marginBottom: 2,
  },
  kostSektionSub: {
    fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginBottom: 12,
  },
  koedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  koedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.card, borderRadius: Radii.btn,
    borderWidth: 1.5, borderColor: Colors.line,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  koedChipAktiv: { borderColor: Colors.green, backgroundColor: Colors.greenSoft },
  koedIkon: { fontSize: 18 },
  koedLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  koedTjek: { fontSize: 12, color: Colors.green, fontFamily: 'Inter_700Bold' },
  kostRadio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  kostRadioAktiv: { borderColor: Colors.green },
  kostRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.green },
  kostRække: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1.5, borderColor: Colors.line,
    padding: 16, marginBottom: 10,
  },
  kostRækkeAktiv: { borderColor: Colors.green, backgroundColor: Colors.greenSoft },
  kostIkon: { fontSize: 24, marginRight: 14 },
  kostLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink, marginBottom: 2 },
  kostBeskrivelse: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  kostCheck: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  kostCheckAktiv: { backgroundColor: Colors.greenBright, borderColor: Colors.greenBright },
  kostCheckmark: { color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold' },
});
