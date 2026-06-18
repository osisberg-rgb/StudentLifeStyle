import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';
import { MINE_VARER_VALG } from '../constants/mineVarer';
import { sætMineVarer } from '../lib/mineVarer';

type Props = {
  synlig: boolean;
  valgte: string[];
  onGemt: (labels: string[]) => void;
  onLuk: () => void;
};

export default function MineVarerModal({ synlig, valgte, onGemt, onLuk }: Props) {
  const [labels, setLabels] = useState<string[]>(valgte);
  const [gemmer, setGemmer] = useState(false);

  useEffect(() => { if (synlig) setLabels(valgte); }, [synlig]);

  function toggle(l: string) {
    setLabels(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  }
  async function gem() {
    setGemmer(true);
    await sætMineVarer(labels);
    setGemmer(false);
    onGemt(labels);
  }

  return (
    <Modal visible={synlig} animationType="slide" presentationStyle="pageSheet" onRequestClose={onLuk}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onLuk}><Text style={styles.annuller}>Annuller</Text></TouchableOpacity>
          <Text style={styles.titel}>Mine varer</Text>
          <View style={{ minWidth: 70 }} />
        </View>
        <Text style={styles.sub}>
          Vælg de varer du gerne vil holde øje med. De vises øverst i "Tilbud til dig" på forsiden, når de er på tilbud i dine butikker.
        </Text>
        <ScrollView contentContainerStyle={styles.indhold} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {MINE_VARER_VALG.map(v => {
              const aktiv = labels.includes(v.label);
              return (
                <TouchableOpacity
                  key={v.label}
                  style={[styles.chip, aktiv && styles.chipAktiv]}
                  onPress={() => toggle(v.label)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.chipEmoji}>{v.emoji}</Text>
                  <Text style={[styles.chipTekst, aktiv && styles.chipTekstAktiv]}>{v.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        <View style={styles.bund}>
          <TouchableOpacity style={[styles.gemKnap, gemmer && styles.gemDisabled]} onPress={gem} disabled={gemmer}>
            {gemmer ? <ActivityIndicator color="#fff" /> : <Text style={styles.gemTekst}>Gem{labels.length ? ` (${labels.length})` : ''}</Text>}
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
  sub: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, lineHeight: 20, margin: 20, marginBottom: 8 },
  indhold: { paddingHorizontal: 20, paddingBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.card, borderRadius: 999,
    borderWidth: 1.5, borderColor: Colors.line,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  chipAktiv: { backgroundColor: Colors.greenSoft, borderColor: Colors.green },
  chipEmoji: { fontSize: 17 },
  chipTekst: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  chipTekstAktiv: { color: Colors.green },
  bund: { padding: 20, paddingBottom: 32, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: Colors.paper },
  gemKnap: { backgroundColor: Colors.green, borderRadius: Radii.btn, padding: 16, alignItems: 'center' },
  gemDisabled: { backgroundColor: Colors.line },
  gemTekst: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
