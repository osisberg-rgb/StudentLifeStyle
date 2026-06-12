// Byt én ret i ugens plan (Milepæl 3): vælg en erstatning og se med det
// samme, hvad den ca. gør ved prisen. Selve genberegningen af indkøbsliste,
// total og besparelse sker deterministisk i PlanerScreen efter valget.
import React from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';
import { OPSKRIFTER } from '../constants/opskrifter';
import { hentOpskriftPriser } from '../constants/opskriftPriser';

type Props = {
  synlig: boolean;
  gammelRet: { id: string; navn: string } | null;
  kost: string[];
  butikker?: string[];
  personer: number;
  eksisterendeIds: string[];
  onLuk: () => void;
  onVælg: (nyId: string) => void;
};

export default function BytRetModal({
  synlig, gammelRet, kost, butikker, personer, eksisterendeIds, onLuk, onVælg,
}: Props) {
  if (!synlig || !gammelRet) return null;

  const priser = hentOpskriftPriser(butikker, personer);
  const gammelPris = priser.get(gammelRet.id)?.pris ?? 0;

  const valgteKoed = kost.filter(k => ['Kylling', 'Oksekød', 'Svinekød'].includes(k));
  const vilHaveAlt = kost.includes('Alt') || valgteKoed.length === 0;
  const kandidater = OPSKRIFTER
    .filter(o => o.id !== gammelRet.id && !eksisterendeIds.includes(o.id))
    .filter(o => vilHaveAlt || valgteKoed.includes(o.koed) || o.koed === 'Alt')
    .map(o => ({ opskrift: o, info: priser.get(o.id) }))
    .sort((a, b) => (a.info?.pris ?? 0) - (b.info?.pris ?? 0));

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onLuk}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.titel}>Byt ret</Text>
            <Text style={styles.sub} numberOfLines={1}>
              Erstatter: {gammelRet.navn} · {gammelPris} kr
            </Text>
          </View>
          <TouchableOpacity onPress={onLuk} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.annuller}>Annuller</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.indhold} showsVerticalScrollIndicator={false}>
          {kandidater.map(({ opskrift, info }) => {
            const pris = info?.pris ?? 0;
            // Ca.-tal: delte pakker på tværs af retter kan flytte det lidt —
            // den præcise total vises efter byttet
            const delta = pris - gammelPris;
            const minutter = (opskrift as any).minutter as number | undefined;
            return (
              <TouchableOpacity
                key={opskrift.id}
                style={styles.række}
                onPress={() => onVælg(opskrift.id)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.navn} numberOfLines={1}>{opskrift.navn}</Text>
                  <Text style={styles.meta}>
                    {info?.portioner ?? opskrift.portioner} port.
                    {minutter ? ` · ⏱ ${minutter} min` : ''}
                    {info?.paaTilbud ? '  ·  ' : ''}
                    {info?.paaTilbud && <Text style={styles.tilbud}>TILBUD −{info.besparelse} kr</Text>}
                  </Text>
                </View>
                <View style={styles.prisKolonne}>
                  <Text style={styles.pris}>{pris} kr</Text>
                  <Text style={[
                    styles.delta,
                    delta < 0 && styles.deltaNed,
                    delta > 0 && styles.deltaOp,
                  ]}>
                    {delta === 0 ? '±0 kr' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} kr`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.canvas },
  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: 20, paddingTop: 14, backgroundColor: Colors.paper,
    borderBottomWidth: 1, borderBottomColor: Colors.line, gap: 12,
  },
  titel: { fontSize: 18, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.3 },
  sub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 2 },
  annuller: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  indhold: { padding: 16, paddingBottom: 32 },
  række: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line,
    padding: 14, marginBottom: 8,
  },
  navn: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  meta: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 3 },
  tilbud: { fontSize: 11, fontFamily: 'Inter_700Bold', color: Colors.red },
  prisKolonne: { alignItems: 'flex-end' },
  pris: { fontSize: 15, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink },
  delta: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft, marginTop: 2 },
  deltaNed: { color: Colors.greenBright },
  deltaOp: { color: Colors.red },
});
