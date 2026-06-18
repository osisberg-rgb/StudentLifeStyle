// Vælg hvilken dag en valgt ret skal ind på. Bruges når man i ret-vælgeren
// har valgt præcis 1 ret og trykker "Vælg dag". Passerede dage er låste;
// dage der allerede har en ret vises, så man ved, at den bliver erstattet.
import React from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';

export type VælgDag = {
  index: number;
  dagNavn: string;   // "Mandag"
  retNavn: string;   // ret på dagen (uden "Rester:"), eller "" hvis tom
  laast: boolean;    // passeret dag — vises men kan ikke vælges
};

type Props = {
  synlig: boolean;
  retNavn: string;           // retten der skal placeres
  dage: VælgDag[];
  onVælg: (index: number) => void;
  onLuk: () => void;
};

export default function VælgDagModal({ synlig, retNavn, dage, onVælg, onLuk }: Props) {
  return (
    <Modal visible={synlig} animationType="slide" presentationStyle="pageSheet" onRequestClose={onLuk}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.titel}>Vælg dag</Text>
            <Text style={styles.undertitel} numberOfLines={1}>{retNavn}</Text>
          </View>
          <TouchableOpacity onPress={onLuk} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.luk}>Luk</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sektionTitel}>Hvilken dag skal retten ind på?</Text>

        <ScrollView contentContainerStyle={styles.liste} showsVerticalScrollIndicator={false}>
          {dage.map(d => (
            <TouchableOpacity
              key={d.index}
              style={[styles.rad, d.laast && styles.radLaast]}
              onPress={() => !d.laast && onVælg(d.index)}
              disabled={d.laast}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.dagNavn, d.laast && styles.tekstLaast]}>{d.dagNavn}</Text>
                <Text style={[styles.retNavn, d.laast && styles.tekstLaast]} numberOfLines={1}>
                  {d.retNavn ? `Erstatter: ${d.retNavn}` : 'Ingen ret endnu'}
                </Text>
              </View>
              {d.laast ? <Text style={styles.laast}>🔒</Text> : <Text style={styles.pil}>›</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.hjælp}>
          Har dagen allerede en ret, bliver den erstattet.
        </Text>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.canvas },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.line, backgroundColor: Colors.paper,
  },
  titel: { fontSize: 18, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.3 },
  undertitel: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 2 },
  luk: { fontSize: 14, color: Colors.inkSoft, fontFamily: 'Inter_600SemiBold' },
  sektionTitel: {
    fontSize: 12, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.green,
    letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 18, marginBottom: 4, marginHorizontal: 20,
  },
  liste: { padding: 20, paddingTop: 8, gap: 8 },
  rad: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, padding: 14,
  },
  radLaast: { opacity: 0.55 },
  dagNavn: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  retNavn: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 2 },
  tekstLaast: { color: Colors.inkSoft },
  laast: { fontSize: 14 },
  pil: { fontSize: 20, color: Colors.inkSoft },
  hjælp: {
    fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft,
    textAlign: 'center', paddingHorizontal: 24, paddingBottom: 12,
  },
});
