import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';
import ButiksPill from './ButiksPill';
import { supabase } from '../lib/supabase';
import { Maltid } from '../types/madplan';

const MALTID_IKONER: Record<string, string> = {
  morgenmad: '🌅', frokost: '🥙', aftensmad: '🍽️',
};

type Props = {
  maltid: Maltid | null;
  maltidType: string;
  dagNavn: string;
  ugeNr: number;
  onClose: () => void;
};

export default function OpskriftModal({ maltid, maltidType, dagNavn, ugeNr, onClose }: Props) {
  const [tilføjet, setTilføjet] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!maltid) return null;
  const safeMaltid = maltid;

  const erRester = !!safeMaltid.rester_fra;
  const harIngredienser = (safeMaltid.ingredienser?.length ?? 0) > 0;

  async function tilføjTilIndkøbsliste() {
    if (!harIngredienser) {
      Alert.alert('Ingen ingredienser', 'Rester behøver ikke nye ingredienser.');
      return;
    }
    setLoading(true);
    try {
      const { data: row, error: fetchError } = await supabase
        .from('madplaner')
        .select('plan')
        .eq('uge_nr', ugeNr)
        .maybeSingle();

      if (fetchError) throw new Error(fetchError.message);
      if (!row) throw new Error('Ingen gemt madplan for denne uge. Generer en plan først.');

      const plan = row.plan;

      // Hent eksisterende indkøbsliste (ny format: array af { butik, subtotal, varer })
      const eksisterende: any[] = plan.indkoebsliste ?? [];

      // Tilføj ingredienser til den rigtige butiksektion
      const opdateretListe = [...eksisterende];
      for (const ing of safeMaltid.ingredienser ?? []) {
        if (!ing.butik) continue;
        const sektion = opdateretListe.find(s => s.butik === ing.butik);
        const nyVare = {
          vare: ing.vare,
          antal_pakker: 1,
          pakkestoerrelse: ing.pakkestoerrelse ?? '',
          pris: ing.pakkepris,
          paa_tilbud: ing.paa_tilbud,
          checked: false,
        };
        if (sektion) {
          const findsDuplikat = sektion.varer.some(
            (v: any) => v.vare.toLowerCase() === ing.vare.toLowerCase()
          );
          if (!findsDuplikat) {
            sektion.varer.push(nyVare);
            sektion.subtotal = (sektion.subtotal ?? 0) + ing.pakkepris;
          }
        } else {
          opdateretListe.push({ butik: ing.butik, subtotal: ing.pakkepris, varer: [nyVare] });
        }
      }

      const opdateretPlan = { ...plan, indkoebsliste: opdateretListe };
      const { error: updateFejl } = await supabase
        .from('madplaner')
        .update({ plan: opdateretPlan })
        .eq('uge_nr', ugeNr);

      if (updateFejl) throw new Error(updateFejl.message);

      setTilføjet(true);
      Alert.alert('Tilføjet! ✅', `Ingredienserne til "${safeMaltid.navn}" er lagt i din indkøbsliste.`);
    } catch (e: any) {
      Alert.alert('Fejl', e.message ?? 'Prøv igen');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={!!maltid} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setTilføjet(false); onClose(); }} style={styles.lukBtn}>
            <Text style={styles.lukTekst}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerMeta}>
            <Text style={styles.headerType}>{MALTID_IKONER[maltidType]} {maltidType.charAt(0).toUpperCase() + maltidType.slice(1)}</Text>
            <Text style={styles.headerDag}>{dagNavn}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.retNavn}>{maltid.navn}</Text>
            {erRester && (
              <View style={styles.resterBadge}>
                <Text style={styles.resterTekst}>Rester fra {maltid.rester_fra}</Text>
              </View>
            )}
            <Text style={styles.pris}>
              {erRester ? 'Gratis – rester fra aftensmad' : `${maltid.pris_pr_portion} kr pr. portion`}
            </Text>
            {!erRester && (safeMaltid.portioner ?? 0) > 0 && (
              <View style={styles.portionerRad}>
                <View style={styles.portionerBadge}>
                  <Text style={styles.portionerTekst}>🍽 {safeMaltid.portioner} portion{safeMaltid.portioner !== 1 ? 'er' : ''}</Text>
                </View>
                <View style={styles.portionerBadge}>
                  <Text style={styles.portionerTekst}>💰 {safeMaltid.pris_pr_portion} kr / portion</Text>
                </View>
              </View>
            )}
          </View>

          {/* Ingredienser */}
          {harIngredienser && (
            <View style={styles.sektion}>
              <Text style={styles.sektionTitel}>🛒 Ingredienser</Text>
              <View style={styles.kort}>
                {safeMaltid.ingredienser!.map((ing, i) => (
                  <View
                    key={i}
                    style={[styles.ingRække, i < safeMaltid.ingredienser!.length - 1 && styles.ingDivider]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ingNavn}>{ing.vare}</Text>
                      <Text style={styles.ingMaengde}>{ing.brugt}{ing.pakkestoerrelse ? ` · pakke ${ing.pakkestoerrelse}` : ''}</Text>
                    </View>
                    <View style={styles.ingHøjre}>
                      {ing.butik && <ButiksPill name={ing.butik} />}
                      {!ing.estimeret && (
                        <View style={{ alignItems: 'flex-end' }}>
                          {ing.paa_tilbud && ing.normalpris && ing.normalpris > ing.pakkepris && (
                            <Text style={styles.normalpris}>{ing.normalpris},-</Text>
                          )}
                          <Text style={[styles.ingPris, ing.paa_tilbud && styles.ingPrisTilbud]}>
                            {ing.pakkepris},-
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Fremgangsmåde */}
          {safeMaltid.fremgangsmaade && safeMaltid.fremgangsmaade.length > 0 && (
            <View style={styles.sektion}>
              <Text style={styles.sektionTitel}>👨‍🍳 Fremgangsmåde</Text>
              {safeMaltid.fremgangsmaade.map((trin, i) => (
                <View key={i} style={styles.trinRække}>
                  <View style={styles.trinNr}>
                    <Text style={styles.trinNrTekst}>{i + 1}</Text>
                  </View>
                  <Text style={styles.trinTekst}>{trin}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bundknap */}
        {!erRester && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.btnPrimary, (tilføjet || loading) && styles.btnDisabled]}
              onPress={tilføjTilIndkøbsliste}
              disabled={tilføjet || loading}
            >
              <Text style={styles.btnText}>
                {tilføjet ? '✓ Tilføjet til indkøbsliste' : loading ? 'Tilføjer...' : '+ Tilføj til indkøbsliste'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  lukBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.canvas, alignItems: 'center', justifyContent: 'center',
  },
  lukTekst: { fontSize: 14, color: Colors.inkSoft, fontFamily: 'Inter_600SemiBold' },
  headerMeta: { alignItems: 'flex-end' },
  headerType: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  headerDag: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 2 },
  content: { padding: 20 },
  hero: { marginBottom: 28, paddingTop: 8 },
  retNavn: {
    fontSize: 26, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink,
    letterSpacing: -0.5, marginBottom: 10,
  },
  portionerRad: { flexDirection: 'row', gap: 8, marginTop: 10 },
  portionerBadge: {
    backgroundColor: Colors.canvas, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.line,
  },
  portionerTekst: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  resterBadge: {
    backgroundColor: Colors.greenSoft, borderRadius: 999, alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10,
  },
  resterTekst: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.green },
  pris: { fontSize: 20, fontFamily: 'BricolageGrotesque_800ExtraBold', color: Colors.green, letterSpacing: -0.4 },
  sektion: { marginBottom: 28 },
  sektionTitel: {
    fontSize: 16, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink,
    letterSpacing: -0.3, marginBottom: 12,
  },
  kort: {
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, overflow: 'hidden',
  },
  ingRække: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  ingDivider: { borderBottomWidth: 1, borderBottomColor: Colors.line },
  ingNavn: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  ingMaengde: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 2 },
  ingHøjre: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  normalpris: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textDecorationLine: 'line-through' },
  ingPris: { fontSize: 15, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink },
  ingPrisTilbud: { color: Colors.red },
  trinRække: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  trinNr: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.green,
    alignItems: 'center', justifyContent: 'center', marginRight: 14, marginTop: 1, flexShrink: 0,
  },
  trinNrTekst: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' },
  trinTekst: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.ink, lineHeight: 22 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: Colors.paper },
  btnPrimary: { backgroundColor: Colors.green, borderRadius: Radii.btn, padding: 15, alignItems: 'center' },
  btnDisabled: { backgroundColor: Colors.greenBright, opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
