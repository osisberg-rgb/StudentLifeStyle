import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/theme';

type Props = {
  label: string;
  active: boolean;
  onPress: () => void;
};

export default function Chip({ label, active, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {active && <View style={styles.dot} />}
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.line,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: Colors.card,
  },
  chipActive: {
    backgroundColor: Colors.greenSoft,
    borderColor: Colors.green,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.green,
    marginRight: 6,
  },
  text: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.inkSoft,
  },
  textActive: {
    color: Colors.green,
  },
});
