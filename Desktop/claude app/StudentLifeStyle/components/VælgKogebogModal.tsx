// Enkelt-vælger: vælg hvilken kogebog en opskrift skal ligge i (eller fjern).
// "+ Ny kogebog" opretter via NavngivModal og vælger den nye med det samme.
// Kalderen får det valgte kogebog-id (eller null = fjern fra kogebog).
import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';
import { kogebøger, opretKogebog, antalIKogebog } from '../lib/kogebøger';
import NavngivModal from './NavngivModal';

type Props = {
  synlig: boolean;
  valgtKogebogId: string | null;     // hvilken kogebog opskriften ligger i nu
  onVælg: (kogebogId: string | null) => void;
  onLuk: () => void;
};

export default function VælgKogebogModal({ synlig, valgtKogebogId, onVælg, onLuk }: Props) {
  const [navngivÅben, setNavngivÅben] = useState(false);
  const liste = kogebøger();

  async function opret(navn: string) {
    setNavngivÅben(false);
    const k = await opretKogebog(navn);
    if (!k) { Alert.alert('Fejl', 'Kunne ikke oprette kogebogen. Er du logget ind?'); return; }
    onVælg(k.id);
  }

  return (
    <Modal visible={synlig} animationType="slide" presentationStyle="pageSheet" onRequestClose={onLuk}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onLuk} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.luk}>Luk</Text>
          </TouchableOpacity>
          <Text style={styles.titel}>Læg i kogebog</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.indhold}>
          <TouchableOpacity style={styles.nyRække} onPress={() => setNavngivÅben(true)}>
            <Text style={styles.nyPlus}>＋</Text>
            <Text style={styles.nyTekst}>Ny kogebog</Text>
          </TouchableOpacity>

          {valgtKogebogId && (
            <TouchableOpacity style={styles.række} onPress={() => onVælg(null)}>
              <Text style={styles.rækkeEmoji}>🚫</Text>
              <Text style={styles.rækkeNavn}>Fjern fra kogebog</Text>
            </TouchableOpacity>
          )}

          {liste.length === 0 ? (
            <Text style={styles.tom}>Du har ingen kogebøger endnu — opret en ovenfor.</Text>
          ) : (
            liste.map(k => {
              const valgt = k.id === valgtKogebogId;
              return (
                <TouchableOpacity
                  key={k.id}
                  style={[styles.række, valgt && styles.rækkeValgt]}
                  onPress={() => onVælg(k.id)}
                >
                  <Text style={styles.rækkeEmoji}>{k.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rækkeNavn}>{k.navn}</Text>
                    <Text style={styles.rækkeAntal}>{antalIKogebog(k.id)} opskrifter</Text>
                  </View>
                  {valgt && <Text style={styles.flueben}>✓</Text>}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

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
  indhold: { padding: 16, gap: 10 },
  nyRække: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.green, borderStyle: 'dashed', padding: 16,
  },
  nyPlus: { fontSize: 20, color: Colors.green, fontFamily: 'Inter_700Bold' },
  nyTekst: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.green },
  række: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, padding: 16,
  },
  rækkeValgt: { borderColor: Colors.green, borderWidth: 2 },
  rækkeEmoji: { fontSize: 22 },
  rækkeNavn: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  rækkeAntal: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 2 },
  flueben: { fontSize: 16, color: Colors.green, fontFamily: 'Inter_700Bold' },
  tom: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textAlign: 'center', padding: 24 },
});
