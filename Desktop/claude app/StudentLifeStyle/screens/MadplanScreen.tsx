import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Dag = {
  dag: string;
  morgenmad: string;
  frokost: string;
  aftensmad: string;
  snack?: string;
};

type Madplan = {
  uge: Dag[];
  indkøbsliste?: string[];
  samlet_pris?: string;
};

export default function MadplanScreen() {
  const { signOut, user } = useAuth();
  const [madplan, setMadplan] = useState<Madplan | null>(null);
  const [loading, setLoading] = useState(false);
  const [valgtDag, setValgtDag] = useState(0);

  async function genererMadplan() {
    setLoading(true);
    try {
      // Hent PDF-filer fra tilbudsaviser bucket
      const { data: filer, error: listError } = await supabase.storage
        .from('tilbudsaviser')
        .list('', { limit: 5 });

      if (listError) throw listError;

      const pdfNavne = filer?.map((f) => f.name).filter((n) => n.endsWith('.pdf')) ?? [];

      // Kald edge function
      const { data, error } = await supabase.functions.invoke('dynamic-action', {
        body: {
          action: 'generate_meal_plan',
          tilbudsaviser: pdfNavne,
          budget: 'studerende',
          personer: 1,
        },
      });

      if (error) throw error;

      // Edge function returnerer enten direkte JSON eller indlejret i et felt
      const plan: Madplan = data?.madplan ?? data?.meal_plan ?? data;
      if (!plan?.uge) throw new Error('Ugyldigt svar fra serveren');

      setMadplan(plan);
      setValgtDag(0);
    } catch (e: any) {
      Alert.alert('Fejl', e.message ?? 'Kunne ikke generere madplan');
    } finally {
      setLoading(false);
    }
  }

  const dag = madplan?.uge?.[valgtDag];
  const dage = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Min Madplan</Text>
          <Text style={styles.headerSub}>{user?.email}</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log ud</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Generer-knap */}
        <TouchableOpacity
          style={[styles.genererBtn, loading && styles.genererBtnDisabled]}
          onPress={genererMadplan}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.genererBtnText}>
              {madplan ? '🔄 Generer ny madplan' : '✨ Generer ugentlig madplan'}
            </Text>
          )}
        </TouchableOpacity>

        {loading && (
          <Text style={styles.loadingHint}>
            Henter tilbudsaviser og laver madplan med AI...
          </Text>
        )}

        {madplan && (
          <>
            {/* Dag-vælger */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dagScroll}
            >
              {madplan.uge.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.dagTab, valgtDag === i && styles.dagTabAktiv]}
                  onPress={() => setValgtDag(i)}
                >
                  <Text
                    style={[styles.dagTabText, valgtDag === i && styles.dagTabTextAktiv]}
                  >
                    {dage[i] ?? d.dag?.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Dag-detaljer */}
            {dag && (
              <View style={styles.dagKort}>
                <Text style={styles.dagNavn}>{dag.dag}</Text>

                <MåltidRække ikon="🌅" label="Morgenmad" tekst={dag.morgenmad} />
                <MåltidRække ikon="🥙" label="Frokost" tekst={dag.frokost} />
                <MåltidRække ikon="🍽️" label="Aftensmad" tekst={dag.aftensmad} />
                {dag.snack && <MåltidRække ikon="🍎" label="Snack" tekst={dag.snack} />}
              </View>
            )}

            {/* Indkøbsliste */}
            {madplan.indkøbsliste && madplan.indkøbsliste.length > 0 && (
              <View style={styles.sektion}>
                <Text style={styles.sektionTitel}>🛒 Indkøbsliste</Text>
                {madplan.indkøbsliste.map((vare, i) => (
                  <Text key={i} style={styles.vare}>
                    • {vare}
                  </Text>
                ))}
                {madplan.samlet_pris && (
                  <Text style={styles.pris}>Estimeret pris: {madplan.samlet_pris}</Text>
                )}
              </View>
            )}
          </>
        )}

        {!madplan && !loading && (
          <View style={styles.tom}>
            <Text style={styles.tomIkon}>🥗</Text>
            <Text style={styles.tomTekst}>
              Tryk på knappen for at generere en personlig madplan baseret på ugens tilbudsaviser.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MåltidRække({ ikon, label, tekst }: { ikon: string; label: string; tekst: string }) {
  return (
    <View style={styles.måltid}>
      <Text style={styles.måltidIkon}>{ikon}</Text>
      <View style={styles.måltidTekst}>
        <Text style={styles.måltidLabel}>{label}</Text>
        <Text style={styles.måltidBeskrivelse}>{tekst}</Text>
      </View>
    </View>
  );
}

const GRØN = '#2d5a27';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f0' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: GRØN,
    padding: 16,
    paddingTop: 8,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: '#a8d5a2', fontSize: 12, marginTop: 2 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: { color: '#fff', fontSize: 13 },
  content: { padding: 16, paddingBottom: 40 },
  genererBtn: {
    backgroundColor: GRØN,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  genererBtnDisabled: { opacity: 0.7 },
  genererBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loadingHint: { textAlign: 'center', color: '#666', fontSize: 13, marginBottom: 16 },
  dagScroll: { marginVertical: 16 },
  dagTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#dde8dc',
    marginRight: 8,
  },
  dagTabAktiv: { backgroundColor: GRØN },
  dagTabText: { color: '#555', fontWeight: '600' },
  dagTabTextAktiv: { color: '#fff' },
  dagKort: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 16,
  },
  dagNavn: { fontSize: 18, fontWeight: '700', color: GRØN, marginBottom: 14 },
  måltid: { flexDirection: 'row', marginBottom: 12 },
  måltidIkon: { fontSize: 22, marginRight: 12, marginTop: 2 },
  måltidTekst: { flex: 1 },
  måltidLabel: { fontSize: 12, color: '#888', fontWeight: '600', textTransform: 'uppercase' },
  måltidBeskrivelse: { fontSize: 15, color: '#333', marginTop: 2 },
  sektion: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sektionTitel: { fontSize: 17, fontWeight: '700', color: GRØN, marginBottom: 10 },
  vare: { fontSize: 15, color: '#444', marginBottom: 4 },
  pris: { marginTop: 10, fontSize: 14, fontWeight: '600', color: GRØN },
  tom: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
  tomIkon: { fontSize: 64, marginBottom: 16 },
  tomTekst: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
});
