import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, Image, ImageBackground,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';
import { OPSKRIFTER } from '../constants/opskrifter';
import { hentOpskriftPriser } from '../constants/opskriftPriser';
import { KATEGORIER, KategoriId } from '../constants/kategorier';
import { findAnbefaledeRetter, måltiderPrRet, MAKS_RETTER, UGE_MAAL } from '../constants/anbefaling';
import { hentBillede } from '../constants/opskriftBilleder';
import { tælTilbudsMatch } from '../constants/tilbudsMatch';

const KOED_EMOJI: Record<string, string> = {
  Kylling: '🐔',
  Oksekød: '🥩',
  Svinekød: '🐷',
  Alt: '🍽️',
};

type Props = {
  synlig: boolean;
  kost: string[];
  budget: number;
  butikker?: string[];
  personer: number;
  forvalgte?: string[] | null;
  onPersonerChange: (n: number) => void;
  onLuk: () => void;
  onGenerer: (ids: string[]) => void;
};

export default function VælgRetterModal({ synlig, kost, budget, butikker, personer, forvalgte, onPersonerChange, onLuk, onGenerer }: Props) {
  const [valgte, setValgte] = useState<string[]>([]);
  const [anbefaletValgt, setAnbefaletValgt] = useState(false);
  const [kategori, setKategori] = useState<KategoriId | null>(null);
  const [kunHurtige, setKunHurtige] = useState(false);

  // Seed fra onboardingens aha-skærm: samme retter = samme tal som brugeren
  // lige har set. Kører kun når modalen åbner med forvalgte sat.
  useEffect(() => {
    if (synlig && forvalgte && forvalgte.length > 0) {
      setValgte(forvalgte.slice(0, MAKS_RETTER));
    }
  }, [synlig, forvalgte]);

  const valgteKoed = kost.filter(k => ['Kylling', 'Oksekød', 'Svinekød'].includes(k));
  const vilHaveAlt = kost.includes('Alt') || valgteKoed.length === 0;
  const tilgængelige = OPSKRIFTER.filter(o =>
    vilHaveAlt || valgteKoed.includes(o.koed) || o.koed === 'Alt'
  );

  // Forudberegnede priser pr. opskrift (med tilbud fra valgte butikker,
  // skaleret til antal personer) — beregnes én gang og caches
  const retPriser = hentOpskriftPriser(butikker, personer);

  // Kategori- og tidsfilter ovenpå kost-filteret. "Billigt" sorteres efter
  // aktuel pris (med tilbud), så ugens billigste ligger øverst.
  const filtrerede = tilgængelige.filter(o =>
    (!kategori || (o.kategorier as string[] | undefined)?.includes(kategori)) &&
    (!kunHurtige || ((o as any).minutter ?? 99) <= 30)
  );
  const viste = kategori === 'billig'
    ? [...filtrerede].sort((a, b) =>
        tælTilbudsMatch(b.id, butikker).antal - tælTilbudsMatch(a.id, butikker).antal
      )
    : filtrerede;

  // Anbefalingen genberegnes kun når modalen er åben og input ændrer sig
  const kostNøgle = kost.join(',');
  const butikNøgle = (butikker ?? []).join(',');
  const anbefaletIds = useMemo(
    () => (synlig && filtrerede.length >= 2 ? findAnbefaledeRetter(filtrerede, budget, butikker, personer) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [synlig, kostNøgle, butikNøgle, budget, kategori, personer, kunHurtige]
  );

  // Komponenten er permanent monteret i PlanerScreen og kører ved hvert
  // re-render dér — uden denne guard bygges hele grid'et med alle
  // opskriftskort forgæves, hver gang, selv om modalen er lukket.
  // (Skal stå EFTER alle hooks — hooks må ikke springes over.)
  if (!synlig) return null;

  function vælgKategori(id: KategoriId | null) {
    setKategori(id);
    setAnbefaletValgt(false);
  }

  function toggleRet(id: string) {
    setAnbefaletValgt(false);
    setValgte(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      // Stop når ugen er fyldt: enten 7 retter eller 7 dækkede aftensmåltider
      if (prev.length >= MAKS_RETTER || dækkedeMåltider >= UGE_MAAL) return prev;
      return [...prev, id];
    });
  }

  function vælgAnbefalet() {
    if (anbefaletValgt) {
      // Tryk igen = fortryd anbefalingen
      setValgte([]);
      setAnbefaletValgt(false);
    } else {
      setValgte(anbefaletIds);
      setAnbefaletValgt(true);
    }
  }

  function håndterGenerer() {
    if (valgte.length < 2) return;
    onGenerer(valgte);
    setValgte([]);
    setAnbefaletValgt(false);
    setKategori(null);
    setKunHurtige(false);
    onLuk();
  }

  function håndterAnnuller() {
    setValgte([]);
    setAnbefaletValgt(false);
    setKategori(null);
    setKunHurtige(false);
    onLuk();
  }

  // Valget er altid `valgte` — anbefalingen seeder det bare, så man frit
  // kan fjerne/udskifte enkelte retter bagefter
  const aktivValgte = valgte;
  // Hvor mange aftensmåltider dækker valget? (rester tæller med)
  const dækkedeMåltider = aktivValgte.reduce((sum, id) => {
    const info = retPriser.get(id);
    return sum + (info ? måltiderPrRet(info.portioner, personer) : 1);
  }, 0);
  const anbefaletMåltider = anbefaletIds.reduce((sum, id) => {
    const info = retPriser.get(id);
    return sum + (info ? måltiderPrRet(info.portioner, personer) : 1);
  }, 0);
  const anbefaletTilbud = anbefaletIds.reduce((sum, id) =>
    sum + tælTilbudsMatch(id, butikker).antal, 0
  );

  return (
    <Modal visible={synlig} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={håndterAnnuller}>
            <Text style={styles.annuller}>Annuller</Text>
          </TouchableOpacity>
          <Text style={styles.titel}>Vælg retter</Text>
          <Text style={styles.tæller}>{dækkedeMåltider}/{UGE_MAAL} måltider</Text>
        </View>

        {/* Antal personer + tidsfilter */}
        <View style={styles.personerRække}>
          <View style={styles.personerVenstre}>
          <Text style={styles.personerLabel}>👥 Personer</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepKnap, personer <= 1 && styles.stepKnapDisabled]}
              onPress={() => onPersonerChange(Math.max(1, personer - 1))}
              disabled={personer <= 1}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.stepTekst}>−</Text>
            </TouchableOpacity>
            <Text style={styles.personerVærdi}>{personer}</Text>
            <TouchableOpacity
              style={[styles.stepKnap, personer >= 8 && styles.stepKnapDisabled]}
              onPress={() => onPersonerChange(Math.min(8, personer + 1))}
              disabled={personer >= 8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.stepTekst}>+</Text>
            </TouchableOpacity>
          </View>
          </View>
          <TouchableOpacity
            style={[styles.tidChip, kunHurtige && styles.tidChipAktiv]}
            onPress={() => setKunHurtige(v => !v)}
          >
            <Text style={[styles.tidChipTekst, kunHurtige && styles.tidChipTekstAktiv]}>
              ⏱ Maks 30 min
            </Text>
          </TouchableOpacity>
        </View>

        {/* Kategori-chips */}
        <View style={styles.chipsRække}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsIndhold}>
            <TouchableOpacity
              style={[styles.chip, !kategori && styles.chipAktiv]}
              onPress={() => vælgKategori(null)}
            >
              <Text style={[styles.chipTekst, !kategori && styles.chipTekstAktiv]}>Alle</Text>
            </TouchableOpacity>
            {KATEGORIER.map(k => (
              <TouchableOpacity
                key={k.id}
                style={[styles.chip, kategori === k.id && styles.chipAktiv]}
                onPress={() => vælgKategori(kategori === k.id ? null : k.id)}
              >
                <Text style={[styles.chipTekst, kategori === k.id && styles.chipTekstAktiv]}>
                  {k.emoji} {k.navn}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView contentContainerStyle={styles.indhold} showsVerticalScrollIndicator={false}>
          {/* Anbefalet banner — kun når der er nok retter at anbefale ud fra */}
          {filtrerede.length >= 2 && (
            <>
              <TouchableOpacity
                style={[styles.anbefaletBanner, anbefaletValgt && styles.anbefaletBannerValgt]}
                onPress={vælgAnbefalet}
                activeOpacity={0.8}
              >
                <View style={styles.anbefaletVenstre}>
                  <Text style={styles.anbefaletEmoji}>✨</Text>
                  <View>
                    <Text style={[styles.anbefaletTitel, anbefaletValgt && styles.anbefaletTitelValgt]}>
                      {kategori
                        ? `Anbefalet · ${KATEGORIER.find(k => k.id === kategori)?.navn}`
                        : 'Anbefalet ud fra dit budget'}
                    </Text>
                    <Text style={[styles.anbefaletSub, anbefaletValgt && styles.anbefaletSubValgt]}>
                      {anbefaletIds.length} retter · {anbefaletMåltider} måltider{anbefaletTilbud > 0 ? ` · 🏷 ${anbefaletTilbud} tilbuds-varer` : ''}
                    </Text>
                  </View>
                </View>
                <View style={[styles.anbefaletCheck, anbefaletValgt && styles.anbefaletCheckValgt]}>
                  {anbefaletValgt
                    ? <Text style={styles.checkMærke}>✓</Text>
                    : <Text style={styles.anbefaletPil}>›</Text>
                  }
                </View>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLinje} />
                <Text style={styles.dividerTekst}>eller vælg selv</Text>
                <View style={styles.dividerLinje} />
              </View>
            </>
          )}

          {/* Tom kategori */}
          {viste.length === 0 && (
            <View style={styles.tomKategori}>
              <Text style={styles.tomKategoriEmoji}>🔍</Text>
              <Text style={styles.tomKategoriTekst}>
                Ingen retter i denne kategori med dit kost-valg
              </Text>
            </View>
          )}

          {/* Grid af opskrifter */}
          <View style={styles.grid}>
            {viste.map(o => {
              const erValgt = aktivValgte.includes(o.id);
              const info = retPriser.get(o.id);
              const kanTilføje = erValgt ||
                (aktivValgte.length < MAKS_RETTER && dækkedeMåltider < UGE_MAAL);
              const aftener = info ? måltiderPrRet(info.portioner, personer) : 1;

              const billede = hentBillede(o.id);
              const tilbudsMatch = tælTilbudsMatch(o.id, butikker);
              const tilbudBadge = tilbudsMatch.antal > 0 ? (
                <View style={styles.tilbudBadge}>
                  <Text style={styles.tilbudBadgeTekst}>🏷 {tilbudsMatch.antal}</Text>
                </View>
              ) : null;
              const tidBadge = (o as any).minutter ? (
                <View style={styles.tidBadge}>
                  <Text style={styles.tidBadgeTekst}>⏱ {(o as any).minutter} min</Text>
                </View>
              ) : null;
              return (
                <View key={o.id} style={[styles.kort, erValgt && styles.kortValgt]}>
                  {/* Billede eller emoji baggrund */}
                  {billede ? (
                    <ImageBackground
                      source={billede}
                      style={[styles.kortBillede]}
                      imageStyle={styles.kortBilledeImg}
                    >
                      {erValgt && <View style={styles.kortValgtOverlay} />}
                      {tilbudBadge}
                      {tidBadge}
                      <TouchableOpacity
                        style={[styles.tilføjKnap, erValgt && styles.tilføjKnapValgt, !kanTilføje && styles.tilføjKnapDisabled]}
                        onPress={() => toggleRet(o.id)}
                        disabled={!kanTilføje && !erValgt}
                      >
                        <Text style={styles.tilføjKnapIkon}>{erValgt ? '✓' : '+'}</Text>
                      </TouchableOpacity>
                    </ImageBackground>
                  ) : (
                    <View style={[styles.kortBillede, erValgt && styles.kortBilledeValgt]}>
                      <Text style={styles.kortEmoji}>{KOED_EMOJI[o.koed] ?? '🍽️'}</Text>
                      {tilbudBadge}
                      {tidBadge}
                      <TouchableOpacity
                        style={[styles.tilføjKnap, erValgt && styles.tilføjKnapValgt, !kanTilføje && styles.tilføjKnapDisabled]}
                        onPress={() => toggleRet(o.id)}
                        disabled={!kanTilføje && !erValgt}
                      >
                        <Text style={styles.tilføjKnapIkon}>{erValgt ? '✓' : '+'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {/* Info */}
                  <View style={styles.kortInfo}>
                    <Text style={[styles.kortNavn, erValgt && styles.kortNavnValgt]} numberOfLines={2}>
                      {o.navn}
                    </Text>
                    <View style={styles.kortMeta}>
                      <Text style={styles.kortPortioner} numberOfLines={1}>
                        👤 {info ? info.portioner : o.portioner} port.{aftener > 1
                          ? ` · ${aftener} aftener`
                          : info && info.gangeOpskrift > 1 ? ` · ${info.gangeOpskrift}×` : ''}
                      </Text>
                      {tilbudsMatch.butikker.length > 0 && (
                        <Text style={styles.kortButik} numberOfLines={1}>
                          {tilbudsMatch.butikker[0]}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Bund med total + knap */}
        <View style={styles.bund}>
          {aktivValgte.length > 0 && (
            <View style={styles.totalRække}>
              <Text style={styles.totalLabel}>
                {aktivValgte.length} retter · dækker {dækkedeMåltider} aftensmåltider
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.genererKnap, aktivValgte.length < 2 && styles.genererKnapDisabled]}
            onPress={håndterGenerer}
            disabled={aktivValgte.length < 2}
          >
            <Text style={styles.genererKnapTekst}>
              {aktivValgte.length < 2
                ? 'Vælg mindst 2 retter'
                : `Generer madplan`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.canvas },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, paddingTop: 12, backgroundColor: Colors.paper,
    borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  annuller: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, minWidth: 70 },
  titel: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink },
  tæller: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.green, minWidth: 70, textAlign: 'right' },
  indhold: { padding: 16, paddingBottom: 16 },

  personerRække: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Colors.paper,
    borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  personerLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  personerVenstre: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tidChip: {
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.line,
  },
  tidChipAktiv: { backgroundColor: Colors.green, borderColor: Colors.green },
  tidChipTekst: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  tidChipTekstAktiv: { color: '#fff' },
  tidBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  tidBadgeTekst: { color: '#fff', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepKnap: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  stepKnapDisabled: { opacity: 0.35 },
  stepTekst: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.ink },
  personerVærdi: {
    fontSize: 16, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink,
    minWidth: 22, textAlign: 'center',
  },

  chipsRække: {
    backgroundColor: Colors.paper,
    borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  chipsIndhold: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.line,
  },
  chipAktiv: { backgroundColor: Colors.green, borderColor: Colors.green },
  chipTekst: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  chipTekstAktiv: { color: '#fff' },

  tomKategori: { alignItems: 'center', padding: 32 },
  tomKategoriEmoji: { fontSize: 40, marginBottom: 10 },
  tomKategoriTekst: {
    fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft,
    textAlign: 'center', lineHeight: 20,
  },

  anbefaletBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.greenSoft, borderRadius: Radii.card,
    borderWidth: 1.5, borderColor: Colors.green, padding: 16, marginBottom: 16,
  },
  anbefaletBannerValgt: { backgroundColor: Colors.green },
  anbefaletVenstre: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  anbefaletEmoji: { fontSize: 26 },
  anbefaletTitel: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.green },
  anbefaletTitelValgt: { color: '#fff' },
  anbefaletSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 2 },
  anbefaletSubValgt: { color: 'rgba(255,255,255,0.8)' },
  anbefaletCheck: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.green,
    alignItems: 'center', justifyContent: 'center',
  },
  anbefaletCheckValgt: { backgroundColor: 'rgba(255,255,255,0.3)', borderColor: 'transparent' },
  checkMærke: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  anbefaletPil: { fontSize: 18, color: Colors.green, fontFamily: 'Inter_700Bold' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  dividerLinje: { flex: 1, height: 1, backgroundColor: Colors.line },
  dividerTekst: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kort: {
    width: '47.5%',
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, overflow: 'hidden',
  },
  kortValgt: { borderColor: Colors.green, borderWidth: 2 },
  kortBillede: {
    height: 100, backgroundColor: Colors.canvas,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  kortBilledeImg: { borderTopLeftRadius: Radii.card, borderTopRightRadius: Radii.card },
  kortBilledeValgt: { backgroundColor: Colors.greenSoft },
  kortValgtOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(74,175,90,0.25)',
    borderTopLeftRadius: Radii.card,
    borderTopRightRadius: Radii.card,
  },
  kortEmoji: { fontSize: 48 },
  tilbudBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: Colors.red, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  tilbudBadgeTekst: { color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold' },
  tilføjKnap: {
    position: 'absolute', top: 8, right: 8,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.green,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
  },
  tilføjKnapValgt: { backgroundColor: Colors.greenBright },
  tilføjKnapDisabled: { backgroundColor: Colors.line },
  tilføjKnapIkon: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
  kortInfo: { padding: 10 },
  kortNavn: {
    fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.ink,
    marginBottom: 6, lineHeight: 18,
  },
  kortNavnValgt: { color: Colors.green },
  kortMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4 },
  kortPortioner: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, flex: 1 },
  kortButik: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },

  bund: {
    padding: 20, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: Colors.line,
    backgroundColor: Colors.paper, gap: 10,
  },
  totalRække: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  totalLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  genererKnap: {
    backgroundColor: Colors.green, borderRadius: Radii.btn,
    padding: 16, alignItems: 'center',
  },
  genererKnapDisabled: { backgroundColor: Colors.line },
  genererKnapTekst: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
