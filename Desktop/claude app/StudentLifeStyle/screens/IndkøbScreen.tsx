import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import ButiksPill from '../components/ButiksPill';
import SparSegl from '../components/SparSegl';
import { supabase } from '../lib/supabase';
import { IndkoebsButik, IndkoebsVare } from '../types/madplan';

export default function IndkøbScreen() {
  const [sektioner, setSektioner] = useState<IndkoebsButik[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSpar, setTotalSpar] = useState(0);
  const weekNo = getWeekNumber();

  useFocusEffect(useCallback(() => { hentListe(); }, []));

  async function hentListe() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('madplaner')
        .select('plan, total_spar')
        .eq('uge_nr', weekNo)
        .maybeSingle();

      if (data?.plan?.indkoebsliste?.length) {
        // Sørg for at varer har checked-felt
        const liste: IndkoebsButik[] = data.plan.indkoebsliste.map((s: IndkoebsButik) => ({
          ...s,
          varer: s.varer.map(v => ({ ...v, checked: (v as any).checked ?? false })),
        }));
        setSektioner(liste);
        setTotalSpar(data.total_spar ?? 0);
      } else {
        setSektioner([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function toggleVare(sI: number, vI: number) {
    const nyeSektioner = sektioner.map((s, si) =>
      si !== sI ? s : {
        ...s,
        varer: s.varer.map((v, vi) => vi !== vI ? v : { ...v, checked: !(v as any).checked }),
      }
    );
    setSektioner(nyeSektioner);

    const { data: row } = await supabase
      .from('madplaner').select('plan').eq('uge_nr', weekNo).maybeSingle();
    if (row) {
      await supabase.from('madplaner')
        .update({ plan: { ...row.plan, indkoebsliste: nyeSektioner } })
        .eq('uge_nr', weekNo);
    }
  }

  const total = sektioner.reduce((acc, s) => acc + (s.subtotal ?? 0), 0);

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.green} size="large" />
      </SafeAreaView>
    );
  }

  if (sektioner.length === 0) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Indkøbsliste</Text>
          <Text style={styles.uge}>Uge {weekNo}</Text>
        </View>
        <View style={styles.tom}>
          <Text style={styles.tomEmoji}>🛒</Text>
          <Text style={styles.tomTekst}>Din liste er tom</Text>
          <Text style={styles.tomSub}>
            Åbn en opskrift under Planer og tryk "Tilføj til indkøbsliste"
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Indkøbsliste</Text>
        <Text style={styles.uge}>Uge {weekNo}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sektioner.map((sektion, si) => (
          <View key={si} style={styles.sektion}>
            <View style={styles.sektionHeader}>
              <ButiksPill name={sektion.butik} />
              <Text style={styles.subtotal}>{sektion.subtotal} kr</Text>
            </View>
            <View style={styles.sektionKort}>
              {sektion.varer.map((vare: IndkoebsVare & { checked?: boolean }, vi) => (
                <TouchableOpacity
                  key={vi}
                  style={[styles.vareRække, vi < sektion.varer.length - 1 && styles.vareDivider]}
                  onPress={() => toggleVare(si, vi)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, vare.checked && styles.checkboxChecked]}>
                    {vare.checked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.vareNavn, vare.checked && styles.vareChecked]}>
                      {vare.vare}
                    </Text>
                    {(vare as any).pakkestoerrelse ? (
                      <Text style={styles.vareMaengde}>
                        {(vare as any).antal_pakker ?? 1} × {(vare as any).pakkestoerrelse}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.varePris, vare.paa_tilbud && styles.varePrisTilbud]}>
                    {vare.pris},-
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.totalBar}>
        <View>
          <Text style={styles.totalLabel}>I alt for ugen</Text>
          <Text style={styles.totalBeløb}>{total} kr</Text>
        </View>
        {totalSpar > 0 && <SparSegl amount={String(totalSpar)} size={72} />}
      </View>
    </SafeAreaView>
  );
}

function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((((now.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.canvas },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 12, backgroundColor: Colors.paper,
    borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  title: { fontSize: 22, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.4 },
  uge: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  content: { padding: 20 },
  tom: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  tomEmoji: { fontSize: 56, marginBottom: 16 },
  tomTekst: { fontSize: 18, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, marginBottom: 8 },
  tomSub: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textAlign: 'center', lineHeight: 20 },
  sektion: { marginBottom: 20 },
  sektionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subtotal: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  sektionKort: {
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, overflow: 'hidden',
  },
  vareRække: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  vareDivider: { borderBottomWidth: 1, borderBottomColor: Colors.line },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    borderColor: Colors.line, marginRight: 12, alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.greenBright, borderColor: Colors.greenBright },
  checkmark: { color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold' },
  vareNavn: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.ink },
  vareChecked: { color: Colors.inkSoft, textDecorationLine: 'line-through' },
  vareMaengde: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 2 },
  varePris: { fontSize: 14, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink },
  varePrisTilbud: { color: Colors.red },
  totalBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.green, padding: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  totalLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  totalBeløb: { fontSize: 26, fontFamily: 'BricolageGrotesque_800ExtraBold', color: '#fff', letterSpacing: -0.5 },
});
