// Genbrugelig 🔔-knap: overvåg/fjern en specifik vare. Første gang der overvåges,
// beder den om notifikations-tilladelse. Optimistisk UI (ruller tilbage ved fejl).
import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { tilføjWatch, fjernWatch, erOvervåget } from '../lib/watchlist';
import { harTilladelse, registrérForPush } from '../lib/notifikationer';

type Props = {
  label: string;       // pænt navn (vises i push)
  term: string;        // normaliseret søgeord (matchning)
  kilde?: string;      // 'klokke' | 'fritekst'
  størrelse?: number;
};

export default function KlokkeKnap({ label, term, kilde = 'klokke', størrelse = 22 }: Props) {
  const [aktiv, setAktiv] = useState(() => erOvervåget(term));

  async function tryk() {
    if (!term) return;
    if (aktiv) {
      setAktiv(false);                       // optimistisk
      const ok = await fjernWatch(term);
      if (!ok) setAktiv(true);               // rul tilbage
      return;
    }
    setAktiv(true);                          // optimistisk
    const ok = await tilføjWatch(label, term, kilde);
    if (!ok) { setAktiv(false); Alert.alert('Hov', 'Kunne ikke gemme overvågningen. Er du logget ind?'); return; }
    // Bed om tilladelse første gang (uden at blokere selve overvågningen)
    if (!(await harTilladelse())) {
      const fik = await registrérForPush();
      if (!fik) {
        Alert.alert('Notifikationer slået fra',
          'Varen overvåges, men du får først besked når du tillader notifikationer (kræver app-opdatering med notifikationer).');
      }
    }
  }

  return (
    <TouchableOpacity onPress={tryk} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.knap}>
      <Ionicons
        name={aktiv ? 'notifications' : 'notifications-outline'}
        size={størrelse}
        color={aktiv ? Colors.green : Colors.inkSoft}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  knap: { padding: 4, alignItems: 'center', justifyContent: 'center' },
});
