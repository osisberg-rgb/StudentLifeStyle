// Letvægts søjlediagram over besparelsen uge for uge — ingen chart-bibliotek,
// bare Views (samme flade stil som progress-barerne i appen).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import { BesparelsesUge } from '../constants/besparelse';

type Props = {
  uger: BesparelsesUge[];
  maks?: number;   // højst så mange søjler (de nyeste) — holder grafen læsbar
  højde?: number;
};

export default function BesparelseGraf({ uger, maks = 12, højde = 56 }: Props) {
  const data = uger.slice(-maks);
  if (data.length === 0) return null;
  const maxVal = Math.max(1, ...data.map(u => u.tilbud));

  return (
    <View>
      <View style={[styles.række, { height: højde }]}>
        {data.map((u, i) => {
          // Mindst 3 px, så uger uden tilbud stadig ses som en stub
          const h = Math.max(3, Math.round((u.tilbud / maxVal) * højde));
          return (
            <View key={i} style={styles.søjleWrap}>
              <View style={[styles.søjle, { height: h }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.labelRække}>
        <Text style={styles.label}>Uge {data[0].uge}</Text>
        {data.length > 1 && <Text style={styles.label}>Uge {data[data.length - 1].uge}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  række: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  søjleWrap: { flex: 1, justifyContent: 'flex-end' },
  søjle: { width: '100%', backgroundColor: Colors.greenBright, borderRadius: 3 },
  labelRække: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  label: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
});
