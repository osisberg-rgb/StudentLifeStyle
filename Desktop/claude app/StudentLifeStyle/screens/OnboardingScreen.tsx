import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Chip from '../components/Chip';
import { Colors, Radii } from '../constants/theme';
import { supabase } from '../lib/supabase';

const BUTIKKER = ['Netto', 'Rema 1000', 'Lidl', 'Føtex', 'Aldi', 'Bilka', 'Coop'];
const KOST = ['Alt', 'Vegetar', 'Vegansk', 'Glutenfri'];
const STEPS = 4;

type Props = { onDone: () => void };

export default function OnboardingScreen({ onDone }: Props) {
  const [step] = useState(3); // vis trin 3 (opsætning)
  const [budget, setBudget] = useState(350);
  const [personer, setPersoner] = useState(1);
  const [kost, setKost] = useState<string[]>(['Alt']);
  const [butikker, setButikker] = useState<string[]>(['Netto', 'Rema 1000', 'Lidl']);

  function toggleKost(k: string) {
    setKost(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  }
  function toggleButik(b: string) {
    setButikker(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  }

  async function handleDone() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          budget_per_week: budget,
          household_size: personer,
          diet: kost,
          stores: butikker,
          onboarding_completed: true,
        });
      }
    } catch (_) {}
    onDone();
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Progress */}
        <View style={styles.progress}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={[styles.bar, i < step && styles.barFilled]} />
          ))}
        </View>

        <Text style={styles.title}>Sæt dig op</Text>
        <Text style={styles.sub}>
          Det tager 30 sek. Vi bruger det til at finde de billigste planer til dig.
        </Text>

        {/* Budget slider */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Budget pr. uge</Text>
            <Text style={styles.budgetVal}>{budget} kr</Text>
          </View>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={200}
            maximumValue={800}
            step={10}
            value={budget}
            onValueChange={v => setBudget(Math.round(v))}
            minimumTrackTintColor={Colors.green}
            maximumTrackTintColor={Colors.line}
            thumbTintColor={Colors.green}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>200 kr</Text>
            <Text style={styles.sliderLabel}>800 kr</Text>
          </View>
        </View>

        {/* Antal personer */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Antal personer</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => setPersoner(Math.max(1, personer - 1))}
            >
              <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepVal}>{personer}</Text>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => setPersoner(Math.min(8, personer + 1))}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Kost */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Kost</Text>
          <View style={styles.chips}>
            {KOST.map(k => (
              <Chip key={k} label={k} active={kost.includes(k)} onPress={() => toggleKost(k)} />
            ))}
          </View>
        </View>

        {/* Butikker */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Hvor handler du?</Text>
          <View style={styles.chips}>
            {BUTIKKER.map(b => (
              <Chip key={b} label={b} active={butikker.includes(b)} onPress={() => toggleButik(b)} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Fast bundknap */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btnPrimary, butikker.length === 0 && styles.btnDisabled]}
          onPress={handleDone}
          disabled={butikker.length === 0}
        >
          <Text style={styles.btnText}>Kom i gang</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  scroll: { padding: 24, paddingBottom: 20 },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.line,
  },
  barFilled: { backgroundColor: Colors.greenBright },
  title: {
    fontSize: 26,
    fontFamily: 'BricolageGrotesque_700Bold',
    color: Colors.ink,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.inkSoft,
    lineHeight: 20,
    marginBottom: 28,
  },
  section: {
    marginBottom: 28,
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: Colors.ink,
    marginBottom: 12,
  },
  budgetVal: {
    fontSize: 18,
    fontFamily: 'BricolageGrotesque_700Bold',
    color: Colors.green,
    marginBottom: 8,
  },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 22, fontFamily: 'Inter_400Regular', color: Colors.ink },
  stepVal: { fontSize: 22, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, minWidth: 30, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: Colors.paper },
  btnPrimary: {
    backgroundColor: Colors.green,
    borderRadius: Radii.btn,
    padding: 15,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
