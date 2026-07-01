import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  Alert, Modal, TextInput, Switch,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';
import ButiksPill from '../components/ButiksPill';
import Chip from '../components/Chip';
import BesparelsesHistorikModal from '../components/BesparelsesHistorikModal';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useSamletBesparelse, formatKr } from '../hooks/useSamletBesparelse';
import { alleOpskrifter } from '../lib/brugerOpskrifter';
import {
  hentWatchlist, alleWatch, tilføjWatch, fjernWatch, termFraFritekst, type WatchRække,
} from '../lib/watchlist';
import { harTilladelse, registrérForPush, afmeldPush } from '../lib/notifikationer';
import { erAdmin } from '../lib/admin';
import UploadTilbudModal from '../components/UploadTilbudModal';
import ManuelTilbudModal from '../components/ManuelTilbudModal';

const ALLE_BUTIKKER = ['Netto', 'Rema 1000', 'Føtex', 'SuperBrugsen', 'Bilka', 'Lidl', 'Meny', '365discount', 'Kvikly'];

export default function ProfilScreen() {
  const { user, session, signOut } = useAuth();
  const [valgteButikker, setValgteButikker] = useState(['Netto', 'Rema 1000']);
  const [butikModalVisible, setButikModalVisible] = useState(false);
  const [personer, setPersoner] = useState(4);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [historikÅben, setHistorikÅben] = useState(false);
  const [uploadÅben, setUploadÅben] = useState(false);
  const [manuelÅben, setManuelÅben] = useState(false);
  const [watch, setWatch] = useState<WatchRække[]>([]);
  const [nyVare, setNyVare] = useState('');
  const [notiTil, setNotiTil] = useState(false);
  const { samletTilbud, antalPlaner, uger, klar: besparelseKlar } = useSamletBesparelse();
  const harPlaner = antalPlaner > 0;

  const navn = displayName ?? user?.email?.split('@')[0] ?? 'Profil';
  const initial = navn[0]?.toUpperCase();
  // Antal opskrifter i appen (statiske + brugerens egne importerede)
  const antalOpskrifter = alleOpskrifter().length;

  // Hent profil fra DB ved opstart
  useEffect(() => {
    supabase.from('profiles').select('stores, household_size').maybeSingle().then(({ data }) => {
      if (data) {
        if (data.stores?.length) setValgteButikker(data.stores);
        if (data.household_size) setPersoner(data.household_size);
      }
    });
    // Separat kald — display_name-kolonnen må ikke vælte resten af profilen
    supabase.from('profiles').select('display_name').maybeSingle().then(({ data, error }) => {
      if (!error && data?.display_name) setDisplayName(data.display_name);
    });
    hentWatchlist().then(setWatch);
    harTilladelse().then(setNotiTil);
  }, []);

  // Overvåg en ny vare (fritekst) — beder også om tilladelse hvis ikke givet
  async function tilføjOvervågning() {
    const label = nyVare.trim();
    const term = termFraFritekst(label);
    if (!term) return;
    const ok = await tilføjWatch(label, term, 'fritekst');
    if (!ok) { Alert.alert('Hov', 'Kunne ikke gemme. Er du logget ind?'); return; }
    setWatch(alleWatch());
    setNyVare('');
    if (!notiTil) setNotiTil(await registrérForPush());
  }
  async function fjernOvervågning(term: string) {
    await fjernWatch(term);
    setWatch(alleWatch());
  }
  async function vekslNotifikationer(v: boolean) {
    if (v) setNotiTil(await registrérForPush());
    else { await afmeldPush(); setNotiTil(false); }
  }

  async function gemButikker(butikker: string[]) {
    await supabase.from('profiles').update({ stores: butikker }).eq('id', user!.id);
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
            {personer} {personer === 1 ? 'person' : 'personer'} i husstanden
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
            <Text style={styles.statLabel}>Opskrifter</Text>
            <Text style={[styles.statVal, { color: Colors.ink }]}>{antalOpskrifter}</Text>
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

        {/* Notifikationer — overvåg specifikke varer og få push når de er på tilbud */}
        <Text style={styles.sektionLabel}>NOTIFIKATIONER</Text>
        <View style={styles.kort}>
          <View style={styles.række}>
            <Text style={styles.rækkIkon}>🔔</Text>
            <Text style={styles.rækkeLabel}>Få besked om tilbud</Text>
            <Switch
              value={notiTil}
              onValueChange={vekslNotifikationer}
              trackColor={{ true: Colors.green, false: Colors.line }}
            />
          </View>
          <Separator />
          <View style={styles.watchInputRække}>
            <TextInput
              style={styles.watchInput}
              value={nyVare}
              onChangeText={setNyVare}
              placeholder="Overvåg en vare, fx Faxe Kondi"
              placeholderTextColor={Colors.inkSoft}
              onSubmitEditing={tilføjOvervågning}
              returnKeyType="done"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.watchTilføj, !nyVare.trim() && { opacity: 0.4 }]}
              onPress={tilføjOvervågning}
              disabled={!nyVare.trim()}
            >
              <Text style={styles.watchTilføjTekst}>Tilføj</Text>
            </TouchableOpacity>
          </View>
          {watch.length > 0 && <Separator />}
          {watch.map((w, i) => (
            <View key={w.id}>
              {i > 0 && <Separator />}
              <View style={styles.række}>
                <Text style={styles.rækkIkon}>🔔</Text>
                <Text style={styles.rækkeLabel} numberOfLines={1}>{w.label}</Text>
                <TouchableOpacity onPress={() => fjernOvervågning(w.term)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.watchFjern}>Fjern</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Admin — kun synlig for admin-konti (gaten håndhæves server-side) */}
        {erAdmin(session) && (
          <>
            <Text style={styles.sektionLabel}>ADMIN</Text>
            <View style={styles.kort}>
              <TouchableOpacity style={styles.række} onPress={() => setUploadÅben(true)}>
                <Text style={styles.rækkIkon}>🗞️</Text>
                <Text style={styles.rækkeLabel}>Upload tilbudsavis</Text>
                <Text style={styles.værditekst}>›</Text>
              </TouchableOpacity>
              <Separator />
              <TouchableOpacity style={styles.række} onPress={() => setManuelÅben(true)}>
                <Text style={styles.rækkIkon}>✍️</Text>
                <Text style={styles.rækkeLabel}>Indtast tilbud manuelt</Text>
                <Text style={styles.værditekst}>›</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

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
      <BesparelsesHistorikModal
        synlig={historikÅben}
        samletTilbud={samletTilbud}
        uger={uger}
        onLuk={() => setHistorikÅben(false)}
      />
      <UploadTilbudModal synlig={uploadÅben} onLuk={() => setUploadÅben(false)} />
      <ManuelTilbudModal synlig={manuelÅben} onLuk={() => setManuelÅben(false)} />
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
  watchInputRække: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  watchInput: {
    flex: 1, backgroundColor: Colors.canvas, borderRadius: Radii.btn,
    borderWidth: 1, borderColor: Colors.line, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.ink,
  },
  watchTilføj: { backgroundColor: Colors.green, borderRadius: Radii.btn, paddingHorizontal: 14, paddingVertical: 10 },
  watchTilføjTekst: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  watchFjern: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.red },
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
});
