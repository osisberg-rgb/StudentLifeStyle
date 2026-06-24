// Indsæt din egen opskrift — fra et link ELLER et billede (foto/screenshot):
// → edge-funktionen importer-opskrift henter/aflæser + normaliserer → preview
// hvor brugeren kan rette og se hvilke varer der er på tilbud → gem.
import React, { useEffect, useState, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, ActivityIndicator, Image, Alert,
} from 'react-native';
// Kun type-import (slettes ved kompilering) — selve modulet indlæses dovent i
// vælgBillede, så det aldrig kører ved app-start.
import type * as ImagePickerTyper from 'expo-image-picker';
import { Colors, Radii } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { slåEffektivPrisOp } from '../constants/tilbudspriser';
import { gemBrugerOpskrift } from '../lib/brugerOpskrifter';
import type { Opskrift, OpskriftIngrediens } from '../types/opskrift';
import ButiksPill from './ButiksPill';

type Props = {
  synlig: boolean;
  butikker?: string[];
  onLuk: () => void;
  onGemt: (opskrift: Opskrift) => void;
  // Brugeren vil skrive opskriften ind manuelt i stedet for link/billede
  onSkrivSelv?: () => void;
  // Hvilken metode "+"-arket valgte: 'kamera'/'galleri' åbner billedvælgeren
  // DIREKTE (ingen vælger-skærm); 'link' viser kun link-feltet. Udeladt (fra
  // "Indsæt din egen opskrift"-kortet i vælgeren) → den fulde vælger-skærm.
  metode?: 'kamera' | 'galleri' | 'link' | null;
};

type Importeret = {
  navn: string;
  koed: string;
  portioner: number;
  minutter?: number;
  kategorier?: string[];
  billede_url?: string | null;
  kilde_url?: string | null;
  kilde_navn?: string | null;
  ingredienser: OpskriftIngrediens[];
  fremgangsmaade: string[];
};

export default function ImportOpskriftModal({ synlig, butikker, onLuk, onGemt, onSkrivSelv, metode }: Props) {
  const [url, setUrl] = useState('');
  const [henter, setHenter] = useState(false);
  const [gemmer, setGemmer] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const [data, setData] = useState<Importeret | null>(null);
  // Lokalt foto/screenshot vises som preview (edge-funktionen gemmer ikke billedet)
  const [lokaltBillede, setLokaltBillede] = useState<string | null>(null);

  const autoKørt = useRef(false);
  // Nulstil alt når modalen lukkes
  useEffect(() => {
    if (!synlig) {
      setUrl(''); setHenter(false); setGemmer(false); setFejl(null);
      setData(null); setLokaltBillede(null);
      autoKørt.current = false;
    }
  }, [synlig]);

  // Åbn billedvælgeren når modalen er FÆRDIG med at vises (Modal onShow) — gør
  // man det før, kan vælgeren ikke præsentere, mens modalen stadig animerer ind.
  function autoÅbnVælger() {
    if ((metode === 'kamera' || metode === 'galleri') && !autoKørt.current) {
      autoKørt.current = true;
      vælgBillede(metode === 'kamera');
    }
  }

  // Fælles kald til edge-funktionen — body er enten { url } eller { billede }
  async function kørImport(
    body: { url?: string; billede?: string },
    fallbackKilde?: { url?: string | null },
  ) {
    setFejl(null);
    setHenter(true);
    try {
      const { data: svar, error } = await supabase.functions.invoke('importer-opskrift', { body });
      if (error) {
        let besked = 'Kunne ikke læse opskriften. Prøv igen.';
        try {
          const b = await (error as any).context?.json?.();
          if (b?.error) besked = b.error;
        } catch { /* behold standardbesked */ }
        setFejl(besked);
        return;
      }
      if (!svar || svar.error) {
        setFejl(svar?.error ?? 'Kunne ikke læse opskriften.');
        return;
      }
      setData({
        navn: svar.navn ?? 'Importeret opskrift',
        koed: svar.koed ?? 'Alt',
        portioner: svar.portioner ?? 4,
        minutter: svar.minutter,
        kategorier: svar.kategorier ?? [],
        billede_url: svar.billede_url ?? null,
        kilde_url: svar.kilde_url ?? fallbackKilde?.url ?? null,
        kilde_navn: svar.kilde_navn ?? null,
        ingredienser: Array.isArray(svar.ingredienser) ? svar.ingredienser : [],
        fremgangsmaade: Array.isArray(svar.fremgangsmaade) ? svar.fremgangsmaade : [],
      });
    } catch {
      setFejl('Noget gik galt. Tjek din forbindelse og prøv igen.');
    } finally {
      setHenter(false);
    }
  }

  function hent() {
    const rent = url.trim();
    if (!/^https?:\/\//i.test(rent)) {
      setFejl('Indsæt et gyldigt link (https://…)');
      return;
    }
    kørImport({ url: rent }, { url: rent });
  }

  // Tag et foto eller vælg et screenshot/billede fra galleriet, og send det
  // til edge-funktionen, der læser opskriften ud af billedet.
  async function vælgBillede(fraKamera: boolean) {
    try {
      // Dovent import — modulet (og dets native del) indlæses først her
      const ImagePicker = await import('expo-image-picker');
      const tilladelse = fraKamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!tilladelse.granted) {
        Alert.alert(
          'Adgang mangler',
          fraKamera
            ? 'Giv adgang til kameraet for at tage et billede af opskriften.'
            : 'Giv adgang til dine billeder for at vælge et screenshot.',
        );
        if (metode) onLuk();
        return;
      }
      // Vælg/​tag billede UDEN base64 her — et fuldopløst screenshot som base64
      // er flere MB og fryser JS-tråden, når det sendes.
      const valg: ImagePickerTyper.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 1,
      };
      const res = fraKamera
        ? await ImagePicker.launchCameraAsync(valg)
        : await ImagePicker.launchImageLibraryAsync(valg);
      if (res.canceled || !res.assets?.[0]?.uri) { if (metode) onLuk(); return; }

      // Skalér ned + komprimér til en lille base64 (native, hurtigt) inden afsendelse
      const ImageManipulator = await import('expo-image-manipulator');
      const lille = await ImageManipulator.manipulateAsync(
        res.assets[0].uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.6, base64: true, format: ImageManipulator.SaveFormat.JPEG },
      );
      if (!lille.base64) {
        setFejl('Kunne ikke læse billedet. Prøv igen.');
        return;
      }
      setLokaltBillede(lille.uri);
      await kørImport({ billede: `data:image/jpeg;base64,${lille.base64}` });
    } catch {
      setFejl('Kunne ikke åbne billedet. Prøv igen.');
    }
  }

  function fjernIngrediens(index: number) {
    setData(d => d ? { ...d, ingredienser: d.ingredienser.filter((_, i) => i !== index) } : d);
  }

  async function gem() {
    if (!data) return;
    if (!data.navn.trim()) { setFejl('Giv opskriften et navn'); return; }
    setGemmer(true);
    try {
      const gemt = await gemBrugerOpskrift({
        navn: data.navn.trim(),
        koed: data.koed,
        portioner: data.portioner,
        minutter: data.minutter,
        kategorier: data.kategorier,
        billede_url: data.billede_url,
        kilde_url: data.kilde_url,
        kilde_navn: data.kilde_navn,
        ingredienser: data.ingredienser,
        fremgangsmaade: data.fremgangsmaade,
      });
      if (!gemt) {
        Alert.alert('Kunne ikke gemmes', 'Prøv igen. Er du logget ind?');
        return;
      }
      onGemt(gemt);
    } finally {
      setGemmer(false);
    }
  }

  // Tilbuds-status pr. ingrediens (samme motor som indkøbslisten)
  const prissatte = (data?.ingredienser ?? []).filter(
    i => !(i.estimeret && i.estimereretPris === 0),
  );
  const påTilbud = prissatte.filter(i => slåEffektivPrisOp(
    { navn: i.navn, soeg: i.soeg, estimeret: i.estimeret, estimereretPris: i.estimereretPris },
    butikker,
  ).paaTilbud).length;

  return (
    <Modal visible={synlig} animationType="slide" presentationStyle="pageSheet" onRequestClose={onLuk} onShow={autoÅbnVælger}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onLuk} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.annuller}>Luk</Text>
          </TouchableOpacity>
          <Text style={styles.titel}>{data ? 'Tjek opskriften' : 'Indsæt din egen opskrift'}</Text>
          <View style={{ width: 40 }} />
        </View>

        {(metode === 'kamera' || metode === 'galleri') && !data ? (
          // Foto/kamera valgt fra "+"-arket → billedvælgeren er allerede åbnet
          // (effekten ovenfor); vis kun loading. Annuller lukker arket.
          <View style={styles.metodeLoading}>
            <ActivityIndicator color={Colors.green} />
            <Text style={styles.henterTekst}>{henter ? 'Læser opskriften…' : 'Åbner…'}</Text>
            {fejl ? <Text style={styles.fejl}>{fejl}</Text> : null}
          </View>
        ) : !data ? (
          // 'link' → kun link-feltet; udeladt metode → den fulde vælger
          <ScrollView contentContainerStyle={styles.indhold} keyboardShouldPersistTaps="handled">
            {metode !== 'link' && (
              <Text style={styles.intro}>
                Indsæt et link til en opskrift — eller tag et billede / vælg et
                screenshot af den. Vi læser den og tjekker, hvilke varer der er på
                tilbud lige nu. Du kan også skrive opskriften ind selv.
              </Text>
            )}

            <Text style={styles.label}>{metode === 'link' ? 'Indsæt link eller SoMe' : 'Fra link eller SoMe'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Link til opskrift, TikTok eller Instagram"
              placeholderTextColor={Colors.inkSoft}
              value={url}
              onChangeText={t => { setUrl(t); setFejl(null); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!henter}
            />
            <TouchableOpacity
              style={[styles.knap, (henter || !url.trim()) && styles.knapDisabled]}
              onPress={hent}
              disabled={henter || !url.trim()}
            >
              <Text style={styles.knapTekst}>Hent fra link</Text>
            </TouchableOpacity>

            {metode !== 'link' && (
            <>
            <View style={styles.divider}>
              <View style={styles.dividerLinje} />
              <Text style={styles.dividerTekst}>eller</Text>
              <View style={styles.dividerLinje} />
            </View>

            <Text style={styles.label}>Fra billede</Text>
            <View style={styles.billedKnapper}>
              <TouchableOpacity
                style={[styles.billedKnap, henter && styles.knapDisabled]}
                onPress={() => vælgBillede(true)}
                disabled={henter}
              >
                <Text style={styles.billedKnapEmoji}>📷</Text>
                <Text style={styles.billedKnapTekst}>Tag billede</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.billedKnap, henter && styles.knapDisabled]}
                onPress={() => vælgBillede(false)}
                disabled={henter}
              >
                <Text style={styles.billedKnapEmoji}>🖼️</Text>
                <Text style={styles.billedKnapTekst}>Vælg billede / screenshot</Text>
              </TouchableOpacity>
            </View>

            {onSkrivSelv && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLinje} />
                  <Text style={styles.dividerTekst}>eller</Text>
                  <View style={styles.dividerLinje} />
                </View>
                <TouchableOpacity
                  style={[styles.skrivKnap, henter && styles.knapDisabled]}
                  onPress={onSkrivSelv}
                  disabled={henter}
                >
                  <Text style={styles.skrivKnapEmoji}>✏️</Text>
                  <Text style={styles.skrivKnapTekst}>Skriv opskriften ind selv</Text>
                </TouchableOpacity>
              </>
            )}
            </>
            )}

            {fejl && <Text style={styles.fejl}>{fejl}</Text>}
            {henter && (
              <View style={styles.henterBoks}>
                <ActivityIndicator color={Colors.green} />
                <Text style={styles.henterTekst}>Læser opskriften…</Text>
              </View>
            )}
          </ScrollView>
        ) : (
          // ── Trin 2: preview + ret ──
          <>
            <ScrollView contentContainerStyle={styles.indhold} keyboardShouldPersistTaps="handled">
              {(data.billede_url || lokaltBillede) && (
                <Image source={{ uri: (data.billede_url ?? lokaltBillede)! }} style={styles.billede} />
              )}

              <Text style={styles.label}>Navn</Text>
              <TextInput
                style={styles.input}
                value={data.navn}
                onChangeText={t => setData(d => d ? { ...d, navn: t } : d)}
                placeholder="Navn på retten"
                placeholderTextColor={Colors.inkSoft}
              />

              <Text style={styles.label}>Portioner</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepKnap}
                  onPress={() => setData(d => d ? { ...d, portioner: Math.max(1, d.portioner - 1) } : d)}
                >
                  <Text style={styles.stepTekst}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepVærdi}>{data.portioner}</Text>
                <TouchableOpacity
                  style={styles.stepKnap}
                  onPress={() => setData(d => d ? { ...d, portioner: Math.min(12, d.portioner + 1) } : d)}
                >
                  <Text style={styles.stepTekst}>+</Text>
                </TouchableOpacity>
                {data.minutter != null && <Text style={styles.minutter}>⏱ {data.minutter} min</Text>}
              </View>

              {/* Tilbuds-status */}
              <View style={styles.tilbudBanner}>
                <Text style={styles.tilbudBannerTekst}>
                  {påTilbud > 0
                    ? `🏷 ${påTilbud} af ${prissatte.length} varer er på tilbud denne uge`
                    : 'Ingen af varerne er på tilbud lige nu'}
                </Text>
              </View>

              <Text style={styles.label}>Ingredienser ({data.ingredienser.length})</Text>
              {data.ingredienser.map((ing, i) => {
                const e = slåEffektivPrisOp(
                  { navn: ing.navn, soeg: ing.soeg, estimeret: ing.estimeret, estimereretPris: ing.estimereretPris },
                  butikker,
                );
                return (
                  <View key={i} style={styles.ingRække}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.ingNavnRække}>
                        <Text style={styles.ingNavn} numberOfLines={1}>{ing.navn}</Text>
                        {ing.lav_sikkerhed && <Text style={styles.advarsel}>⚠️</Text>}
                      </View>
                      <View style={styles.ingMeta}>
                        <Text style={styles.ingMaengde}>{ing.maengde}</Text>
                        {e.paaTilbud && e.butik && <ButiksPill name={e.butik} />}
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => fjernIngrediens(i)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.fjern}
                    >
                      <Text style={styles.fjernTekst}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {prissatte.some(i => i.lav_sikkerhed) && (
                <Text style={styles.hjælp}>
                  ⚠️ = varen kunne ikke prismatches automatisk. Fjern den, hvis den
                  ikke skal med på indkøbslisten.
                </Text>
              )}

              {data.kilde_navn && (
                <Text style={styles.kilde}>Opskrift fra {data.kilde_navn}</Text>
              )}
            </ScrollView>

            <View style={styles.bund}>
              <TouchableOpacity
                style={[styles.knap, gemmer && styles.knapDisabled]}
                onPress={gem}
                disabled={gemmer}
              >
                {gemmer
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.knapTekst}>Gem opskrift</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
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
  annuller: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, width: 40 },
  titel: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink },
  indhold: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, lineHeight: 20, marginBottom: 16 },
  input: {
    backgroundColor: Colors.card, borderRadius: Radii.btn,
    borderWidth: 1, borderColor: Colors.line, padding: 14,
    fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.ink,
  },
  fejl: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.red, marginTop: 10 },
  knap: {
    backgroundColor: Colors.green, borderRadius: Radii.btn,
    padding: 16, alignItems: 'center', marginTop: 16,
  },
  knapDisabled: { backgroundColor: Colors.line },
  knapTekst: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  henterBoks: { alignItems: 'center', gap: 8, marginTop: 18 },
  metodeLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  henterTekst: {
    fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft,
    textAlign: 'center',
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  dividerLinje: { flex: 1, height: 1, backgroundColor: Colors.line },
  dividerTekst: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  billedKnapper: { flexDirection: 'row', gap: 10 },
  billedKnap: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.green, borderStyle: 'dashed',
    paddingVertical: 18, paddingHorizontal: 10, alignItems: 'center', gap: 6,
  },
  billedKnapEmoji: { fontSize: 24 },
  billedKnapTekst: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.green, textAlign: 'center' },
  skrivKnap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.green, borderStyle: 'dashed',
    paddingVertical: 16, paddingHorizontal: 12,
  },
  skrivKnapEmoji: { fontSize: 20 },
  skrivKnapTekst: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.green },
  billede: {
    width: '100%', height: 180, borderRadius: Radii.card,
    backgroundColor: Colors.line, marginBottom: 16,
  },
  label: {
    fontSize: 12, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.inkSoft,
    letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 16, marginBottom: 8,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepKnap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  stepTekst: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.ink },
  stepVærdi: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, minWidth: 24, textAlign: 'center' },
  minutter: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft, marginLeft: 8 },
  tilbudBanner: {
    backgroundColor: Colors.greenSoft, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.green, padding: 14, marginTop: 18,
  },
  tilbudBannerTekst: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.green },
  ingRække: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, padding: 12, marginBottom: 8,
  },
  ingNavnRække: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ingNavn: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink, flexShrink: 1 },
  advarsel: { fontSize: 13 },
  ingMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  ingMaengde: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  fjern: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.canvas, alignItems: 'center', justifyContent: 'center',
  },
  fjernTekst: { fontSize: 13, color: Colors.inkSoft, fontFamily: 'Inter_600SemiBold' },
  hjælp: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, lineHeight: 18, marginTop: 8 },
  kilde: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 16, textAlign: 'center' },
  bund: {
    padding: 20, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: Colors.paper,
  },
});
