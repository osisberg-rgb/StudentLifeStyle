// Admin-modal til at uploade ugens tilbudsaviser. Vælg 1-N PDF'er, sæt butik
// pr. fil, vælg uge, og send til skyen. Viser derefter status pr. butik
// (poller `tilbud_import_job`). Kun synlig for admin (gaten ligger i ProfilScreen).
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Alert, Modal,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Radii } from '../constants/theme';
import Chip from './Chip';
import {
  ALLE_BUTIK_VALG, BUTIK_SLUG, aktuelUge, gætButik, hentJobStatus, uploadOgStart,
  type ButikValg, type JobStatus, type UploadFil,
} from '../lib/tilbudUpload';

type Props = { synlig: boolean; onLuk: () => void };

const STATUS_TEKST: Record<JobStatus['status'], string> = {
  afventer: 'Afventer …', koerer: 'Udtrækker …', faerdig: 'Færdig', fejl: 'Fejl',
};

export default function UploadTilbudModal({ synlig, onLuk }: Props) {
  const [filer, setFiler] = useState<UploadFil[]>([]);
  const [uge, setUge] = useState(String(aktuelUge()));
  const [sender, setSender] = useState(false);
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ryd op ved luk
  useEffect(() => {
    if (!synlig) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      setFiler([]); setJobs([]); setSender(false); setUge(String(aktuelUge()));
    }
  }, [synlig]);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  async function vælgFiler() {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf', multiple: true, copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const nye = res.assets.map(a => ({ uri: a.uri, navn: a.name, butik: gætButik(a.name) }));
    setFiler(nye);
    setJobs([]);
  }

  function sætButik(index: number, b: ButikValg) {
    setFiler(prev => prev.map((f, i) => (i === index ? { ...f, butik: b } : f)));
  }

  // Stepper: klik dig til ugen uden at åbne number-pad. Klampes til 1-53.
  function justérUge(delta: number) {
    setUge(prev => {
      const n = (parseInt(prev, 10) || aktuelUge()) + delta;
      return String(Math.min(53, Math.max(1, n)));
    });
  }

  function startPolling(ugeNr: number, slugs: string[]) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const s = await hentJobStatus(ugeNr, slugs);
      setJobs(s);
      const alleFærdige = s.length > 0 && s.every(j => j.status === 'faerdig' || j.status === 'fejl');
      if (alleFærdige && pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; setSender(false); }
    }, 4000);
  }

  async function send() {
    const ugeNr = parseInt(uge, 10);
    if (!ugeNr || filer.length === 0) { Alert.alert('Hov', 'Vælg mindst én PDF og en gyldig uge.'); return; }
    setSender(true);
    const r = await uploadOgStart(filer, ugeNr);
    if (!r.ok) { setSender(false); Alert.alert('Fejl', r.fejl ?? 'Ukendt fejl'); return; }
    const slugs = filer.map(f => BUTIK_SLUG[f.butik]);
    setJobs(slugs.map(slug => ({
      id: `${slug}-uge${ugeNr}`, butik: '', slug, uge: ugeNr, status: 'afventer', antal: 0, fejl: null,
    })));
    startPolling(ugeNr, slugs);
  }

  return (
    <Modal visible={synlig} animationType="slide" presentationStyle="pageSheet" onRequestClose={onLuk}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.titel}>Upload tilbudsavis</Text>
          <TouchableOpacity onPress={onLuk}><Text style={styles.luk}>Færdig</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.sub}>Vælg PDF'erne, sæt butik på hver, og send til skyen. Udtrækningen kører i baggrunden — du behøver ikke holde appen åben.</Text>

          <View style={styles.ugeRække}>
            <Text style={styles.ugeLabel}>Uge</Text>
            <View style={styles.ugeStepper}>
              <TouchableOpacity style={styles.ugeKnap} onPress={() => justérUge(-1)} activeOpacity={0.7}>
                <Text style={styles.ugeKnapTekst}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.ugeInput}
                value={uge}
                onChangeText={setUge}
                keyboardType="number-pad"
                maxLength={2}
              />
              <TouchableOpacity style={styles.ugeKnap} onPress={() => justérUge(1)} activeOpacity={0.7}>
                <Text style={styles.ugeKnapTekst}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.vælgKnap} onPress={vælgFiler} activeOpacity={0.85}>
            <Text style={styles.vælgKnapTekst}>{filer.length ? 'Vælg andre PDF\'er' : 'Vælg PDF\'er'}</Text>
          </TouchableOpacity>

          {filer.map((f, i) => (
            <View key={f.uri} style={styles.filKort}>
              <Text style={styles.filNavn} numberOfLines={1}>{f.navn}</Text>
              <View style={styles.chips}>
                {ALLE_BUTIK_VALG.map(b => (
                  <Chip key={b} label={b} active={f.butik === b} onPress={() => sætButik(i, b)} />
                ))}
              </View>
            </View>
          ))}

          {jobs.length > 0 && (
            <View style={styles.statusBoks}>
              <Text style={styles.statusTitel}>Status</Text>
              {jobs.map(j => (
                <View key={j.id} style={styles.statusRække}>
                  <Text style={styles.statusButik}>{j.slug}</Text>
                  <Text style={[styles.statusVærdi, j.status === 'fejl' && { color: Colors.red }, j.status === 'faerdig' && { color: Colors.green }]}>
                    {STATUS_TEKST[j.status]}{j.status === 'faerdig' ? ` — ${j.antal} tilbud` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.sendKnap, (sender || filer.length === 0) && { opacity: 0.4 }]}
            onPress={send}
            disabled={sender || filer.length === 0}
          >
            <Text style={styles.sendTekst}>{sender ? 'Sender …' : 'Send til sky'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  titel: { fontSize: 20, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.4 },
  luk: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.green },
  content: { padding: 20 },
  sub: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, lineHeight: 20, marginBottom: 20 },
  ugeRække: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  ugeLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  ugeStepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ugeKnap: {
    width: 40, height: 40, borderRadius: Radii.btn, backgroundColor: Colors.greenSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  ugeKnapTekst: { fontSize: 22, fontFamily: 'Inter_700Bold', color: Colors.green, lineHeight: 24 },
  ugeInput: {
    backgroundColor: Colors.card, borderRadius: Radii.btn, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 15, fontFamily: 'Inter_600SemiBold',
    color: Colors.ink, minWidth: 64, textAlign: 'center',
  },
  vælgKnap: {
    backgroundColor: Colors.greenSoft, borderRadius: Radii.btn, paddingVertical: 14,
    alignItems: 'center', marginBottom: 16,
  },
  vælgKnapTekst: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.green },
  filKort: {
    backgroundColor: Colors.card, borderRadius: Radii.card, borderWidth: 1, borderColor: Colors.line,
    padding: 14, marginBottom: 12,
  },
  filNavn: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusBoks: {
    backgroundColor: Colors.card, borderRadius: Radii.card, borderWidth: 1, borderColor: Colors.line,
    padding: 16, marginTop: 8,
  },
  statusTitel: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  statusRække: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  statusButik: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  statusVærdi: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.line },
  sendKnap: { backgroundColor: Colors.green, borderRadius: Radii.btn, padding: 15, alignItems: 'center' },
  sendTekst: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
