import React from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, ActivityIndicator, ImageBackground,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';
import { OPSKRIFTER } from '../constants/opskrifter';
import { slåEffektivPrisOp } from '../constants/tilbudspriser';
import { hentBillede } from '../constants/opskriftBilleder';

const KOED_EMOJI: Record<string, string> = {
  Kylling: '🐔',
  Oksekød: '🥩',
  Svinekød: '🐷',
  Alt: '🍽️',
};

type Props = {
  opskrift: typeof OPSKRIFTER[0] | null;
  butikker?: string[];
  personer?: number;
  onLuk: () => void;
  onTilføj?: (id: string) => void;
  gemmer?: boolean;
};

export default function OpskriftDetaljeModal({ opskrift, butikker, personer, onLuk, onTilføj, gemmer }: Props) {
  if (!opskrift) return null;

  const ingredienser = (opskrift.ingredienser as any[]).filter(
    i => !(i.estimeret && i.estimereretPris === 0)
  );

  // Skaler til antal personer i hele opskrift-sæt (samme model som indkøbslisten)
  const basePortioner = opskrift.portioner || 4;
  const gange = personer ? Math.max(1, Math.ceil(personer / basePortioner - 1e-9)) : 1;
  const portionerIAlt = basePortioner * gange;

  const total = ingredienser.reduce((sum, i) => sum + slåEffektivPrisOp(i, butikker).pris, 0) * gange;
  const billede = hentBillede(opskrift.id);

  return (
    <Modal
      visible={!!opskrift}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onLuk}
    >
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.indhold} showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
          {/* Hero-billede header */}
          <View>
            {billede ? (
              <ImageBackground source={billede} style={styles.hero} imageStyle={styles.heroImg}>
                <View style={styles.heroOverlay} />
                <TouchableOpacity onPress={onLuk} style={styles.lukKnap}>
                  <Text style={styles.lukTekst}>✕</Text>
                </TouchableOpacity>
                <View style={styles.heroTekst}>
                  <Text style={styles.navn}>{opskrift.navn}</Text>
                  <Text style={styles.meta}>
                    {portionerIAlt} portioner{gange > 1 ? ` (${gange}× opskrift)` : ''} · ⏱ {(opskrift as any).minutter ?? '?'} min · {opskrift.koed}
                  </Text>
                </View>
              </ImageBackground>
            ) : (
              <View style={[styles.hero, styles.heroFallback]}>
                <TouchableOpacity onPress={onLuk} style={styles.lukKnapDark}>
                  <Text style={styles.lukTekstDark}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.heroEmoji}>{KOED_EMOJI[opskrift.koed] ?? '🍽️'}</Text>
                <View style={styles.heroTekst}>
                  <Text style={styles.navnDark}>{opskrift.navn}</Text>
                  <Text style={styles.metaDark}>
                    {portionerIAlt} portioner{gange > 1 ? ` (${gange}× opskrift)` : ''} · ⏱ {(opskrift as any).minutter ?? '?'} min · {opskrift.koed}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.indholdPadding}>
          {/* Ingredienser */}
          <Text style={styles.sektionTitel}>Ingredienser</Text>
          <View style={styles.ingrediensKort}>
            {ingredienser.map((ing, idx) => {
              const effektiv = slåEffektivPrisOp(ing, butikker);
              const erEstimeret = !!ing.estimeret;
              return (
                <View key={idx} style={[styles.ingRække, idx < ingredienser.length - 1 && styles.ingRækkeBorder]}>
                  <View style={styles.ingVenstre}>
                    <Text style={styles.ingNavn}>{ing.navn}</Text>
                    <Text style={styles.ingMaengde}>
                      {gange > 1 ? `${gange} × ` : ''}{ing.maengde}{effektiv.paaTilbud ? `  ·  tilbud i ${effektiv.butik}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.ingPris, erEstimeret && styles.ingPrisEst, effektiv.paaTilbud && styles.ingPrisTilbud]}>
                    {effektiv.pris * gange} kr{erEstimeret ? '*' : ''}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.estimereretNote}>* Estimeret basisvare</Text>

          {/* Fremgangsmåde */}
          {opskrift.fremgangsmaade && opskrift.fremgangsmaade.length > 0 && (
            <>
              <Text style={[styles.sektionTitel, { marginTop: 20 }]}>Fremgangsmåde</Text>
              <View style={styles.fremgangKort}>
                {opskrift.fremgangsmaade.map((trin, idx) => (
                  <View key={idx} style={styles.trinRække}>
                    <View style={styles.trinNummer}>
                      <Text style={styles.trinNummerTekst}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.trinTekst}>{trin}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          </View>{/* /indholdPadding */}
        </ScrollView>

        {/* Total + knap */}
        <View style={styles.bund}>
          <View style={styles.totalRække}>
            <Text style={styles.totalLabel}>Samlet indkøbspris</Text>
            <Text style={styles.totalPris}>{Math.round(total)} kr</Text>
          </View>
          {onTilføj && (
            <TouchableOpacity
              style={[styles.tilføjKnap, gemmer && styles.knapDisabled]}
              onPress={() => onTilføj(opskrift.id)}
              disabled={gemmer}
            >
              {gemmer
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.tilføjKnapTekst}>Tilføj til indkøbsliste</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.canvas },
  indhold: { paddingBottom: 16 },
  indholdPadding: { padding: 20 },

  hero: {
    height: 220, justifyContent: 'space-between',
    padding: 16,
  },
  heroImg: {},
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  heroFallback: {
    backgroundColor: Colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 56, marginBottom: 8 },
  heroTekst: { gap: 2 },
  lukKnap: {
    alignSelf: 'flex-end',
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  lukTekst: { fontSize: 14, color: '#fff', fontFamily: 'Inter_600SemiBold' },
  lukKnapDark: {
    alignSelf: 'flex-end',
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  lukTekstDark: { fontSize: 14, color: Colors.inkSoft, fontFamily: 'Inter_600SemiBold' },
  navn: { fontSize: 20, fontFamily: 'BricolageGrotesque_700Bold', color: '#fff', letterSpacing: -0.3 },
  navnDark: { fontSize: 20, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.3 },
  meta: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  metaDark: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 2 },
  sektionTitel: {
    fontSize: 11, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.green,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
  },
  ingrediensKort: {
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, overflow: 'hidden',
  },
  ingRække: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  ingRækkeBorder: { borderBottomWidth: 1, borderBottomColor: Colors.line },
  ingVenstre: { flex: 1 },
  ingNavn: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  ingMaengde: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 1 },
  ingPris: { fontSize: 15, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, marginLeft: 12 },
  ingPrisEst: { color: Colors.inkSoft },
  ingPrisTilbud: { color: Colors.green },
  estimereretNote: {
    fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.inkSoft,
    marginTop: 6, marginLeft: 4,
  },
  fremgangKort: {
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, padding: 16, gap: 12,
  },
  trinRække: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  trinNummer: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.greenSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  trinNummerTekst: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.green },
  trinTekst: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.ink, lineHeight: 20 },
  bund: {
    padding: 20, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: Colors.line,
    backgroundColor: Colors.paper, gap: 12,
  },
  totalRække: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  totalLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  totalPris: { fontSize: 22, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink },
  tilføjKnap: {
    backgroundColor: Colors.green, borderRadius: Radii.btn,
    padding: 16, alignItems: 'center',
  },
  knapDisabled: { backgroundColor: Colors.line },
  tilføjKnapTekst: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
