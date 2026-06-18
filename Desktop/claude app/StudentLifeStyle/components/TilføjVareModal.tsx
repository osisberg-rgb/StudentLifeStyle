import React, { useMemo, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, SafeAreaView, FlatList,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';
import ButiksPill from './ButiksPill';
import { søgTilbud, alleTilbud, TILBUD_KATEGORIER, TilbudsTræf, TilbudsKategori } from '../constants/tilbudSøg';

type Props = {
  synlig: boolean;
  butikker?: string[];          // brugerens valgte butikker (tom = alle)
  onTilføj: (træf: TilbudsTræf) => void;
  onTilføjFri: (navn: string) => void;   // vare der ikke er på tilbud
  onClose: () => void;
};

export default function TilføjVareModal({ synlig, butikker, onTilføj, onTilføjFri, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [aktivKat, setAktivKat] = useState<TilbudsKategori | null>(null);
  const [visAlle, setVisAlle] = useState(false);
  // Lige tilføjede varer (navn|butik) — så kortet kort viser "Tilføjet ✓"
  const [tilføjede, setTilføjede] = useState<Set<string>>(new Set());

  const resultater = useMemo(() => {
    const fritekst = query.trim();
    if (fritekst.length >= 2) return søgTilbud([fritekst], butikker);
    if (aktivKat) return søgTilbud(aktivKat.termer, butikker);
    if (visAlle) return alleTilbud(butikker);
    return [];
  }, [query, aktivKat, visAlle, butikker]);

  function vælgAlle() {
    setQuery('');
    setAktivKat(null);
    setVisAlle(v => !v);
  }

  function vælgKategori(kat: TilbudsKategori) {
    setQuery('');
    setVisAlle(false);
    setAktivKat(prev => (prev?.label === kat.label ? null : kat));
  }

  function håndterTilføj(træf: TilbudsTræf) {
    onTilføj(træf);
    const nøgle = `${træf.navn}|${træf.butik}`;
    setTilføjede(prev => new Set(prev).add(nøgle));
  }

  function håndterFri(navn: string) {
    onTilføjFri(navn);
    setTilføjede(prev => new Set(prev).add(`fri|${navn}`));
  }

  function luk() {
    setQuery('');
    setAktivKat(null);
    setVisAlle(false);
    setTilføjede(new Set());
    onClose();
  }

  const harSøgt = query.trim().length >= 2 || !!aktivKat || visAlle;

  return (
    <Modal visible={synlig} animationType="slide" presentationStyle="pageSheet" onRequestClose={luk}>
      <SafeAreaView style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.titel}>Tilføj vare på tilbud</Text>
          <TouchableOpacity onPress={luk} style={styles.lukBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.lukTekst}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Søgefelt */}
        <View style={styles.søgeRække}>
          <Text style={styles.søgeIkon}>🔍</Text>
          <TextInput
            style={styles.søgeInput}
            placeholder="Søg vare, fx kylling, ost, laks…"
            placeholderTextColor={Colors.inkSoft}
            value={query}
            onChangeText={t => { setQuery(t); if (t.trim().length >= 2) { setAktivKat(null); setVisAlle(false); } }}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.ryd}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tilføj præcis det man har skrevet — også når der findes tilbud,
            så man kan få fx "skiveost" der ikke er på tilbudslisten */}
        {query.trim().length >= 2 && (() => {
          const navn = query.trim();
          const tilføjet = tilføjede.has(`fri|${navn}`);
          return (
            <TouchableOpacity
              style={[styles.friTop, tilføjet && styles.friTopDone]}
              onPress={() => håndterFri(navn)}
              disabled={tilføjet}
              activeOpacity={0.8}
            >
              <Text style={styles.friTopTekst}>
                {tilføjet ? `✓ "${navn}" tilføjet` : `+ Tilføj "${navn}" til indkøbsliste`}
              </Text>
            </TouchableOpacity>
          );
        })()}

        {/* Kategori-chips */}
        <View style={styles.chipsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRække}>
            <TouchableOpacity
              style={[styles.chip, visAlle && styles.chipValgt]}
              onPress={vælgAlle}
            >
              <Text style={[styles.chipTekst, visAlle && styles.chipTekstValgt]}>Alle</Text>
            </TouchableOpacity>
            {TILBUD_KATEGORIER.map(kat => {
              const valgt = aktivKat?.label === kat.label;
              return (
                <TouchableOpacity
                  key={kat.label}
                  style={[styles.chip, valgt && styles.chipValgt]}
                  onPress={() => vælgKategori(kat)}
                >
                  <Text style={[styles.chipTekst, valgt && styles.chipTekstValgt]}>
                    {kat.emoji} {kat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Resultater */}
        {!harSøgt ? (
          <View style={styles.tom}>
            <Text style={styles.tomEmoji}>🏷️</Text>
            <Text style={styles.tomTekst}>Søg eller vælg en kategori</Text>
            <Text style={styles.tomSub}>Vi viser kun varer der er på tilbud i denne uge</Text>
          </View>
        ) : resultater.length === 0 ? (
          <View style={styles.tom}>
            <Text style={styles.tomEmoji}>🤷</Text>
            <Text style={styles.tomTekst}>Ingen tilbud fundet</Text>
            <Text style={styles.tomSub}>
              {query.trim().length >= 2
                ? 'Den er ikke på tilbud denne uge — brug knappen øverst for at tilføje den alligevel'
                : 'Prøv et andet ord eller en anden kategori'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={resultater}
            keyExtractor={(t, i) => `${t.navn}|${t.butik}|${i}`}
            contentContainerStyle={styles.liste}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const erTilføjet = tilføjede.has(`${item.navn}|${item.butik}`);
              return (
                <TouchableOpacity
                  style={styles.kort}
                  onPress={() => håndterTilføj(item)}
                  disabled={erTilføjet}
                  activeOpacity={0.7}
                >
                  <View style={styles.kortVenstre}>
                    <ButiksPill name={item.butik} />
                    <Text style={styles.varenavn} numberOfLines={2}>{item.navn}</Text>
                  </View>
                  <View style={styles.kortHøjre}>
                    <Text style={styles.pris}>{item.pris},-</Text>
                    <View style={[styles.tilføjKnap, erTilføjet && styles.tilføjKnapDone]}>
                      <Text style={styles.tilføjKnapTekst}>{erTilføjet ? '✓' : '+'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
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
  lukBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.canvas, alignItems: 'center', justifyContent: 'center',
  },
  lukTekst: { fontSize: 14, color: Colors.inkSoft, fontFamily: 'Inter_600SemiBold' },
  søgeRække: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 16, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: Colors.card, borderRadius: Radii.btn,
    borderWidth: 1, borderColor: Colors.line,
  },
  søgeIkon: { fontSize: 15 },
  søgeInput: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.ink, padding: 0 },
  ryd: { fontSize: 13, color: Colors.inkSoft, paddingHorizontal: 4 },
  chipsWrap: { marginTop: 14 },
  chipsRække: { paddingHorizontal: 20, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.line,
  },
  chipValgt: { backgroundColor: Colors.green, borderColor: Colors.green },
  chipTekst: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  chipTekstValgt: { color: '#fff' },
  liste: { padding: 20, gap: 10 },
  kort: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, padding: 14, gap: 12,
  },
  kortVenstre: { flex: 1, gap: 6 },
  varenavn: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink, lineHeight: 19 },
  kortHøjre: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pris: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.red },
  tilføjKnap: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.green,
    alignItems: 'center', justifyContent: 'center',
  },
  tilføjKnapDone: { backgroundColor: Colors.greenBright },
  tilføjKnapTekst: { fontSize: 18, color: '#fff', fontFamily: 'Inter_700Bold', marginTop: -1 },
  tom: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  tomEmoji: { fontSize: 48, marginBottom: 14 },
  tomTekst: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, marginBottom: 6 },
  tomSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textAlign: 'center', lineHeight: 19 },
  friTop: {
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: Colors.green, borderRadius: Radii.btn,
    paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center',
  },
  friTopDone: { backgroundColor: Colors.greenBright },
  friTopTekst: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' },
});
