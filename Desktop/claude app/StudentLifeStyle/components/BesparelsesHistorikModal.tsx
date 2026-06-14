// Besparelse over tid: det akkumulerede tal + graf + uge-for-uge-liste.
// Det stærkeste argument mod opsigelse, gjort synligt og konkret.
import React from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';
import { BesparelsesUge, formatKr } from '../constants/besparelse';
import BesparelseGraf from './BesparelseGraf';

type Props = {
  synlig: boolean;
  samletTilbud: number;
  uger: BesparelsesUge[];
  onLuk: () => void;
};

export default function BesparelsesHistorikModal({ synlig, samletTilbud, uger, onLuk }: Props) {
  if (!synlig) return null;
  const nyesteFørst = [...uger].sort((a, b) => b.uge - a.uge);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onLuk}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.titel}>Din besparelse</Text>
          <TouchableOpacity onPress={onLuk} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.luk}>Færdig</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.indhold} showsVerticalScrollIndicator={false}>
          {/* Akkumuleret hero */}
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>Tilbud brugt i alt med Mæt</Text>
            <Text style={styles.heroTal}>{samletTilbud}</Text>
            <Text style={styles.heroSub}>
              tilbuds-varer fordelt på {uger.length} {uger.length === 1 ? 'madplan' : 'madplaner'}
            </Text>
          </View>

          {/* Graf */}
          {uger.length > 0 && (
            <View style={styles.grafKort}>
              <Text style={styles.grafTitel}>Uge for uge</Text>
              <BesparelseGraf uger={uger} maks={16} højde={80} />
            </View>
          )}

          {/* Liste, nyeste uge først */}
          <View style={styles.liste}>
            {nyesteFørst.map((u, i) => (
              <View
                key={u.uge}
                style={[styles.række, i < nyesteFørst.length - 1 && styles.rækkeBorder]}
              >
                <Text style={styles.ugeNavn}>Uge {u.uge}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.ugeSpar}>{u.tilbud}</Text>
                  <Text style={styles.ugeSparLabel}>tilbuds-varer</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.canvas },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, paddingTop: 14, backgroundColor: Colors.paper,
    borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  titel: { fontSize: 18, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.3 },
  luk: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.green },
  indhold: { padding: 20, paddingBottom: 32 },

  hero: {
    backgroundColor: Colors.green, borderRadius: Radii.hero,
    padding: 22, alignItems: 'center', marginBottom: 16,
  },
  heroLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.7)' },
  heroTal: {
    fontSize: 40, fontFamily: 'BricolageGrotesque_800ExtraBold', color: Colors.yellow,
    letterSpacing: -0.8, marginVertical: 4,
  },
  heroSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)' },

  grafKort: {
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, padding: 16, marginBottom: 16,
  },
  grafTitel: {
    fontSize: 11, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.green,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14,
  },

  liste: {
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, overflow: 'hidden',
  },
  række: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rækkeBorder: { borderBottomWidth: 1, borderBottomColor: Colors.line },
  ugeNavn: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  ugePris: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 2 },
  ugeSpar: { fontSize: 16, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.greenBright },
  ugeSparLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
});
