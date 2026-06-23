// Foto-bulk: importér flere opskrifter fra sidefotos af en fysisk kogebog.
// Ét billede = én opskrift (klient-side løkke over den eksisterende edge-
// funktion importer-opskrift). Alle gemte opskrifter lægges i én kogebog.
// Finredigering pr. ingrediens sker bagefter via "Rediger opskrift".
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, ActivityIndicator, Image, Alert,
} from 'react-native';
import type * as ImagePickerTyper from 'expo-image-picker';
import { Colors, Radii } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { gemBrugerOpskrift } from '../lib/brugerOpskrifter';
import { kogebøger, opretKogebog, sætKogebogForOpskrift } from '../lib/kogebøger';
import type { OpskriftIngrediens } from '../types/opskrift';
import NavngivModal from './NavngivModal';

const MAKS_BILLEDER = 10;

type ImporteretRet = {
  lokaltBillede: string;
  status: 'venter' | 'henter' | 'ok' | 'fejl';
  inkluder: boolean;
  navn: string;
  koed: string;
  portioner: number;
  minutter?: number;
  kategorier?: string[];
  billede_url?: string | null;
  ingredienser: OpskriftIngrediens[];
  fremgangsmaade: string[];
  lavSikkerhed: number;
};

type Props = {
  synlig: boolean;
  onLuk: () => void;
  onFærdig: () => void;   // kald efter at opskrifter er gemt, så vælgeren gen-læser
};

export default function ImportKogebogModal({ synlig, onLuk, onFærdig }: Props) {
  const [kogebogId, setKogebogId] = useState<string | null>(null);
  const [navngivÅben, setNavngivÅben] = useState(false);
  const [retter, setRetter] = useState<ImporteretRet[]>([]);
  const [kører, setKører] = useState(false);
  const [fremgang, setFremgang] = useState<{ nu: number; i_alt: number } | null>(null);
  const [gemmer, setGemmer] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);

  useEffect(() => {
    if (!synlig) {
      setKogebogId(null); setNavngivÅben(false); setRetter([]);
      setKører(false); setFremgang(null); setGemmer(false); setFejl(null);
    }
  }, [synlig]);

  const liste = kogebøger();
  const målNavn = liste.find(k => k.id === kogebogId)?.navn ?? null;

  async function opret(navn: string) {
    setNavngivÅben(false);
    const k = await opretKogebog(navn);
    if (!k) { Alert.alert('Fejl', 'Kunne ikke oprette kogebogen. Er du logget ind?'); return; }
    setKogebogId(k.id);
  }

  // Vælg flere billeder og kør dem sekventielt gennem importer-opskrift.
  async function vælgOgImportér() {
    setFejl(null);
    try {
      const ImagePicker = await import('expo-image-picker');
      const tilladelse = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!tilladelse.granted) {
        Alert.alert('Adgang mangler', 'Giv adgang til dine billeder for at vælge sidefotos.');
        return;
      }
      const valg: ImagePickerTyper.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: MAKS_BILLEDER,
      };
      const res = await ImagePicker.launchImageLibraryAsync(valg);
      if (res.canceled || !res.assets?.length) return;

      const assets = res.assets.slice(0, MAKS_BILLEDER);
      const ImageManipulator = await import('expo-image-manipulator');

      // Init liste med pladsholdere, så brugeren ser fremgang
      const init: ImporteretRet[] = assets.map(a => ({
        lokaltBillede: a.uri, status: 'venter', inkluder: true,
        navn: '', koed: 'Alt', portioner: 4, ingredienser: [], fremgangsmaade: [], lavSikkerhed: 0,
      }));
      setRetter(init);
      setKører(true);

      for (let i = 0; i < assets.length; i++) {
        setFremgang({ nu: i + 1, i_alt: assets.length });
        setRetter(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'henter' } : r));
        try {
          const lille = await ImageManipulator.manipulateAsync(
            assets[i].uri,
            [{ resize: { width: 1024 } }],
            { compress: 0.6, base64: true, format: ImageManipulator.SaveFormat.JPEG },
          );
          if (!lille.base64) throw new Error('tomt billede');
          const { data: svar, error } = await supabase.functions.invoke('importer-opskrift', {
            body: { billede: `data:image/jpeg;base64,${lille.base64}` },
          });
          if (error || !svar || svar.error) throw new Error(svar?.error ?? 'læsefejl');
          const ingr: OpskriftIngrediens[] = Array.isArray(svar.ingredienser) ? svar.ingredienser : [];
          setRetter(prev => prev.map((r, idx) => idx === i ? {
            ...r, status: 'ok',
            navn: svar.navn ?? 'Importeret opskrift',
            koed: svar.koed ?? 'Alt',
            portioner: svar.portioner ?? 4,
            minutter: svar.minutter,
            kategorier: svar.kategorier ?? [],
            billede_url: svar.billede_url ?? null,
            ingredienser: ingr,
            fremgangsmaade: Array.isArray(svar.fremgangsmaade) ? svar.fremgangsmaade : [],
            lavSikkerhed: ingr.filter(x => x.lav_sikkerhed).length,
          } : r));
        } catch {
          setRetter(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'fejl', inkluder: false } : r));
        }
      }
    } catch {
      setFejl('Kunne ikke åbne billederne. Prøv igen.');
    } finally {
      setKører(false);
      setFremgang(null);
    }
  }

  function sætNavn(i: number, navn: string) {
    setRetter(prev => prev.map((r, idx) => idx === i ? { ...r, navn } : r));
  }
  function toggleInkluder(i: number) {
    setRetter(prev => prev.map((r, idx) => idx === i ? { ...r, inkluder: !r.inkluder } : r));
  }

  const klarTilGem = retter.filter(r => r.status === 'ok' && r.inkluder && r.navn.trim());

  async function gemAlle() {
    if (!kogebogId) { Alert.alert('Vælg kogebog', 'Vælg eller opret en kogebog først.'); return; }
    if (klarTilGem.length === 0) return;
    setGemmer(true);
    try {
      for (const r of klarTilGem) {
        const gemt = await gemBrugerOpskrift({
          navn: r.navn.trim(), koed: r.koed, portioner: r.portioner, minutter: r.minutter,
          kategorier: r.kategorier, billede_url: r.billede_url, kilde_navn: 'Kogebog',
          ingredienser: r.ingredienser, fremgangsmaade: r.fremgangsmaade,
        });
        if (gemt) await sætKogebogForOpskrift(gemt.id, kogebogId);
      }
      onFærdig();
    } finally {
      setGemmer(false);
    }
  }

  return (
    <Modal visible={synlig} animationType="slide" presentationStyle="pageSheet" onRequestClose={onLuk}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onLuk} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.luk}>Luk</Text>
          </TouchableOpacity>
          <Text style={styles.titel}>Importér fra kogebog</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.indhold}>
          {/* Mål-kogebog */}
          <Text style={styles.label}>Kogebog</Text>
          <TouchableOpacity style={styles.kogebogVælger} onPress={() => setNavngivÅben(true)}>
            <Text style={styles.kogebogVælgerTekst}>{målNavn ? `📚 ${målNavn}` : '＋ Opret ny kogebog'}</Text>
          </TouchableOpacity>
          {liste.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {liste.map(k => (
                <TouchableOpacity
                  key={k.id}
                  style={[styles.chip, kogebogId === k.id && styles.chipAktiv]}
                  onPress={() => setKogebogId(k.id)}
                >
                  <Text style={[styles.chipTekst, kogebogId === k.id && styles.chipTekstAktiv]}>{k.emoji} {k.navn}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Vælg billeder */}
          <TouchableOpacity
            style={[styles.vælgKnap, kører && styles.knapDisabled]}
            onPress={vælgOgImportér}
            disabled={kører}
          >
            <Text style={styles.vælgKnapTekst}>
              {retter.length ? 'Vælg billeder igen' : `🖼️ Vælg sidefotos (maks ${MAKS_BILLEDER})`}
            </Text>
          </TouchableOpacity>
          <Text style={styles.hjælp}>Ét billede = én opskrift. Får en opskrift to sider, så tag ét billede med begge sider.</Text>

          {fremgang && (
            <View style={styles.fremgangBoks}>
              <ActivityIndicator color={Colors.green} />
              <Text style={styles.fremgangTekst}>Læser {fremgang.nu} af {fremgang.i_alt}…</Text>
            </View>
          )}
          {fejl && <Text style={styles.fejl}>{fejl}</Text>}

          {/* Batch-review */}
          {retter.map((r, i) => (
            <View key={i} style={[styles.retKort, !r.inkluder && styles.retKortFra]}>
              <Image source={{ uri: r.lokaltBillede }} style={styles.miniBillede} />
              <View style={{ flex: 1 }}>
                {r.status === 'henter' || r.status === 'venter' ? (
                  <Text style={styles.retStatus}>{r.status === 'henter' ? 'Læser…' : 'Venter…'}</Text>
                ) : r.status === 'fejl' ? (
                  <Text style={styles.retFejl}>Kunne ikke læses — prøv et tydeligere billede</Text>
                ) : (
                  <>
                    <TextInput
                      style={styles.retNavn}
                      value={r.navn}
                      onChangeText={t => sætNavn(i, t)}
                      placeholder="Navn på retten"
                      placeholderTextColor={Colors.inkSoft}
                    />
                    <Text style={styles.retMeta}>
                      {r.ingredienser.length} ingredienser{r.lavSikkerhed > 0 ? ` · ⚠️ ${r.lavSikkerhed} uden pris` : ''}
                    </Text>
                  </>
                )}
              </View>
              {r.status === 'ok' && (
                <TouchableOpacity onPress={() => toggleInkluder(i)} style={styles.inkluderKnap}>
                  <Text style={styles.inkluderTekst}>{r.inkluder ? '✓' : '＋'}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>

        {retter.some(r => r.status === 'ok') && (
          <View style={styles.bund}>
            <TouchableOpacity
              style={[styles.gemKnap, (gemmer || klarTilGem.length === 0 || !kogebogId) && styles.knapDisabled]}
              onPress={gemAlle}
              disabled={gemmer || klarTilGem.length === 0 || !kogebogId}
            >
              {gemmer
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.gemKnapTekst}>Gem {klarTilGem.length} opskrifter i kogebog</Text>}
            </TouchableOpacity>
          </View>
        )}

        <NavngivModal
          synlig={navngivÅben}
          titel="Ny kogebog"
          placeholder="Fx Min mors kogebog"
          gemTekst="Opret"
          onGem={opret}
          onLuk={() => setNavngivÅben(false)}
        />
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
  luk: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, width: 40 },
  titel: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink },
  indhold: { padding: 20, paddingBottom: 40 },
  label: {
    fontSize: 12, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.inkSoft,
    letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8,
  },
  kogebogVælger: {
    backgroundColor: Colors.card, borderRadius: Radii.btn,
    borderWidth: 1, borderColor: Colors.line, padding: 14,
  },
  kogebogVælgerTekst: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  chips: { gap: 8, paddingVertical: 12 },
  chip: {
    borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.line,
  },
  chipAktiv: { backgroundColor: Colors.green, borderColor: Colors.green },
  chipTekst: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  chipTekstAktiv: { color: '#fff' },
  vælgKnap: {
    backgroundColor: Colors.green, borderRadius: Radii.btn,
    padding: 16, alignItems: 'center', marginTop: 16,
  },
  knapDisabled: { backgroundColor: Colors.line },
  vælgKnapTekst: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  hjælp: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, lineHeight: 18, marginTop: 8 },
  fremgangBoks: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  fremgangTekst: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  fejl: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.red, marginTop: 10 },
  retKort: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, padding: 12,
  },
  retKortFra: { opacity: 0.5 },
  miniBillede: { width: 52, height: 52, borderRadius: 8, backgroundColor: Colors.line },
  retStatus: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  retFejl: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.red },
  retNavn: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink, padding: 0 },
  retMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 4 },
  inkluderKnap: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.green,
    alignItems: 'center', justifyContent: 'center',
  },
  inkluderTekst: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
  bund: {
    padding: 20, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: Colors.paper,
  },
  gemKnap: { backgroundColor: Colors.green, borderRadius: Radii.btn, padding: 16, alignItems: 'center' },
  gemKnapTekst: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
