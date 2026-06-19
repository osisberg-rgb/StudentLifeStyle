import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, SafeAreaView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';
import { KATEGORIER } from '../constants/kategorier';
import { opdaterBrugerOpskrift, gemBrugerOpskrift } from '../lib/brugerOpskrifter';
import type { Opskrift, OpskriftIngrediens } from '../types/opskrift';

// Kun suppe/salat/broed kan tagges manuelt — "aftensmad" er bare fraværet af
// de tre (samme regel som vælgeren bruger), så den vises ikke som en knap.
const TAG_VALG = KATEGORIER.filter(k => k.id !== 'aftensmad');
const KOED_VALG = ['Oksekød', 'Kylling', 'Svinekød', 'Fisk', 'Vegetar', 'Alt'];

type Props = {
  // Sat = rediger eksisterende. For en NY opskrift sendes et tomt skabelon-objekt
  // sammen med erNy=true, så samme formular bruges til at skrive en ind selv.
  opskrift: Opskrift | null;
  erNy?: boolean;
  onLuk: () => void;
  // Får den gemte/opdaterede opskrift, så kalderen fx kan lægge en NY opskrift
  // i en aktiv kogebog. Kaldere der ikke bruger den, kan bare ignorere argumentet.
  onGemt: (opskrift: Opskrift) => void;
};

export default function RedigerOpskriftModal({ opskrift, erNy, onLuk, onGemt }: Props) {
  const [navn, setNavn] = useState('');
  const [koed, setKoed] = useState('Alt');
  const [portioner, setPortioner] = useState(4);
  const [minutter, setMinutter] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [ingredienser, setIngredienser] = useState<OpskriftIngrediens[]>([]);
  const [trin, setTrin] = useState<string[]>([]);
  const [gemmer, setGemmer] = useState(false);

  // Seed felterne hver gang en ny opskrift åbnes til redigering/oprettelse
  useEffect(() => {
    if (!opskrift) return;
    setNavn(opskrift.navn ?? '');
    setKoed(opskrift.koed || 'Alt');
    setPortioner(opskrift.portioner || 4);
    setMinutter(opskrift.minutter != null ? String(opskrift.minutter) : '');
    setTags((opskrift.kategorier ?? []).filter(k => TAG_VALG.some(t => t.id === k)));
    // Klon ingredienser, så vi kan redigere uden at røre storens objekt
    setIngredienser((opskrift.ingredienser ?? []).map(i => ({ ...i })));
    setTrin([...(opskrift.fremgangsmaade ?? [])]);
    setGemmer(false);
  }, [opskrift?.id, erNy]);

  if (!opskrift) return null;

  function toggleTag(id: string) {
    setTags(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function sætIngrediens(idx: number, felt: 'navn' | 'maengde', værdi: string) {
    setIngredienser(prev => prev.map((ing, i) => i === idx ? { ...ing, [felt]: værdi } : ing));
  }
  function fjernIngrediens(idx: number) {
    setIngredienser(prev => prev.filter((_, i) => i !== idx));
  }
  function tilføjIngrediens() {
    setIngredienser(prev => [...prev, { navn: '', maengde: '', soeg: [] }]);
  }

  function sætTrin(idx: number, værdi: string) {
    setTrin(prev => prev.map((t, i) => i === idx ? værdi : t));
  }
  function fjernTrin(idx: number) {
    setTrin(prev => prev.filter((_, i) => i !== idx));
  }
  function tilføjTrin() {
    setTrin(prev => [...prev, '']);
  }

  async function gem() {
    const rentNavn = navn.trim();
    if (!rentNavn) {
      Alert.alert('Mangler navn', 'Giv opskriften et navn.');
      return;
    }
    // Drop tomme ingredienser/trin; behold de eksisterende felter (soeg m.m.).
    // Manglende søgeord udfyldes centralt i gemBrugerOpskrift/opdaterBrugerOpskrift
    // (gætSoeg), så frit skrevne varer bliver synlige for pris-/tilbuds-motoren.
    const reneIngredienser = ingredienser
      .map(i => ({ ...i, navn: i.navn.trim(), maengde: i.maengde.trim() }))
      .filter(i => i.navn.length > 0);
    const reneTrin = trin.map(t => t.trim()).filter(t => t.length > 0);
    const minTal = minutter.trim() ? parseInt(minutter.trim(), 10) : null;
    const reneMinutter = minTal != null && !isNaN(minTal) ? minTal : null;

    setGemmer(true);
    const resultat = erNy
      ? await gemBrugerOpskrift({
          navn: rentNavn,
          koed,
          portioner: Math.max(1, portioner),
          minutter: reneMinutter ?? undefined,
          kategorier: tags,
          ingredienser: reneIngredienser,
          fremgangsmaade: reneTrin,
        })
      : await opdaterBrugerOpskrift(opskrift!.id, {
          navn: rentNavn,
          koed,
          portioner: Math.max(1, portioner),
          minutter: reneMinutter,
          kategorier: tags,
          ingredienser: reneIngredienser,
          fremgangsmaade: reneTrin,
        });
    setGemmer(false);

    if (!resultat) {
      Alert.alert('Fejl', erNy ? 'Kunne ikke gemme opskriften. Er du logget ind?' : 'Kunne ikke gemme ændringerne. Prøv igen.');
      return;
    }
    onGemt(resultat);
  }

  return (
    <Modal visible={!!opskrift} animationType="slide" presentationStyle="pageSheet" onRequestClose={onLuk}>
      <SafeAreaView style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onLuk}>
            <Text style={styles.annuller}>Annuller</Text>
          </TouchableOpacity>
          <Text style={styles.titel}>{erNy ? 'Ny opskrift' : 'Rediger opskrift'}</Text>
          <View style={{ minWidth: 70 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.indhold} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Navn */}
            <Text style={styles.label}>Navn</Text>
            <TextInput
              style={styles.input}
              value={navn}
              onChangeText={setNavn}
              placeholder="Fx Cremet kylling i karry"
              placeholderTextColor={Colors.inkSoft}
            />

            {/* Kødtype */}
            <Text style={styles.label}>Kødtype</Text>
            <View style={styles.tagRække}>
              {KOED_VALG.map(k => {
                const aktiv = koed === k;
                return (
                  <TouchableOpacity
                    key={k}
                    style={[styles.tag, aktiv && styles.tagAktiv]}
                    onPress={() => setKoed(k)}
                  >
                    <Text style={[styles.tagTekst, aktiv && styles.tagTekstAktiv]}>{k}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Portioner + minutter */}
            <View style={styles.række}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Portioner</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepKnap, portioner <= 1 && styles.stepKnapDisabled]}
                    onPress={() => setPortioner(p => Math.max(1, p - 1))}
                    disabled={portioner <= 1}
                  >
                    <Text style={styles.stepTekst}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepTal}>{portioner}</Text>
                  <TouchableOpacity style={styles.stepKnap} onPress={() => setPortioner(p => p + 1)}>
                    <Text style={styles.stepTekst}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Minutter</Text>
                <TextInput
                  style={styles.input}
                  value={minutter}
                  onChangeText={t => setMinutter(t.replace(/[^0-9]/g, ''))}
                  placeholder="Fx 25"
                  placeholderTextColor={Colors.inkSoft}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Kategori-tags */}
            <Text style={styles.label}>Vis under</Text>
            <View style={styles.tagRække}>
              {TAG_VALG.map(t => {
                const aktiv = tags.includes(t.id);
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.tag, aktiv && styles.tagAktiv]}
                    onPress={() => toggleTag(t.id)}
                  >
                    <Text style={[styles.tagTekst, aktiv && styles.tagTekstAktiv]}>{t.emoji} {t.navn}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.hjælp}>Vælg intet = vises under "Aftensmad".</Text>

            {/* Ingredienser */}
            <Text style={[styles.label, { marginTop: 22 }]}>Ingredienser</Text>
            {ingredienser.map((ing, idx) => (
              <View key={idx} style={styles.ingRække}>
                <TextInput
                  style={[styles.input, styles.ingNavn]}
                  value={ing.navn}
                  onChangeText={t => sætIngrediens(idx, 'navn', t)}
                  placeholder="Vare"
                  placeholderTextColor={Colors.inkSoft}
                />
                <TextInput
                  style={[styles.input, styles.ingMaengde]}
                  value={ing.maengde}
                  onChangeText={t => sætIngrediens(idx, 'maengde', t)}
                  placeholder="Mængde"
                  placeholderTextColor={Colors.inkSoft}
                />
                <TouchableOpacity style={styles.fjernKnap} onPress={() => fjernIngrediens(idx)}>
                  <Text style={styles.fjernTekst}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.tilføjRække} onPress={tilføjIngrediens}>
              <Text style={styles.tilføjTekst}>+ Tilføj ingrediens</Text>
            </TouchableOpacity>

            {/* Fremgangsmåde */}
            <Text style={[styles.label, { marginTop: 22 }]}>Fremgangsmåde</Text>
            {trin.map((t, idx) => (
              <View key={idx} style={styles.trinRække}>
                <View style={styles.trinNr}>
                  <Text style={styles.trinNrTekst}>{idx + 1}</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.trinInput]}
                  value={t}
                  onChangeText={v => sætTrin(idx, v)}
                  placeholder="Beskriv trinnet"
                  placeholderTextColor={Colors.inkSoft}
                  multiline
                />
                <TouchableOpacity style={styles.fjernKnap} onPress={() => fjernTrin(idx)}>
                  <Text style={styles.fjernTekst}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.tilføjRække} onPress={tilføjTrin}>
              <Text style={styles.tilføjTekst}>+ Tilføj trin</Text>
            </TouchableOpacity>

            <View style={{ height: 24 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Bund */}
        <View style={styles.bund}>
          <TouchableOpacity
            style={[styles.gemKnap, gemmer && styles.gemKnapDisabled]}
            onPress={gem}
            disabled={gemmer}
          >
            {gemmer
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.gemKnapTekst}>Gem ændringer</Text>}
          </TouchableOpacity>
        </View>
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
  annuller: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, minWidth: 70 },
  titel: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink },
  indhold: { padding: 20, paddingBottom: 16 },

  label: {
    fontSize: 11, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.green,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 16,
  },
  hjælp: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 6 },
  input: {
    backgroundColor: Colors.card, borderRadius: Radii.btn,
    borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.ink,
  },
  række: { flexDirection: 'row', gap: 14 },

  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.card, borderRadius: Radii.btn,
    borderWidth: 1, borderColor: Colors.line, paddingHorizontal: 6, paddingVertical: 4,
  },
  stepKnap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.greenSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  stepKnapDisabled: { opacity: 0.4 },
  stepTekst: { fontSize: 20, fontFamily: 'Inter_700Bold', color: Colors.green },
  stepTal: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.ink },

  tagRække: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: Colors.card, borderRadius: 999,
    borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  tagAktiv: { backgroundColor: Colors.greenSoft, borderColor: Colors.green },
  tagTekst: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  tagTekstAktiv: { color: Colors.green },

  ingRække: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  ingNavn: { flex: 1.4 },
  ingMaengde: { flex: 1 },
  fjernKnap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.redSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  fjernTekst: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.red },
  tilføjRække: { paddingVertical: 10, alignItems: 'center' },
  tilføjTekst: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.green },

  trinRække: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  trinNr: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.greenSoft,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  trinNrTekst: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.green },
  trinInput: { flex: 1, minHeight: 44, textAlignVertical: 'top' },

  bund: {
    padding: 20, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: Colors.paper,
  },
  gemKnap: {
    backgroundColor: Colors.green, borderRadius: Radii.btn,
    padding: 16, alignItems: 'center',
  },
  gemKnapDisabled: { backgroundColor: Colors.line },
  gemKnapTekst: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
