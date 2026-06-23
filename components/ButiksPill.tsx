import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StoreColors } from '../constants/theme';

type Props = { name: string };

export default function ButiksPill({ name }: Props) {
  const colors = StoreColors[name] ?? { bg: '#888', text: '#fff' };
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.2,
  },
});
