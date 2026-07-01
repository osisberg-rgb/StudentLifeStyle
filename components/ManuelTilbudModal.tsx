// Admin-modal til MANUEL indtastning af ugens tilbud (uden AI/PDF). Vælg butik
// + uge, indtast varer (navn, mængde, pris) og søgeord pr. vare. Søgeord auto-
// udfyldes fra varenavnet men kan rettes — uden et gyldigt søgeord er varen
// usynlig for prismotoren. Gem erstatter alle eksisterende tilbud for butik+uge.
// Kun synlig for admin (gaten ligger i ProfilScreen). Se lib/manuelTilbud.ts.
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Alert, Modal,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';
import Chip from './Chip';
import {
  ALLE_BUTIK_VALG, aktuelUge, gætSoeg, gemTilbudManuelt, SOEGEORD_VOCAB,
  type ButikValg, type ManuelVare,
} from '../lib/manuelTilbud';

type Props = { synlig: boolean; onLuk: () => void };

const TOM_VARE: ManuelVare = { navn: '', maengde: '', pris: '', soeg: [] };

export default function ManuelTilbudModal({ synlig, onLuk }: Props) {
  const [butik, setButik] = useState<ButikValg>('Netto');
  const [uge, setUge] = useState(String(aktuelUge()));
  const [varer, setVarer] = useState<ManuelVare[]>([{ ...TOM_VARE }]);
  const [sender, setSender] = useState(false);
  // Søgeord-vælger: hvilken række er åben + fritekst-filter.
  const [pickerRække, setPickerRække] = useState<number | null>(null);
  const [pickerFilter, setPickerFilter] = useState('');

  useEffect(() => {
    if (!synlig) {
      setButik('Netto');
      setUge(String(aktuelUge()));
      setVarer([{ ...TOM_VARE }]);
      setSender(false);
      setPickerRække(null);
      setPickerFilter('');
    }
  }, [synlig]);

  function justérUge(delta: number) {
    setUge(prev => {
      const n = (parseInt(prev, 10) || aktuelUge()) + delta;
      return String(Math.min(53, Math.max(1, n)));
    });
  }

  function opdaterVare(i: number, patch: Partial<ManuelVare>) {
    setVarer(prev => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }

  // Auto-udfyld søgeord fra navnet når feltet forlades — kun hvis brugeren
  // ikke allerede selv har sat nogen (så vi ikke overskriver en rettelse).
  function vedNavnBlur(i: number) {
    setVarer(prev => prev.map((v, idx) => {
      if (idx !== i || v.soeg.length > 0 || !v.navn.trim()) return v;
      return { ...v, soeg: gætSoeg(v.navn) };
    }));
  }

  function fjernSoeg(i: number, ord: string) {
    opdaterVare(i, { soeg: varer[i].soeg.filter(s => s !== ord) });
  }

  function tilføjSoeg(i: number, ord: string) {
    if (varer[i].soeg.includes(ord)) return;
    opdaterVare(i, { soeg: [...varer[i].soeg, ord] });
  }

  function tilføjVare() {
    setVarer(prev => [...prev, { ...TOM_VARE }]);
  }

  function fjernVare(i: number) {
    setVarer(prev => (prev.length === 1 ? [{ ...TOM_VARE }] : prev.filter((_, idx) => idx !== i)));
    if (pickerRække === i) setPickerRække(null);
  }

  async function send() {
    const ugeNr = parseInt(uge, 10);
    if (!ugeNr) { Alert.alert('Hov', 'Vælg en gyldig uge.'); return; }
    const gyldige = varer.filter(v => v.navn.trim() && parseFloat(v.pris.replace(',', '.')) > 0);
    if (gyldige.length === 0) { Alert.alert('Hov', 'Tilføj mindst én vare med navn og pris.'); return; }
    const udenSoeg = gyldige.filter(v => v.soeg.length === 0).length;
    if (udenSoeg > 0) {
      const fortsæt = await new Promise<boolean>(res => {
        Alert.alert(
          'Varer uden søgeord',
          `${udenSoeg} vare(r) har intet søgeord og bliver usynlige for prismotoren. Gem alligevel?`,
          [
            { text: 'Annullér', style: 'cancel', onPress: () => res(false) },
            { text: 'Gem alligevel', style: 'destructive', onPress: () => res(true) },
          ],
        );
      });
      if (!fortsæt) return;
    }

    setSender(true);
    const r = await gemTilbudManuelt(butik, ugeNr, varer);
    setSender(false);
    if (!r.ok) { Alert.alert('Fejl', r.fejl ?? 'Ukendt fejl'); return; }
    Alert.alert('Gemt', `${r.antal} tilbud gemt for ${butik} uge ${ugeNr}.`, [
      { text: 'OK', onPress: onLuk },
    ]);
  }

  const pickerValg = pickerRække === null ? [] : SOEGEORD_VOCAB
    .filter(o => !varer[pickerRække].soeg.includes(o))
    .filter(o => o.toLowerCase().includes(pickerFilter.trim().toLowerCase()))
    .slice(0, 40);

  return (
    <Modal visible={synlig} animationType="slide" presentationStyle="pageSheet" onRequestClose={onLuk}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.titel}>Indtast tilbud</Text>
          <TouchableOpacity onPress={onLuk}><Text style={styles.luk}>Færdig</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.sub}>
            Skriv ugens tilbud selv. Gem erstatter ALLE eksisterende tilbud for den valgte butik og uge.
          </Text>

          {/* Butik */}
          <Text style={styles.feltLabel}>Butik</Text>
          <View style={styles.chips}>
            {ALLE_BUTIK_VALG.map(b => (
              <Chip key={b} label={b} active={butik === b} onPress={() => setButik(b)} />
            ))}
          </View>

          {/* Uge */}
          <View style={styles.ugeRække}>
            <Text style={styles.feltLabel}>Uge</Text>
            <View style={styles.ugeStepper}>
              <TouchableOpacity style={styles.ugeKnap} onPress={() => justérUge(-1)} activeOpacity={0.7}>
                <Text style={styles.ugeKnapTekst}>−</Text>
              </TouchableOpacity>
              <TextInput style={styles.ugeInput} value={uge} onChangeText={setUge} keyboardType="number-pad" maxLength={2} />
              <TouchableOpacity style={styles.ugeKnap} onPress={() => justérUge(1)} activeOpacity={0.7}>
                <Text style={styles.ugeKnapTekst}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Varer */}
          <Text style={[styles.feltLabel, { marginTop: 8 }]}>Varer</Text>
          {varer.map((v, i) => (
            <View key={i} style={styles.vareKort}>
              <View style={styles.vareHeader}>
                <Text style={styles.vareNr}>#{i + 1}</Text>
                <TouchableOpacity onPress={() => fjernVare(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.fjern}>✕</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Varenavn (fx Coca-Cola 1,5 l)"
                placeholderTextColor={Colors.inkSoft}
                value={v.navn}
                onChangeText={t => opdaterVare(i, { navn: t })}
                onBlur={() => vedNavnBlur(i)}
              />
              <View style={styles.række2}>
                <TextInput
                  style={[styles.input, styles.halv]}
                  placeholder="Mængde (valgfri)"
                  placeholderTextColor={Colors.inkSoft}
                  value={v.maengde}
                  onChangeText={t => opdaterVare(i, { maengde: t })}
                />
                <TextInput
                  style={[styles.input, styles.halv]}
                  placeholder="Pris (kr)"
                  placeholderTextColor={Colors.inkSoft}
                  value={v.pris}
                  onChangeText={t => opdaterVare(i, { pris: t })}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Søgeord */}
              <View style={styles.soegRække}>
                {v.soeg.map(ord => (
                  <TouchableOpacity key={ord} style={styles.soegChip} onPress={() => fjernSoeg(i, ord)} activeOpacity={0.7}>
                    <Text style={styles.soegChipTekst}>{ord}</Text>
                    <Text style={styles.soegChipX}>✕</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.tilføjSoegChip}
                  onPress={() => { setPickerRække(pickerRække === i ? null : i); setPickerFilter(''); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tilføjSoegTekst}>＋ søgeord</Text>
                </TouchableOpacity>
              </View>
              {v.soeg.length === 0 && (
                <Text style={styles.advarsel}>⚠ Uden søgeord er varen usynlig for prismotoren.</Text>
              )}

              {/* Søgeord-vælger for denne række */}
              {pickerRække === i && (
                <View style={styles.picker}>
                  <TextInput
                    style={styles.pickerInput}
                    placeholder="Søg i ordforråd…"
                    placeholderTextColor={Colors.inkSoft}
                    value={pickerFilter}
                    onChangeText={setPickerFilter}
                    autoFocus
                  />
                  <View style={styles.pickerChips}>
                    {pickerValg.map(ord => (
                      <Chip key={ord} label={ord} active={false} onPress={() => tilføjSoeg(i, ord)} />
                    ))}
                    {pickerValg.length === 0 && (
                      <Text style={styles.pickerTom}>Ingen match i ordforrådet.</Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.tilføjVareKnap} onPress={tilføjVare} activeOpacity={0.85}>
            <Text style={styles.tilføjVareTekst}>＋ Tilføj vare</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.gemKnap, sender && { opacity: 0.4 }]}
            onPress={send}
            disabled={sender}
          >
            <Text style={styles.gemTekst}>{sender ? 'Gemmer …' : 'Gem tilbud'}</Text>
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
  feltLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  ugeRække: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 },
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
  vareKort: {
    backgroundColor: Colors.card, borderRadius: Radii.card, borderWidth: 1, borderColor: Colors.line,
    padding: 14, marginBottom: 12,
  },
  vareHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  vareNr: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.8 },
  fjern: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.inkSoft },
  input: {
    backgroundColor: Colors.paper, borderRadius: Radii.btn, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: 'Inter_400Regular',
    color: Colors.ink, marginBottom: 8,
  },
  række2: { flexDirection: 'row', gap: 8 },
  halv: { flex: 1 },
  soegRække: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, alignItems: 'center' },
  soegChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.greenSoft,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8,
  },
  soegChipTekst: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.green },
  soegChipX: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.green, marginLeft: 6 },
  tilføjSoegChip: {
    borderRadius: 999, borderWidth: 1.5, borderColor: Colors.line, borderStyle: 'dashed',
    paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8,
  },
  tilføjSoegTekst: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  advarsel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.red, marginTop: 2 },
  picker: {
    marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.line,
  },
  pickerInput: {
    backgroundColor: Colors.paper, borderRadius: Radii.btn, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: 'Inter_400Regular',
    color: Colors.ink, marginBottom: 10,
  },
  pickerChips: { flexDirection: 'row', flexWrap: 'wrap' },
  pickerTom: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  tilføjVareKnap: {
    backgroundColor: Colors.greenSoft, borderRadius: Radii.btn, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
  },
  tilføjVareTekst: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.green },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.line },
  gemKnap: { backgroundColor: Colors.green, borderRadius: Radii.btn, padding: 15, alignItems: 'center' },
  gemTekst: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
