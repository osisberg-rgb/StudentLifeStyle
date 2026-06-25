import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, ActivityIndicator, ImageBackground, Alert,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';
import { slåEffektivPrisOp } from '../constants/tilbudspriser';
import { billedeFor } from '../constants/opskriftBilleder';
import { erFavorit, sætFavorit } from '../lib/favoritter';
import KlokkeKnap from './KlokkeKnap';
import VælgKogebogModal from './VælgKogebogModal';
import { kogebogForOpskrift, sætKogebogForOpskrift, kogebøgerVersion } from '../lib/kogebøger';
import { hentWatchlist, termFraFritekst } from '../lib/watchlist';
import type { Opskrift } from '../types/opskrift';

const KOED_EMOJI: Record<string, string> = {
  Kylling: '🐔',
  Oksekød: '🥩',
  Svinekød: '🐷',
  Alt: '🍽️',
};

type Props = {
  opskrift: Opskrift | null;
  butikker?: string[];
  personer?: number;
  onLuk: () => void;
  onTilføj?: (id: string) => void;
  gemmer?: boolean;
  // Sat → viser "Læg på madplan"-knap (vælg dag bagefter)
  onLægPåPlan?: () => void;
  // Sat for egne (importerede) opskrifter → viser "Rediger"/"Slet"-knapper
  onRediger?: () => void;
  onSlet?: () => void;
};

export default function OpskriftDetaljeModal({ opskrift, butikker, personer, onLuk, onTilføj, gemmer, onLægPåPlan, onRediger, onSlet }: Props) {
  // Favorit-hjertet — synkroniseres når en ny opskrift åbnes
  const [favorit, setFavorit] = useState(false);
  useEffect(() => {
    setFavorit(opskrift ? erFavorit(opskrift.id) : false);
  }, [opskrift?.id]);
  // Hent overvågede varer når modalen åbnes, så 🔔 på ingredienser viser korrekt
  useEffect(() => { if (opskrift) hentWatchlist(); }, [opskrift?.id]);

  // Hvilken kogebog ligger opskriften i? Synkroniseres når en ny åbnes, og
  // når kogebog-storen ændrer sig (kogebøgerVersion bumpes ved valg/opret).
  const [kogebogÅben, setKogebogÅben] = useState(false);
  const [kogebogNavn, setKogebogNavn] = useState<string | null>(null);
  useEffect(() => {
    setKogebogNavn(opskrift ? (kogebogForOpskrift(opskrift.id)?.navn ?? null) : null);
  }, [opskrift?.id, kogebøgerVersion()]);

  async function vælgKogebog(kogebogId: string | null) {
    if (!opskrift) return;
    setKogebogÅben(false);
    const ok = await sætKogebogForOpskrift(opskrift.id, kogebogId);
    if (ok) setKogebogNavn(kogebogId ? (kogebogForOpskrift(opskrift.id)?.navn ?? null) : null);
    else Alert.alert('Fejl', 'Kunne ikke gemme. Er du logget ind?');
  }

  if (!opskrift) return null;

  async function toggleFavorit() {
    if (!opskrift) return;
    const ny = !favorit;
    setFavorit(ny); // optimistisk
    const ok = await sætFavorit(opskrift.id, ny);
    if (!ok) setFavorit(!ny); // rul tilbage ved fejl
  }

  // Vis ALLE ingredienser — også basisvarer (salt, peber, vand, olie, krydderier
  // o.l.) som importeren markerer estimeret+0-pris. De får bare ingen pris/tilbuds-
  // badge nedenfor (slåEffektivPrisOp giver paaTilbud=false for pris 0), og de
  // holdes ude af indkøbsliste/pris-motor i deres egne guards (constants/indkoeb.ts,
  // opskriftPriser.ts). Tidligere filtrerede vi dem væk her, så en gemt opskrift
  // viste færre ingredienser end preview'et ("Tjek opskriften") gjorde.
  const ingredienser = opskrift.ingredienser as any[];

  // Skaler til antal personer i hele opskrift-sæt (samme model som indkøbslisten)
  const basePortioner = opskrift.portioner || 4;
  const gange = personer ? Math.max(1, Math.ceil(personer / basePortioner - 1e-9)) : 1;
  const portionerIAlt = basePortioner * gange;

  const billede = billedeFor(opskrift);

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
                <View style={styles.heroTop}>
                  <TouchableOpacity onPress={toggleFavorit} style={styles.hjerteKnap} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.hjerteTekst}>{favorit ? '❤️' : '🤍'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onLuk} style={styles.lukKnap}>
                    <Text style={styles.lukTekst}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.heroTekst}>
                  <Text style={styles.navn}>{opskrift.navn}</Text>
                  <Text style={styles.meta}>
                    {portionerIAlt} portioner{gange > 1 ? ` (${gange}× opskrift)` : ''} · ⏱ {(opskrift as any).minutter ?? '?'} min · {opskrift.koed}
                  </Text>
                </View>
              </ImageBackground>
            ) : (
              <View style={[styles.hero, styles.heroFallback]}>
                <View style={styles.heroTop}>
                  <TouchableOpacity onPress={toggleFavorit} style={styles.hjerteKnapDark} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.hjerteTekst}>{favorit ? '❤️' : '🤍'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onLuk} style={styles.lukKnapDark}>
                    <Text style={styles.lukTekstDark}>✕</Text>
                  </TouchableOpacity>
                </View>
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
          {/* Kogebog-tilhørsforhold */}
          <TouchableOpacity style={styles.kogebogRække} onPress={() => setKogebogÅben(true)}>
            <Text style={styles.kogebogIkon}>📚</Text>
            <Text style={styles.kogebogTekst} numberOfLines={1}>
              {kogebogNavn ? kogebogNavn : 'Læg i kogebog'}
            </Text>
            <Text style={styles.kogebogSkift}>{kogebogNavn ? 'Skift' : 'Vælg'}</Text>
          </TouchableOpacity>

          {/* Ingredienser */}
          <Text style={styles.sektionTitel}>Ingredienser</Text>
          <View style={styles.ingrediensKort}>
            {ingredienser.map((ing, idx) => {
              const effektiv = slåEffektivPrisOp(ing, butikker);
              return (
                <View key={idx} style={[styles.ingRække, idx < ingredienser.length - 1 && styles.ingRækkeBorder]}>
                  <View style={styles.ingVenstre}>
                    <Text style={styles.ingNavn}>{ing.navn}</Text>
                    <Text style={styles.ingMaengde}>
                      {gange > 1 ? `${gange} × ` : ''}{ing.maengde}
                      {effektiv.paaTilbud ? `  ·  ${effektiv.butik}` : ''}
                    </Text>
                  </View>
                  {effektiv.paaTilbud && (
                    <Text style={styles.ingPrisTilbud}>
                      {effektiv.pris * gange} kr
                    </Text>
                  )}
                  <KlokkeKnap label={ing.navn} term={(ing.soeg?.[0]) ?? termFraFritekst(ing.navn)} størrelse={18} />
                </View>
              );
            })}
          </View>

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

        {/* Knap */}
        {(onLægPåPlan || onTilføj || onRediger || onSlet) && (
          <View style={styles.bund}>
            {onLægPåPlan && (
              <TouchableOpacity style={styles.tilføjKnap} onPress={onLægPåPlan}>
                <Text style={styles.tilføjKnapTekst}>📅 Læg på madplan</Text>
              </TouchableOpacity>
            )}
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
            {(onRediger || onSlet) && (
              <View style={styles.egenRække}>
                {onRediger && (
                  <TouchableOpacity style={[styles.egenKnap, styles.redigerKnap]} onPress={onRediger}>
                    <Text style={styles.redigerKnapTekst}>Rediger opskrift</Text>
                  </TouchableOpacity>
                )}
                {onSlet && (
                  <TouchableOpacity style={[styles.egenKnap, styles.sletKnap]} onPress={onSlet}>
                    <Text style={styles.sletKnapTekst}>Slet</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        <VælgKogebogModal
          synlig={kogebogÅben}
          valgtKogebogId={opskrift ? (kogebogForOpskrift(opskrift.id)?.id ?? null) : null}
          onVælg={vælgKogebog}
          onLuk={() => setKogebogÅben(false)}
        />
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
  heroTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  hjerteKnap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  hjerteKnapDark: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.line, alignItems: 'center', justifyContent: 'center',
  },
  hjerteTekst: { fontSize: 17 },
  lukKnap: {
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
  ingPrisTilbud: { fontSize: 15, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.red, marginLeft: 12 },
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
  tilføjKnap: {
    backgroundColor: Colors.green, borderRadius: Radii.btn,
    padding: 16, alignItems: 'center',
  },
  knapDisabled: { backgroundColor: Colors.line },
  tilføjKnapTekst: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  egenRække: { flexDirection: 'row', gap: 12 },
  egenKnap: {
    borderRadius: Radii.btn, padding: 14, alignItems: 'center',
    borderWidth: 1, backgroundColor: Colors.card,
  },
  redigerKnap: { flex: 1, borderColor: Colors.green },
  redigerKnapTekst: { color: Colors.green, fontSize: 15, fontFamily: 'Inter_700Bold' },
  sletKnap: { borderColor: Colors.red, paddingHorizontal: 24 },
  sletKnapTekst: { color: Colors.red, fontSize: 15, fontFamily: 'Inter_700Bold' },
  kogebogRække: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, padding: 14, marginBottom: 20,
  },
  kogebogIkon: { fontSize: 18 },
  kogebogTekst: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  kogebogSkift: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.green },
});
