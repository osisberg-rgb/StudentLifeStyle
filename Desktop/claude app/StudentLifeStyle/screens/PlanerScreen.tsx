import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import ButiksPill from '../components/ButiksPill';
import OpskriftModal from '../components/OpskriftModal';
import { supabase } from '../lib/supabase';
import { Madplan, Dag, Maltid } from '../types/madplan';

const MALTID_IKONER = { morgenmad: '🌅', frokost: '🥙', aftensmad: '🍽️' };
const MALTID_LABELS = { morgenmad: 'Morgenmad', frokost: 'Frokost', aftensmad: 'Aftensmad' };

export default function PlanerScreen() {
  const [madplan, setMadplan] = useState<Madplan | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uge, setUge] = useState(getWeekNumber());
  const [budget, setBudget] = useState(350);
  const [valgtMaltid, setValgtMaltid] = useState<{ maltid: Maltid; type: string; dag: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      hentMadplan(uge);
      supabase.from('profiles').select('budget_per_week').maybeSingle()
        .then(({ data }) => { if (data?.budget_per_week) setBudget(data.budget_per_week); });
    }, [uge])
  );

  async function hentMadplan(ugeNr: number) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('madplaner')
        .select('plan, total_pris, total_spar')
        .eq('uge_nr', ugeNr)
        .maybeSingle();

      if (error) console.error('hentMadplan fejl:', error.message);
      setMadplan(data?.plan ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function generer() {
    setGenerating(true);
    try {
      const [{ data: filer }, { data: profil }] = await Promise.all([
        supabase.storage.from('tilbudsaviser').list('', { limit: 10 }),
        supabase.from('profiles').select('stores, budget_per_week, diet, household_size').maybeSingle(),
      ]);

      const pdfs = filer?.map(f => f.name).filter(n => n.endsWith('.pdf')) ?? [];
      const stores: string[] = profil?.stores ?? ['Netto'];
      const planBudget: number = profil?.budget_per_week ?? 350;
      const kost: string[] = profil?.diet ?? ['Alt'];
      const personer: number = profil?.household_size ?? 1;

      const { data, error } = await supabase.functions.invoke('dynamic-action', {
        body: { action: 'generate_meal_plan', tilbudsaviser: pdfs, budget: planBudget, personer, kost, stores },
      });
      if (error) throw error;

      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error('Ikke logget ind');

      await supabase.from('profiles').upsert({ id: u.id }, { onConflict: 'id', ignoreDuplicates: true });
      const { error: gemFejl } = await supabase.from('madplaner').upsert({
        user_id: u.id,
        uge_nr: uge,
        plan: data,
        total_pris: data.total ?? 0,
        total_spar: data.besparelse ?? 0,
      }, { onConflict: 'user_id,uge_nr' });

      if (gemFejl) throw new Error(`Gem fejlede: ${gemFejl.message}`);
      setMadplan(data);
    } catch (e: any) {
      Alert.alert('Fejl', e.message ?? 'Prøv igen');
    } finally {
      setGenerating(false);
    }
  }

  function skiftUge(retning: number) {
    const ny = uge + retning;
    setUge(ny);
    hentMadplan(ny);
  }

  function åbnMaltid(dag: Dag, type: 'morgenmad' | 'frokost' | 'aftensmad') {
    setValgtMaltid({ maltid: dag[type], type, dag: dag.dag });
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Madplaner</Text>
        <TouchableOpacity onPress={generer} disabled={generating}>
          {generating
            ? <ActivityIndicator size="small" color={Colors.green} />
            : <Text style={styles.nyPlanBtn}>✨ Ny plan</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Uge-vælger */}
        <View style={styles.ugeVælger}>
          <TouchableOpacity onPress={() => skiftUge(-1)}>
            <Text style={styles.ugeArrow}>‹</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.ugeNr}>Uge {uge}</Text>
            {madplan && (
              <Text style={styles.ugeSub}>
                {madplan.indkoebspris ?? madplan.total ?? 0} / {budget} kr · spar {Math.max(0, budget - (madplan.indkoebspris ?? madplan.total ?? 0))} kr
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => skiftUge(1)}>
            <Text style={styles.ugeArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Protein-ankre */}
        {madplan?.proteinkilder && madplan.proteinkilder.length > 0 && (
          <View style={styles.proteinRow}>
            <Text style={styles.proteinLabel}>Bygget på: </Text>
            {madplan.proteinkilder.map((p, i) => (
              <View key={i} style={styles.proteinBadge}>
                <Text style={styles.proteinBadgeTekst}>{p}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Spild / gemt info */}
        {madplan && ((madplan.spild_kr ?? 0) > 0 || (madplan.gemt_vaerdi ?? 0) > 0) && (
          <View style={styles.pantryRad}>
            {(madplan.gemt_vaerdi ?? 0) > 0 && (
              <View style={styles.pantryGemt}>
                <Text style={styles.pantryTekst}>🫙 Gemt: {madplan.gemt_vaerdi} kr</Text>
              </View>
            )}
            {(madplan.spild_kr ?? 0) > 0 && (
              <View style={styles.pantrySpild}>
                <Text style={styles.pantryTekst}>⚠️ Spild: {madplan.spild_kr} kr</Text>
              </View>
            )}
          </View>
        )}

        {/* Advarsel hvis planen er over budget */}
        {madplan?.advarsler && madplan.advarsler.length > 0 && (
          <View style={styles.advarsel}>
            <Text style={styles.advarselTekst}>⚠️ {madplan.advarsler[0]}</Text>
          </View>
        )}

        {(loading || generating) && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.green} size="large" />
            <Text style={styles.loadingText}>
              {generating ? 'AI analyserer tilbud og bygger madplan...' : 'Henter madplan...'}
            </Text>
          </View>
        )}

        {!loading && !generating && !madplan && (
          <View style={styles.tom}>
            <Text style={styles.tomEmoji}>🗓️</Text>
            <Text style={styles.tomTekst}>Ingen plan for denne uge</Text>
            <Text style={styles.tomSub}>Upload en tilbudsavis på Hjem og tryk herunder</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={generer}>
              <Text style={styles.btnText}>Generér madplan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Dag-kort med 3 måltider */}
        {!loading && !generating && madplan?.dage?.map((dag, i) => (
          <View key={i} style={styles.dagKort}>
            <Text style={styles.dagNavn}>{dag.dag.toUpperCase()}</Text>
            <View style={styles.dagDivider} />
            {(['morgenmad', 'frokost', 'aftensmad'] as const).map(type => {
              const maltid = dag[type];
              if (!maltid) return null;
              const erRester = !!maltid.rester_fra;
              const primærButik = maltid.ingredienser?.find(i => i.butik)?.butik;

              return (
                <TouchableOpacity
                  key={type}
                  style={styles.maltidRække}
                  onPress={() => åbnMaltid(dag, type)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.maltidIkon}>{MALTID_IKONER[type]}</Text>
                  <View style={styles.maltidMidten}>
                    <Text style={styles.maltidLabel}>{MALTID_LABELS[type]}</Text>
                    <Text style={styles.maltidNavn} numberOfLines={1}>
                      {erRester ? `Rester: ${maltid.navn.replace(/^Rester:\s*/i, '')}` : maltid.navn}
                    </Text>
                  </View>
                  <View style={styles.maltidHøjre}>
                    {primærButik && !erRester && <ButiksPill name={primærButik} />}
                    <Text style={[styles.maltidPris, erRester && styles.maltidPrisFri]}>
                      {erRester ? '0 kr' : `${maltid.pris_pr_portion} kr`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <OpskriftModal
        maltid={valgtMaltid?.maltid ?? null}
        maltidType={valgtMaltid?.type ?? ''}
        dagNavn={valgtMaltid?.dag ?? ''}
        ugeNr={uge}
        onClose={() => setValgtMaltid(null)}
      />
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
  nyPlanBtn: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.green },
  content: { padding: 20, paddingBottom: 32 },
  ugeVælger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.green, borderRadius: Radii.card, padding: 18, marginBottom: 16,
  },
  ugeArrow: { fontSize: 28, color: '#fff', paddingHorizontal: 8 },
  ugeNr: { fontSize: 18, fontFamily: 'BricolageGrotesque_700Bold', color: '#fff', letterSpacing: -0.3 },
  ugeSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  proteinRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    marginBottom: 10, gap: 6,
  },
  proteinLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  proteinBadge: {
    backgroundColor: Colors.greenSoft, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  proteinBadgeTekst: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.green },
  pantryRad: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  pantryGemt: {
    flex: 1, backgroundColor: Colors.greenSoft, borderRadius: Radii.btn,
    padding: 10, alignItems: 'center',
  },
  pantrySpild: {
    flex: 1, backgroundColor: '#FFF8E1', borderRadius: Radii.btn,
    padding: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.yellow,
  },
  pantryTekst: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  advarsel: {
    backgroundColor: '#FFF8E1', borderRadius: Radii.btn, padding: 12,
    marginBottom: 14, borderWidth: 1, borderColor: Colors.yellow,
  },
  advarselTekst: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.ink },
  loadingWrap: { alignItems: 'center', marginTop: 60, gap: 16 },
  loadingText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textAlign: 'center', paddingHorizontal: 32 },
  tom: { alignItems: 'center', marginTop: 60, gap: 12 },
  tomEmoji: { fontSize: 56 },
  tomTekst: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  tomSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textAlign: 'center' },
  btnPrimary: { backgroundColor: Colors.green, borderRadius: Radii.btn, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
  btnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  dagKort: {
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, marginBottom: 12, overflow: 'hidden',
  },
  dagNavn: {
    fontSize: 11, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.green,
    letterSpacing: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  dagDivider: { height: 1, backgroundColor: Colors.line, marginHorizontal: 16 },
  maltidRække: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  maltidIkon: { fontSize: 18, marginRight: 12, width: 24, textAlign: 'center' },
  maltidMidten: { flex: 1, marginRight: 8 },
  maltidLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  maltidNavn: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.ink },
  maltidHøjre: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  maltidPris: { fontSize: 14, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink },
  maltidPrisFri: { color: Colors.greenBright },
});
