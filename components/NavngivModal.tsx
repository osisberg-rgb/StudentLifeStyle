// Lille genbrugelig navn-input (opret/omdøb). Cross-platform — Alert.prompt
// findes kun på iOS, så vi bruger en rigtig TextInput-modal i stedet.
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';

type Props = {
  synlig: boolean;
  titel: string;
  startVærdi?: string;
  placeholder?: string;
  gemTekst?: string;
  onGem: (navn: string) => void;
  onLuk: () => void;
};

export default function NavngivModal({
  synlig, titel, startVærdi = '', placeholder = 'Navn', gemTekst = 'Gem', onGem, onLuk,
}: Props) {
  const [navn, setNavn] = useState(startVærdi);
  useEffect(() => { if (synlig) setNavn(startVærdi); }, [synlig, startVærdi]);

  function gem() {
    const rent = navn.trim();
    if (!rent) return;
    onGem(rent);
  }

  return (
    <Modal visible={synlig} transparent animationType="fade" onRequestClose={onLuk}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onLuk} />
        <View style={styles.boks}>
          <Text style={styles.titel}>{titel}</Text>
          <TextInput
            style={styles.input}
            value={navn}
            onChangeText={setNavn}
            placeholder={placeholder}
            placeholderTextColor={Colors.inkSoft}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={gem}
          />
          <View style={styles.knapper}>
            <TouchableOpacity style={styles.annullerKnap} onPress={onLuk}>
              <Text style={styles.annullerTekst}>Annuller</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.gemKnap, !navn.trim() && styles.gemKnapDisabled]}
              onPress={gem}
              disabled={!navn.trim()}
            >
              <Text style={styles.gemTekst}>{gemTekst}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 28 },
  boks: { backgroundColor: Colors.paper, borderRadius: Radii.card, padding: 20 },
  titel: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, marginBottom: 14 },
  input: {
    backgroundColor: Colors.card, borderRadius: Radii.btn, borderWidth: 1, borderColor: Colors.line,
    padding: 14, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.ink,
  },
  knapper: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  annullerKnap: { paddingVertical: 12, paddingHorizontal: 16 },
  annullerTekst: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  gemKnap: { backgroundColor: Colors.green, borderRadius: Radii.btn, paddingVertical: 12, paddingHorizontal: 22 },
  gemKnapDisabled: { backgroundColor: Colors.line },
  gemTekst: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff' },
});
