import React, { useMemo, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, SectionList,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';
import ButiksPill from './ButiksPill';
import { grupperTilbudIKategorier, TilbudsGruppe, TilbudsTræf } from '../constants/tilbudSøg';
import { tilføjTilbudTilUge } from '../lib/indkøbsliste';
import KlokkeKnap from './KlokkeKnap';
import { termFraTilbud } from '../lib/watchlist';

type Props = {
  synlig: boolean;
  butikker?: string[];
  ugeNr: number;          // ugen tilbuddet lægges i (forsiden = indeværende uge)
  onClose: () => void;
};

const ALLE = '__alle__';

export default function AlleTilbudModal({ synlig, butikker, ugeNr, onClose }: Props) {
  const [valgt, setValgt] = useState<string>(ALLE);
  // Lige tilføjede varer (navn|butik) → kortets + bliver til ✓
  const [tilføjede, setTilføjede] = useState<Set<string>>(new Set());

  const grupper = useMemo<TilbudsGruppe[]>(
    () => (synlig ? grupperTilbudIKategorier(butikker) : []),
    [synlig, butikker]
  );

  // Sektioner til listen: alle kategorier, eller kun den valgte chip
  const sektioner = useMemo(() => {
    const valgte = valgt === ALLE ? grupper : grupper.filter(g => g.kategori === valgt);
    return valgte.map(g => ({ title: g.kategori, emoji: g.emoji, data: g.varer }));
  }, [grupper, valgt]);

  const antalIAlt = useMemo(() => grupper.reduce((n, g) => n + g.varer.length, 0), [grupper]);

  function nøgleFor(t: TilbudsTræf) {
    return `${t.navn}|${t.butik}`;
  }

  async function håndterTilføj(t: TilbudsTræf) {
    const nøgle = nøgleFor(t);
    if (tilføjede.has(nøgle)) return;
    // Optimistisk: marker med det samme, så knappen ikke kan dobbelt-trykkes
    setTilføjede(prev => new Set(prev).add(nøgle));
    const resultat = await tilføjTilbudTilUge({ butik: t.butik, navn: t.navn, pris: t.pris, soeg: t.soeg, maengde: t.maengde }, ugeNr);
    if (resultat === 'fejl') {
      // Rul markeringen tilbage så man kan prøve igen
      setTilføjede(prev => {
        const næste = new Set(prev);
        næste.delete(nøgle);
        return næste;
      });
    }
  }

  function luk() {
    setValgt(ALLE);
    setTilføjede(new Set());
    onClose();
  }

  return (
    <Modal visible={synlig} animationType="slide" presentationStyle="pageSheet" onRequestClose={luk}>
      <SafeAreaView style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.titel}>Ugens tilbud</Text>
            <Text style={styles.undertitel}>{antalIAlt} tilbud i dine butikker</Text>
          </View>
          <TouchableOpacity onPress={luk} style={styles.lukBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.lukTekst}>✕</Text>
          </TouchableOpacity>
        </View>

        {grupper.length === 0 ? (
          <View style={styles.tom}>
            <Text style={styles.tomEmoji}>🏷️</Text>
            <Text style={styles.tomTekst}>Ugens tilbud er ikke klar endnu</Text>
            <Text style={styles.tomSub}>Kig forbi igen senere — vi opdaterer hver uge</Text>
          </View>
        ) : (
          <>
            {/* Kategori-chips */}
            <View style={styles.chipsWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRække}>
                <Chip
                  label={`Alle ${antalIAlt}`}
                  valgt={valgt === ALLE}
                  onTryk={() => setValgt(ALLE)}
                />
                {grupper.map(g => (
                  <Chip
                    key={g.kategori}
                    label={`${g.emoji} ${g.kategori} ${g.varer.length}`}
                    valgt={valgt === g.kategori}
                    onTryk={() => setValgt(g.kategori)}
                  />
                ))}
              </ScrollView>
            </View>

            <SectionList
              sections={sektioner}
              keyExtractor={(item, i) => `${item.navn}|${item.butik}|${i}`}
              contentContainerStyle={styles.liste}
              stickySectionHeadersEnabled={false}
              showsVerticalScrollIndicator={false}
              renderSectionHeader={({ section }) =>
                valgt === ALLE ? (
                  <Text style={styles.sektionTitel}>{section.emoji} {section.title}</Text>
                ) : null
              }
              renderItem={({ item }) => {
                const erTilføjet = tilføjede.has(nøgleFor(item));
                return (
                  <View style={styles.kort}>
                    <View style={styles.kortMidt}>
                      <Text style={styles.varenavn} numberOfLines={2}>{item.navn}</Text>
                      <View style={styles.metaRække}>
                        <ButiksPill name={item.butik} />
                        {item.maengde ? <Text style={styles.maengde}>{item.maengde}</Text> : null}
                      </View>
                    </View>
                    <Text style={styles.pris}>{item.pris},-</Text>
                    <KlokkeKnap label={item.navn} term={termFraTilbud(item.navn)} størrelse={20} />
                    <TouchableOpacity
                      style={[styles.tilføjKnap, erTilføjet && styles.tilføjKnapDone]}
                      onPress={() => håndterTilføj(item)}
                      disabled={erTilføjet}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.tilføjKnapTekst}>{erTilføjet ? '✓' : '+'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function Chip({ label, valgt, onTryk }: { label: string; valgt: boolean; onTryk: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, valgt && styles.chipValgt]} onPress={onTryk}>
      <Text style={[styles.chipTekst, valgt && styles.chipTekstValgt]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.canvas },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.line, backgroundColor: Colors.paper,
  },
  titel: { fontSize: 18, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.3 },
  undertitel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 2 },
  lukBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.canvas, alignItems: 'center', justifyContent: 'center',
  },
  lukTekst: { fontSize: 14, color: Colors.inkSoft, fontFamily: 'Inter_600SemiBold' },
  chipsWrap: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.line, backgroundColor: Colors.paper },
  chipsRække: { paddingHorizontal: 20, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.line,
  },
  chipValgt: { backgroundColor: Colors.green, borderColor: Colors.green },
  chipTekst: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  chipTekstValgt: { color: '#fff' },
  liste: { padding: 20, paddingBottom: 40 },
  sektionTitel: {
    fontSize: 13, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.green,
    letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 16, marginBottom: 8,
  },
  kort: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, padding: 12, marginBottom: 8, gap: 12,
  },
  kortMidt: { flex: 1, gap: 5 },
  metaRække: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  maengde: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  varenavn: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink, lineHeight: 19 },
  pris: { fontSize: 18, fontFamily: 'BricolageGrotesque_800ExtraBold', color: Colors.red, letterSpacing: -0.36 },
  tilføjKnap: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.green,
    alignItems: 'center', justifyContent: 'center', marginLeft: 4,
  },
  tilføjKnapDone: { backgroundColor: Colors.greenBright },
  tilføjKnapTekst: { fontSize: 19, color: '#fff', fontFamily: 'Inter_700Bold', marginTop: -2 },
  tom: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  tomEmoji: { fontSize: 48, marginBottom: 14 },
  tomTekst: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, marginBottom: 6 },
  tomSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textAlign: 'center', lineHeight: 19 },
});
