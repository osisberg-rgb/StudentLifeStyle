import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

type Props = { amount: string; size?: number };

export default function SparSegl({ amount, size = 80 }: Props) {
  const s = size;
  return (
    <View style={[styles.outer, { width: s, height: s, borderRadius: s / 2, transform: [{ rotate: '-8deg' }] }]}>
      <View style={[styles.ring1, { width: s - 6, height: s - 6, borderRadius: (s - 6) / 2 }]}>
        <View style={[styles.ring2, { width: s - 14, height: s - 14, borderRadius: (s - 14) / 2 }]}>
          <Text style={[styles.label, { fontSize: s * 0.14 }]}>SPAR</Text>
          <Text style={[styles.amount, { fontSize: s * 0.28 }]}>{amount}</Text>
          <Text style={[styles.unit, { fontSize: s * 0.13 }]}>,-</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.yellow,
  },
  ring1: {
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring2: {
    borderWidth: 2,
    borderColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.red,
  },
  label: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  amount: {
    color: '#fff',
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    letterSpacing: -0.5,
    lineHeight: undefined,
  },
  unit: {
    color: '#fff',
    fontFamily: 'BricolageGrotesque_700Bold',
  },
});
