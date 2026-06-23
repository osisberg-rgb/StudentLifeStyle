import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import ButiksPill from '../components/ButiksPill';
import TilføjVareModal from '../components/TilføjVareModal';
import { supabase } from '../lib/supabase';
import { IndkoebsButik, IndkoebsVare } from '../types/madplan';
import { TilbudsTræf } from '../constants/tilbudSøg';
import { fletTilbudIListe, fletFriVareIListe } from '../lib/indkøbsliste';
import { sætValgtUge, hentValgtUge } from '../constants/ugeState';
import { getWeekNumber } from '../constants/uge';
import KlokkeKnap from '../components/KlokkeKnap';
import { hentWatchlist, termFraFritekst } from '../lib/watchlist';

type Vare = IndkoebsVare & { checked?: boolean };

export default function IndkøbScreen() {
  const [sektioner, setSektioner] = useState<IndkoebsButik[]>([]);
  const [loading, setLoading] = useState(true);
  // Uge-vælger: følger den uge man står på i Planer (delt state), så
  // madplan og indkøbsliste altid peger på samme uge
  const [uge, setUge] = useState(() => hentValgtUge(getWeekNumber()));
  const [tilføjÅben, setTilføjÅben] = useState(false);
  // Planen som den blev hentet — genbruges ved gem, så hvert checkbox-tryk
  // ikke koster et ekstra SELECT-rundtrip. Genindlæses ved hvert fokus.
  const planRef = useRef<any>(null);
  // Findes der allerede en madplan-række for ugen? Styrer om vi update'r
  // (normal sti) eller upsert'er (manuel tilføjelse uden genereret plan).
  const harRækkeRef = useRef(false);

  useFocusEffect(useCallback(() => {
    // Følg den delte uge (ændret fra Planer-fanen) — setUge ændrer
    // dep'en, så effekten kører igen og henter den rigtige liste
    const deltUge = hentValgtUge(uge);
    if (deltUge !== uge) {
      setUge(deltUge);
      return;
    }
    hentListe(uge);
    hentWatchlist();   // så 🔔-knapperne viser korrekt tilstand
  }, [uge]));

  function skiftUge(retning: number) {
    const ny = uge + retning;
    sætValgtUge(ny);
    setUge(ny);
  }

  async function hentListe(ugeNr: number) {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('madplaner')
        .select('plan')
        .eq('uge_nr', ugeNr)
        .maybeSingle();

      planRef.current = data?.plan ?? null;
      harRækkeRef.current = !!data;
      if (data?.plan?.indkoebsliste?.length) {
        const liste: IndkoebsButik[] = data.plan.indkoebsliste.map((s: IndkoebsButik) => ({
          ...s,
          varer: s.varer.map(v => ({ ...v, checked: (v as any).checked ?? false })),
        }));
        setSektioner(liste);
      } else {
        setSektioner([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function gemListe(nyeSektioner: IndkoebsButik[]) {
    const basis = planRef.current ?? { uge, indkoebsliste: [] };
    const nyPlan = { ...basis, indkoebsliste: nyeSektioner };
    planRef.current = nyPlan;

    if (harRækkeRef.current) {
      await supabase.from('madplaner').update({ plan: nyPlan }).eq('uge_nr', uge);
      return;
    }

    // Ingen plan for ugen endnu — opret en minimal række så man kan handle
    // manuelt uden først at generere en madplan.
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    await supabase.from('profiles').upsert({ id: u.id }, { onConflict: 'id', ignoreDuplicates: true });
    const { error } = await supabase.from('madplaner').upsert(
      { user_id: u.id, uge_nr: uge, plan: nyPlan },
      { onConflict: 'user_id,uge_nr' }
    );
    if (!error) harRækkeRef.current = true;
  }

  function tilføjVare(træf: TilbudsTræf) {
    const { liste, tilføjet } = fletTilbudIListe(sektioner, træf);
    if (!tilføjet) return;
    setSektioner(liste);
    gemListe(liste);
  }

  function tilføjFriVare(navn: string) {
    const { liste, tilføjet } = fletFriVareIListe(sektioner, navn);
    if (!tilføjet) return;
    setSektioner(liste);
    gemListe(liste);
  }

  function toggleHarDet(sI: number, vI: number) {
    const ny = sektioner.map((s, si) =>
      si !== sI ? s : {
        ...s,
        varer: s.varer.map((v, vi) => vi !== vI ? v : { ...v, checked: !(v as any).checked }),
      }
    );
    setSektioner(ny);
    gemListe(ny);
  }

  function fjernVare(sI: number, vI: number) {
    const ny = sektioner.map((s, si) =>
      si !== sI ? s : { ...s, varer: s.varer.filter((_, vi) => vi !== vI) }
    ).filter(s => s.varer.length > 0);
    setSektioner(ny);
    gemListe(ny);
  }

  // Fremdrift: i butikken er "hvor langt er jeg?" det vigtigste spørgsmål
  const alleVarerFlad = sektioner.flatMap(s => s.varer);
  const antalVarer = alleVarerFlad.length;
  const antalKlaret = alleVarerFlad.filter(v => (v as any).checked).length;

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
          <View style={styles.headerRække}>
            <Text style={styles.title}>Indkøbsliste</Text>
            <UgeVælger uge={uge} onSkift={skiftUge} />
          </View>
        </View>
        <View style={styles.tom}>
          <Text style={styles.tomEmoji}>🛒</Text>
          <Text style={styles.tomTekst}>Ingen liste for uge {uge}</Text>
          <Text style={styles.tomSub}>Lav en madplan under Planer — eller tilføj tilbud manuelt med +</Text>
        </View>
        <TouchableOpacity style={styles.fab} onPress={() => setTilføjÅben(true)} activeOpacity={0.85}>
          <Text style={styles.fabTekst}>+</Text>
        </TouchableOpacity>
        <TilføjVareModal
          synlig={tilføjÅben}
          onTilføj={tilføjVare}
          onTilføjFri={tilføjFriVare}
          onClose={() => setTilføjÅben(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerRække}>
          <Text style={styles.title}>Indkøbsliste</Text>
          <UgeVælger uge={uge} onSkift={skiftUge} />
        </View>
        <View style={styles.fremdriftRække}>
          <View style={styles.fremdriftBg}>
            <View style={[styles.fremdriftFill, { width: `${antalVarer === 0 ? 0 : Math.round((antalKlaret / antalVarer) * 100)}%` }]} />
          </View>
          <Text style={styles.fremdriftTekst}>{antalKlaret} af {antalVarer} varer</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sektioner.map((sektion, si) => {
          const tilbudsAntal = sektion.varer.filter(v => v.paa_tilbud && !(v as any).checked).length;
          return (
            <View key={si} style={styles.sektion}>
              <View style={styles.sektionHeader}>
                <ButiksPill name={sektion.butik} />
                {tilbudsAntal > 0 && (
                  <Text style={styles.sektionTilbud}>🏷 {tilbudsAntal} på tilbud</Text>
                )}
              </View>
              <View style={styles.sektionKort}>
                {sektion.varer.map((vare: Vare, vi) => (
                  <View
                    key={vi}
                    style={[styles.vareRække, vi < sektion.varer.length - 1 && styles.vareDivider]}
                  >
                    {/* Venstre: checkbox "har det allerede" — stort tryk-mål,
                        listen bruges med én hånd i butikken */}
                    <TouchableOpacity
                      onPress={() => toggleHarDet(si, vi)}
                      style={[styles.checkbox, vare.checked && styles.checkboxChecked]}
                      hitSlop={{ top: 12, bottom: 12, left: 14, right: 10 }}
                    >
                      {vare.checked && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>

                    {/* Midt: navn + mængde */}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.vareNavn, vare.checked && styles.vareChecked]}>
                        {vare.vare}
                      </Text>
                      {vare.pakkestoerrelse ? (
                        <Text style={styles.vareMaengde}>
                          {(vare.antal_pakker ?? 1) > 1
                            ? `${vare.antal_pakker} × ${vare.pakkestoerrelse}`
                            : vare.pakkestoerrelse}
                        </Text>
                      ) : null}
                      {vare.paa_tilbud && vare.butik && !vare.checked ? (
                        <View style={styles.tilbudRække}>
                          <ButiksPill name={vare.butik} />
                        </View>
                      ) : null}
                      {vare.checked && (
                        <Text style={styles.harDetNote}>Har det allerede</Text>
                      )}
                    </View>

                    {/* Højre: tilbudspris + 🔔 + fjern-knap */}
                    {vare.paa_tilbud && !vare.checked && (
                      <Text style={styles.varePrisTilbud}>{vare.pris},-</Text>
                    )}
                    <KlokkeKnap label={vare.vare} term={termFraFritekst(vare.vare)} størrelse={18} />
                    <TouchableOpacity
                      onPress={() => fjernVare(si, vi)}
                      style={styles.fjernKnap}
                      hitSlop={{ top: 10, bottom: 10, left: 6, right: 12 }}
                    >
                      <Text style={styles.fjernIkon}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
        <View style={{ height: 96 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setTilføjÅben(true)} activeOpacity={0.85}>
        <Text style={styles.fabTekst}>+</Text>
      </TouchableOpacity>
      <TilføjVareModal
        synlig={tilføjÅben}
        onTilføj={tilføjVare}
        onTilføjFri={tilføjFriVare}
        onClose={() => setTilføjÅben(false)}
      />
    </SafeAreaView>
  );
}

function UgeVælger({ uge, onSkift }: { uge: number; onSkift: (retning: number) => void }) {
  return (
    <View style={styles.ugeVælger}>
      <TouchableOpacity onPress={() => onSkift(-1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}>
        <Text style={styles.ugeArrow}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.uge}>Uge {uge}</Text>
      <TouchableOpacity onPress={() => onSkift(1)} hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}>
        <Text style={styles.ugeArrow}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.canvas },
  header: {
    padding: 20, paddingTop: 12, backgroundColor: Colors.paper,
    borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  headerRække: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.4 },
  uge: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft, minWidth: 52, textAlign: 'center' },
  ugeVælger: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ugeArrow: { fontSize: 22, color: Colors.inkSoft, paddingHorizontal: 4 },
  fremdriftRække: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  fremdriftBg: { flex: 1, height: 6, backgroundColor: Colors.line, borderRadius: 3, overflow: 'hidden' },
  fremdriftFill: { height: '100%', backgroundColor: Colors.greenBright, borderRadius: 3 },
  fremdriftTekst: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  content: { padding: 20 },
  tom: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  tomEmoji: { fontSize: 56, marginBottom: 16 },
  tomTekst: { fontSize: 18, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, marginBottom: 8 },
  tomSub: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textAlign: 'center', lineHeight: 20 },
  sektion: { marginBottom: 20 },
  sektionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sektionTilbud: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.green },
  sektionKort: {
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, overflow: 'hidden',
  },
  vareRække: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  vareDivider: { borderBottomWidth: 1, borderBottomColor: Colors.line },
  checkbox: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1.5,
    borderColor: Colors.line, marginRight: 12, alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.green, borderColor: Colors.green },
  checkmark: { color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold' },
  vareNavn: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.ink },
  vareChecked: { color: Colors.inkSoft, textDecorationLine: 'line-through' },
  vareMaengde: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 2 },
  tilbudRække: { flexDirection: 'row', marginTop: 4 },
  harDetNote: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.green, marginTop: 2 },
  varePrisTilbud: {
    fontSize: 14, fontFamily: 'BricolageGrotesque_700Bold',
    color: Colors.red, marginLeft: 8,
  },
  fjernKnap: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  fjernIkon: { fontSize: 11, color: Colors.inkSoft, fontFamily: 'Inter_700Bold' },
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.blue,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabTekst: { fontSize: 30, color: '#fff', fontFamily: 'Inter_700Bold', marginTop: -3 },
});
