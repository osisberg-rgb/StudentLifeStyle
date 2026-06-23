// Brandet loading-animation til MadUgen. Erstatter den generiske
// ActivityIndicator de steder hvor en hel skærm/flade venter. Bygget med
// React Natives Animated (ingen CSS-keyframes i RN), tematiseret til appens
// palette. Første variant: 'gryde' — en lille gryde der hopper, med et
// bankende hjerte, et vipppende blad og stigende damp.
//
// API'et har en `variant`-prop, så de øvrige loaders (opskriftskort, indkøbs-
// pose, tilbudstag, madplan-grid) kan tilføjes som nye cases senere.
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors } from '../constants/theme';

export type LoaderVariant = 'gryde';

type Props = {
  variant?: LoaderVariant;
  tekst?: string;
  hint?: string;
};

export default function Loader({ variant = 'gryde', tekst, hint }: Props) {
  return (
    <View style={styles.wrap}>
      {variant === 'gryde' && <GrydeAnimation />}
      {!!tekst && <Text style={styles.tekst}>{tekst}</Text>}
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

function GrydeAnimation() {
  const bounce = useRef(new Animated.Value(0)).current; // gryden hopper
  const heart = useRef(new Animated.Value(0)).current;  // hjertet banker
  const leaf = useRef(new Animated.Value(0)).current;   // bladet vipper
  const s1 = useRef(new Animated.Value(0)).current;     // damp 1-3
  const s2 = useRef(new Animated.Value(0)).current;
  const s3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Frem-og-tilbage-loop (0→1→0) til de blide, gentagne bevægelser
    const pingPong = (val: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration: dur / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: dur / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
    // Damp: én vej op (0→1), loop nulstiller til 0 før næste — fast 1.8s periode
    const rise = (val: Animated.Value) =>
      Animated.loop(Animated.timing(val, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }));

    const loops = [pingPong(bounce, 1800), pingPong(heart, 1400), pingPong(leaf, 2000)];
    const sl1 = rise(s1), sl2 = rise(s2), sl3 = rise(s3);
    loops.forEach(l => l.start());
    sl1.start();
    // Forskudt start, så de tre dampskyer er konstant ude af fase
    const t2 = setTimeout(() => sl2.start(), 250);
    const t3 = setTimeout(() => sl3.start(), 500);
    return () => {
      clearTimeout(t2); clearTimeout(t3);
      [...loops, sl1, sl2, sl3].forEach(l => l.stop());
    };
  }, []);

  const potY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  const heartScale = heart.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const leafRotate = leaf.interpolate({ inputRange: [0, 1], outputRange: ['35deg', '48deg'] });

  const steamStyle = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.5, 0] }),
    transform: [
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, -26] }) },
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.1] }) },
    ],
  });

  return (
    <View style={styles.potLoader}>
      <Animated.View style={[styles.leaf, { transform: [{ rotate: leafRotate }] }]} />
      <Animated.View style={[styles.steam, styles.steam1, steamStyle(s1)]} />
      <Animated.View style={[styles.steam, styles.steam2, steamStyle(s2)]} />
      <Animated.View style={[styles.steam, styles.steam3, steamStyle(s3)]} />
      <Animated.View style={[styles.potBody, { transform: [{ translateY: potY }] }]}>
        <View style={[styles.handle, styles.handleLeft]} />
        <View style={[styles.handle, styles.handleRight]} />
        <Animated.View style={[styles.heartWrap, { transform: [{ rotate: '45deg' }, { scale: heartScale }] }]}>
          <View style={styles.heartSquare} />
          <View style={[styles.heartLobe, styles.heartLobeLeft]} />
          <View style={[styles.heartLobe, styles.heartLobeTop]} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const GREEN = Colors.green;       // grydens omrids
const CORAL = Colors.red;         // hjertet
const OLIVE = Colors.greenBright; // bladet

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  // paddingHorizontal: giver glyfferne luft, så hverken iOS eller Android klipper
  // sidste bogstav af en centreret enkeltlinje (sub-pixel-afrunding af tekstbredden).
  tekst: { marginTop: 20, paddingHorizontal: 16, fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink, textAlign: 'center' },
  hint: { marginTop: 6, paddingHorizontal: 16, fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textAlign: 'center' },

  potLoader: { width: 96, height: 96, position: 'relative' },

  potBody: {
    position: 'absolute', bottom: 10, left: 18, width: 60, height: 38,
    borderWidth: 4, borderColor: GREEN,
    borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
  },
  handle: {
    position: 'absolute', top: 6, width: 16, height: 12,
    borderWidth: 4, borderColor: GREEN, borderRadius: 8, backgroundColor: 'transparent',
  },
  handleLeft: { left: -18 },
  handleRight: { right: -18 },

  heartWrap: { position: 'absolute', left: 23, top: 11, width: 14, height: 14 },
  heartSquare: { position: 'absolute', width: 14, height: 14, backgroundColor: CORAL },
  heartLobe: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: CORAL },
  heartLobeLeft: { left: -7 },
  heartLobeTop: { top: -7 },

  leaf: {
    position: 'absolute', top: 2, left: 44, width: 18, height: 28, backgroundColor: OLIVE,
    borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: 0,
  },

  steam: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.inkSoft },
  steam1: { left: 32, bottom: 58 },
  steam2: { left: 46, bottom: 58 },
  steam3: { left: 60, bottom: 58 },
});
