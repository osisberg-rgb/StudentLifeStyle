// Halvskærms bund-ark der åbnes af den centrale "+"-knap. Lader brugeren vælge
// HVORDAN en opskrift tilføjes — foto, screenshot, link eller skriv selv —
// inspireret af ReciMes "Add a recipe". Selve flowet håndteres af kalderen
// (App.tsx) via onVælg.
import React, { useRef, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii } from '../constants/theme';

export type TilføjMetode = 'kamera' | 'galleri' | 'link' | 'skriv';

type Props = {
  synlig: boolean;
  onVælg: (metode: TilføjMetode) => void;
  onLuk: () => void;
};

const VALG: { key: TilføjMetode; ikon: keyof typeof Ionicons.glyphMap; titel: string; sub: string }[] = [
  { key: 'galleri', ikon: 'image-outline',  titel: 'Upload foto',      sub: 'Billede eller screenshot' },
  { key: 'kamera',  ikon: 'camera-outline', titel: 'Tag billede',      sub: 'Fotografér opskriften' },
  { key: 'link',    ikon: 'link-outline',   titel: 'Importér fra link', sub: 'Indsæt et opskrifts-link' },
  { key: 'skriv',   ikon: 'create-outline', titel: 'Skriv selv',        sub: 'Indtast den manuelt' },
];

export default function TilføjOpskriftSheet({ synlig, onVælg, onLuk }: Props) {
  // Træk-ned-for-at-lukke: arket følger fingeren nedad og lukker hvis man
  // trækker langt nok (eller flicker hurtigt); ellers springer det tilbage.
  const translateY = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (synlig) translateY.setValue(0); }, [synlig, translateY]);

  const panResponder = PanResponder.create({
    // Brug CAPTURE-fasen: arket opfanger en tydelig NEDADGÅENDE træk-bevægelse
    // FØR kortene — ellers holder kortets TouchableOpacity på touch'en når man
    // begynder trækket oven på et kort. Et almindeligt tryk (uden bevægelse)
    // når aldrig tærsklen, så kortene kan stadig trykkes.
    onMoveShouldSetPanResponderCapture: (_, g) => g.dy > 6 && g.dy > Math.abs(g.dx),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 120 || g.vy > 0.6) {
        Animated.timing(translateY, { toValue: 600, duration: 180, useNativeDriver: false })
          .start(() => onLuk());
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: false, bounciness: 4 }).start();
      }
    },
  });

  return (
    <Modal visible={synlig} transparent animationType="slide" onRequestClose={onLuk}>
      <View style={styles.overlay}>
        {/* Dæmpet baggrund — tryk lukker */}
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onLuk} />
        <Animated.View style={[styles.ark, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>
          <View style={styles.greb} />
          <Text style={styles.titel}>Tilføj opskrift</Text>
          <View style={styles.grid}>
            {VALG.map(v => (
              <TouchableOpacity
                key={v.key}
                style={styles.kort}
                activeOpacity={0.85}
                onPress={() => onVælg(v.key)}
              >
                <View style={styles.ikonCirkel}>
                  <Ionicons name={v.ikon} size={22} color={Colors.green} />
                </View>
                <Text style={styles.kortTitel}>{v.titel}</Text>
                <Text style={styles.kortSub}>{v.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  ark: {
    backgroundColor: Colors.paper,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36,
  },
  greb: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.line, alignSelf: 'center', marginBottom: 18 },
  titel: { fontSize: 18, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, textAlign: 'center', marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  kort: {
    width: '47.5%',
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line,
    padding: 16, marginBottom: 4,
  },
  ikonCirkel: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.greenSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  kortTitel: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.ink },
  kortSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 2 },
});
