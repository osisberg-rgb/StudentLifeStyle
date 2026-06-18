// Halvskærms bund-ark der åbnes af den centrale "+"-knap. Lader brugeren vælge
// HVORDAN en opskrift tilføjes — foto, screenshot, link eller skriv selv —
// inspireret af ReciMes "Add a recipe". Selve flowet håndteres af kalderen
// (App.tsx) via onVælg. Kan trækkes ned for at lukke (react-native-gesture-handler;
// PanResponder virker ikke pålideligt inde i en RN Modal på Android).
import React, { useRef, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
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
  // Træk-ned-for-at-lukke. dragY = rå træk-afstand; translateY klamper opad-træk
  // til 0, så arket kun kan trækkes NED. Lukker hvis man trækker forbi ~120px
  // eller flicker hurtigt; ellers springer det tilbage.
  const dragY = useRef(new Animated.Value(0)).current;
  const translateY = dragY.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateLeft: 'clamp' });
  useEffect(() => { if (synlig) dragY.setValue(0); }, [synlig, dragY]);

  const onGestureEvent = Animated.event([{ nativeEvent: { translationY: dragY } }], { useNativeDriver: true });

  function onStateChange(e: { nativeEvent: { state: number; translationY: number; velocityY: number } }) {
    if (e.nativeEvent.state !== State.END) return;
    const { translationY, velocityY } = e.nativeEvent;
    if (translationY > 120 || velocityY > 800) {
      Animated.timing(dragY, { toValue: 600, duration: 180, useNativeDriver: true })
        .start(() => { onLuk(); dragY.setValue(0); });
    } else {
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    }
  }

  return (
    <Modal visible={synlig} transparent animationType="slide" onRequestClose={onLuk}>
      {/* GestureHandlerRootView er PÅKRÆVET inde i en RN Modal for at gestures virker */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.overlay}>
          {/* Dæmpet baggrund — tryk lukker */}
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onLuk} />
          {/* activeOffsetY: panen aktiveres først ved >12px NEDADGÅENDE træk, så
              et almindeligt tryk på kortene stadig registreres som tryk */}
          <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onStateChange} activeOffsetY={12}>
            <Animated.View style={[styles.ark, { transform: [{ translateY }] }]}>
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
          </PanGestureHandler>
        </View>
      </GestureHandlerRootView>
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
