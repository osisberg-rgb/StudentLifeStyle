import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Radii, Shadow } from '../constants/theme';
import SparSegl from '../components/SparSegl';
import ButiksPill from '../components/ButiksPill';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Ingrediens, Madplan } from '../types/madplan';

const MOCK_TODAY = {
  name: 'Pasta med tomat og ost',
  minutes: 25,
  portioner: 2,
  pris: '34',
  butik: 'Netto',
  emoji: '🍝',
};

const MOCK_TILBUD = [
  { name: 'Pasta (500g)', butik: 'Netto', normalpris: '12', tilbudspris: '7', emoji: '🍝' },
  { name: 'Oksekød (400g)', butik: 'Rema 1000', normalpris: '45', tilbudspris: '29', emoji: '🥩' },
  { name: 'Æbler (1kg)', butik: 'Lidl', normalpris: '20', tilbudspris: '12', emoji: '🍎' },
];

type Props = { navigation: any };

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [madplan, setMadplan] = useState<Madplan | null>(null);
  const [budget, setBudget] = useState(350);

  const firstName = user?.email?.split('@')[0] ?? 'dig';
  const weekNo = getWeekNumber();
  const indkoebspris = madplan?.indkoebspris ?? madplan?.total ?? 0;
  const saved = madplan ? String(Math.max(0, budget - indkoebspris)) : '0';
  const dagIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const todayDag = madplan?.dage?.[dagIndex];

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        supabase.from('madplaner').select('plan, total_pris, total_spar').eq('uge_nr', weekNo).maybeSingle(),
        supabase.from('profiles').select('budget_per_week').maybeSingle(),
      ]).then(([{ data: plan }, { data: profil }]) => {
        if (plan) setMadplan(plan.plan);
        if (profil?.budget_per_week) setBudget(profil.budget_per_week);
      });
    }, [])
  );

  async function uploadTilbudsavis() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fil = result.assets[0];
      setUploading(true);

      const response = await fetch(fil.uri);
      const blob = await response.blob();

      const filnavn = `${Date.now()}_${fil.name}`;
      const { error } = await supabase.storage
        .from('tilbudsaviser')
        .upload(filnavn, blob, { contentType: 'application/pdf', upsert: false });

      if (error) throw error;

      Alert.alert('Uploadet! ✅', `"${fil.name}" er gemt. Tryk "Ny plan" for at generere madplan fra den.`);
    } catch (e: any) {
      Alert.alert('Upload fejlede', e.message ?? 'Prøv igen');
    } finally {
      setUploading(false);
    }
  }

  async function genererPlan() {
    setGenerating(true);
    try {
      const [{ data: filer }, { data: profil }] = await Promise.all([
        supabase.storage.from('tilbudsaviser').list('', { limit: 10 }),
        supabase.from('profiles').select('stores, budget_per_week, diet, household_size').maybeSingle(),
      ]);

      const pdfs = filer?.map(f => f.name).filter(n => n.endsWith('.pdf')) ?? [];
      const stores: string[] = profil?.stores ?? ['Netto'];
      const budget: number = profil?.budget_per_week ?? 350;
      const kost: string[] = profil?.diet ?? ['Alt'];
      const personer: number = profil?.household_size ?? 1;

      const { data, error } = await supabase.functions.invoke('dynamic-action', {
        body: { action: 'generate_meal_plan', tilbudsaviser: pdfs, budget, personer, kost, stores },
      });
      if (error) throw error;

      // Sørg for profil-rækken eksisterer (mangler for brugere der oprettede sig før migreringen)
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error('Ikke logget ind');

      await supabase.from('profiles').upsert({ id: u.id }, { onConflict: 'id', ignoreDuplicates: true });

      // Gem madplanen
      const { error: gemFejl } = await supabase.from('madplaner').upsert({
        user_id: u.id,
        uge_nr: weekNo,
        plan: data,
        total_pris: data.total ?? 0,
        total_spar: data.besparelse ?? 0,
      }, { onConflict: 'user_id,uge_nr' });

      if (gemFejl) throw new Error(`Gem fejlede: ${gemFejl.message}`);

      setMadplan(data);
      Alert.alert('Plan genereret! ✅', 'Din madplan for ugen er klar. Se den under Planer.');
    } catch (e: any) {
      Alert.alert('Fejl', e.message ?? 'Kunne ikke generere madplan');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.weekLabel}>Uge {weekNo}</Text>
          <Text style={styles.greeting}>Hej {firstName} 👋</Text>
        </View>
        <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profil')}>
          <Text style={styles.avatarText}>{firstName[0]?.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sparekort */}
        <View style={styles.sparekort}>
          <View style={{ flex: 1 }}>
            <Text style={styles.spareLabel}>Du sparer i denne uge</Text>
            <Text style={styles.spareBeløb}>{saved} kr</Text>
            {!madplan ? (
              <Text style={styles.spareSub}>Upload en tilbudsavis for at komme i gang</Text>
            ) : (
              <>
                <Text style={styles.spareSub}>Brugt af budget — {indkoebspris} / {budget} kr</Text>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, Math.round((indkoebspris / budget) * 100))}%` }]} />
                </View>
              </>
            )}
          </View>
          <SparSegl amount={saved} size={88} />
        </View>

        {/* Genveje */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.btnYellow} onPress={uploadTilbudsavis} disabled={uploading}>
            {uploading
              ? <ActivityIndicator size="small" color={Colors.ink} />
              : <Text style={styles.btnYellowText}>📄  Upload tilbudsavis</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={genererPlan} disabled={generating}>
            {generating
              ? <ActivityIndicator size="small" color={Colors.ink} />
              : <Text style={styles.btnGhostText}>✨  Ny plan</Text>}
          </TouchableOpacity>
        </View>

        {/* I dag */}
        {todayDag && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>I dag — {todayDag.dag}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Planer')}>
                <Text style={styles.sectionLink}>Se hele planen</Text>
              </TouchableOpacity>
            </View>
            {(['morgenmad', 'frokost', 'aftensmad'] as const).map(type => {
              const maltid = todayDag[type];
              if (!maltid) return null;
              const erRester = !!maltid.rester_fra;
              const ikoner = { morgenmad: '🌅', frokost: '🥙', aftensmad: '🍽️' };
              const butik = maltid.ingredienser?.find((i: Ingrediens) => i.butik)?.butik;
              return (
                <TouchableOpacity
                  key={type}
                  style={styles.dagKort}
                  onPress={() => navigation.navigate('Planer')}
                >
                  <View style={styles.dagThumb}>
                    <Text style={{ fontSize: 28 }}>{ikoner[type]}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.retMeta}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                    <Text style={styles.retNavn} numberOfLines={1}>{maltid.navn}</Text>
                    <View style={styles.retBottom}>
                      <Text style={styles.retPris}>
                        {erRester ? '0 kr' : `${maltid.pris_pr_portion} kr`}
                      </Text>
                      {butik && !erRester && <ButiksPill name={butik} />}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Bedste tilbud */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bedste tilbud lige nu</Text>
          {MOCK_TILBUD.map((t, i) => (
            <View key={i} style={styles.tilbudKort}>
              <View style={styles.tilbudThumb}>
                <Text style={{ fontSize: 26 }}>{t.emoji}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.tilbudNavn}>{t.name}</Text>
                <ButiksPill name={t.butik} />
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.normalpris}>{t.normalpris},-</Text>
                <Text style={styles.tilbudspris}>{t.tilbudspris},-</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 12,
    backgroundColor: Colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  weekLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5 },
  greeting: { fontSize: 22, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.4 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.green },
  content: { padding: 20, paddingBottom: 32 },

  sparekort: {
    backgroundColor: Colors.green,
    borderRadius: Radii.hero,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    ...Shadow,
  },
  spareLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  spareBeløb: { fontSize: 38, fontFamily: 'BricolageGrotesque_800ExtraBold', color: '#fff', letterSpacing: -0.76 },
  spareSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.yellow, borderRadius: 3 },

  row: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  btnYellow: {
    flex: 1,
    backgroundColor: Colors.yellow,
    borderRadius: Radii.btn,
    padding: 14,
    alignItems: 'center',
  },
  btnYellowText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.ink },
  btnGhost: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radii.btn,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.line,
  },
  btnGhostText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink },

  section: { marginBottom: 24 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.3 },
  sectionLink: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.green },

  dagKort: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.line,
  },
  dagThumb: {
    width: 72,
    height: 72,
    borderRadius: Radii.thumb,
    backgroundColor: Colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retNavn: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink, marginBottom: 4 },
  retMeta: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginBottom: 8 },
  retBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  retPris: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink },

  tilbudKort: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.line,
    marginBottom: 8,
  },
  tilbudThumb: {
    width: 52,
    height: 52,
    borderRadius: Radii.thumb,
    backgroundColor: Colors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tilbudNavn: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink, marginBottom: 4 },
  normalpris: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textDecorationLine: 'line-through' },
  tilbudspris: { fontSize: 18, fontFamily: 'BricolageGrotesque_800ExtraBold', color: Colors.red, letterSpacing: -0.36 },
});
