import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, Image, ImageBackground, Alert, TextInput,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';
import { alleOpskrifter, sletBrugerOpskrift } from '../lib/brugerOpskrifter';
import { hentOpskriftPriser } from '../constants/opskriftPriser';
import { KATEGORIER, KategoriId } from '../constants/kategorier';
import { måltiderPrRet, MAKS_RETTER, UGE_MAAL } from '../constants/anbefaling';
import { billedeFor } from '../constants/opskriftBilleder';
import { tælTilbudsMatch } from '../constants/tilbudsMatch';
import ButiksPill from './ButiksPill';
import ImportOpskriftModal from './ImportOpskriftModal';
import OpskriftDetaljeModal from './OpskriftDetaljeModal';
import RedigerOpskriftModal from './RedigerOpskriftModal';
import TilføjOpskriftSheet, { TilføjMetode } from './TilføjOpskriftSheet';
import ImportKogebogModal from './ImportKogebogModal';
import { erFavorit } from '../lib/favoritter';
import {
  kogebøger, opskrifterIKogebog, antalIKogebog, kogebogForOpskrift,
  opretKogebog, omdøbKogebog, sletKogebog, sætKogebogForOpskrift,
} from '../lib/kogebøger';
import NavngivModal from './NavngivModal';
import type { Opskrift } from '../types/opskrift';

// Ud over de statiske kategorier kan man filtrere på sine favoritter og
// sine egne importerede opskrifter
type Filter = KategoriId | 'favoritter' | 'mine' | 'kogeboeger';

// Virtuelle "kogebøger" i reolen: alle egne opskrifter / dem uden kogebog.
// Genbruger drill-in (valgtKogebog) via sentinel-id'er.
const ALLE_MINE = '__alle_mine__';
const UDEN_KOGEBOG = '__uden_kogebog__';
const erRigtigKogebog = (id: string | null): id is string =>
  !!id && id !== ALLE_MINE && id !== UDEN_KOGEBOG;

const KOED_EMOJI: Record<string, string> = {
  Kylling: '🐔',
  Oksekød: '🥩',
  Svinekød: '🐷',
  Alt: '🍽️',
};

type Props = {
  synlig: boolean;
  butikker?: string[];
  personer: number;
  forvalgte?: string[] | null;
  onPersonerChange: (n: number) => void;
  onLuk: () => void;
  // Valgte retter → læg dem på ÉN dag man selv vælger (1 eller flere ad gangen)
  onVælgEnRet: (ids: string[]) => void;
  // Sat når vælgeren er åbnet FOR en bestemt dag (via "Byt" eller tryk på dag).
  // enkeltValg = true ved "byt" (man udskifter præcis én ret); ellers kan man
  // vælge flere retter til samme dag (fx salat + hovedret + brød).
  målDag?: { index: number; dagNavn: string; enkeltValg?: boolean } | null;
  onVælgTilDag?: (ids: string[]) => void;
};

export default function VælgRetterModal({ synlig, butikker, personer, forvalgte, onPersonerChange, onLuk, onVælgEnRet, målDag, onVælgTilDag }: Props) {
  const dagMode = !!målDag;
  // Kun "byt"-flowet er enkelt-valg; tilføj-til-dag tillader flere retter
  const enkeltValg = !!målDag?.enkeltValg;
  const [valgte, setValgte] = useState<string[]>([]);
  const [kategori, setKategori] = useState<Filter | null>(null);
  // Drill-in: når en kogebog er åbnet, filtreres grid'et til dens opskrifter.
  const [valgtKogebog, setValgtKogebog] = useState<string | null>(null);
  // Opret/omdøb-navngivning (omdøb sætter et id; opret = null-id)
  const [navngiv, setNavngiv] = useState<{ id: string | null; start: string } | null>(null);
  const [søg, setSøg] = useState('');
  // "+"-arket (halvskærm, 4 valg) → samme flow som den centrale +-knap
  const [sheetÅben, setSheetÅben] = useState(false);
  const [metode, setMetode] = useState<'kamera' | 'galleri' | 'link' | null>(null);
  const [importÅben, setImportÅben] = useState(false);
  const [kogebogImportÅben, setKogebogImportÅben] = useState(false);
  // Opskrift man kigger ind i (ren visning — uden at vælge den)
  const [seOpskrift, setSeOpskrift] = useState<Opskrift | null>(null);
  // Egen opskrift man redigerer i (eller en tom skabelon når man skriver ny ind)
  const [redigerOpskrift, setRedigerOpskrift] = useState<Opskrift | null>(null);
  const [erNyOpskrift, setErNyOpskrift] = useState(false);
  // Bumpes når en opskrift er importeret — tvinger gridet til at gen-læse
  // alleOpskrifter(), så den nye ret straks dukker op
  const [, setImportNonce] = useState(0);

  // Seed fra onboardingens aha-skærm: samme retter = samme tal som brugeren
  // lige har set. Kører kun når modalen åbner med forvalgte sat.
  useEffect(() => {
    if (synlig && forvalgte && forvalgte.length > 0) {
      setValgte(forvalgte.slice(0, MAKS_RETTER));
    }
  }, [synlig, forvalgte]);

  // Kostpræferencer er fjernet — vis ALLE opskrifter, filtrér ikke på kødtype.
  const tilgængelige = alleOpskrifter();

  // Forudberegnede priser pr. opskrift (med tilbud fra valgte butikker,
  // skaleret til antal personer) — beregnes én gang og caches
  const retPriser = hentOpskriftPriser(butikker, personer);

  // Søgning: matcher på rettens navn ELLER en af dens ingredienser
  const søgQ = søg.trim().toLowerCase();

  // Kategori-, søge- og tidsfilter.
  const filtrerede = tilgængelige.filter(o => {
    const kat = o.kategorier as string[] | undefined;
    const matcherKategori = !kategori
      || (kategori === 'favoritter'
        ? erFavorit(o.id)
        : kategori === 'mine'
          ? !!o.importeret
          : kategori === 'kogeboeger'
            ? valgtKogebog === ALLE_MINE
              ? !!o.importeret
              : valgtKogebog === UDEN_KOGEBOG
                ? (!!o.importeret && !kogebogForOpskrift(o.id))
                : (valgtKogebog ? opskrifterIKogebog(valgtKogebog).includes(o.id) : false)
            : kategori === 'aftensmad'
              // Aftensmad = alt der ikke er tagget suppe, salat eller brød
              ? !(kat?.includes('suppe') || kat?.includes('salat') || kat?.includes('broed') || kat?.includes('dessert'))
              : kat?.includes(kategori));
    const matcherSøg = !søgQ
      || o.navn.toLowerCase().includes(søgQ)
      || (o.ingredienser ?? []).some((i: any) => (i.navn ?? '').toLowerCase().includes(søgQ));
    return matcherKategori && matcherSøg;
  });
  const viste = filtrerede;

  // Komponenten er permanent monteret i PlanerScreen og kører ved hvert
  // re-render dér — uden denne guard bygges hele grid'et med alle
  // opskriftskort forgæves, hver gang, selv om modalen er lukket.
  // (Skal stå EFTER alle hooks — hooks må ikke springes over.)
  if (!synlig) return null;

  function vælgKategori(id: Filter | null) {
    setKategori(id);
  }

  // Skift til kogebog-reolen (eller væk fra den). Nulstiller drill-in.
  function vælgKogebøger() {
    setValgtKogebog(null);
    setKategori(kategori === 'kogeboeger' ? null : 'kogeboeger');
  }

  async function gemNavngivning(navn: string) {
    const mål = navngiv;
    setNavngiv(null);
    if (!mål) return;
    if (mål.id) {
      const ok = await omdøbKogebog(mål.id, navn);
      if (!ok) Alert.alert('Fejl', 'Kunne ikke omdøbe kogebogen.');
      else setImportNonce(n => n + 1);
    } else {
      const k = await opretKogebog(navn);
      if (!k) Alert.alert('Fejl', 'Kunne ikke oprette kogebogen. Er du logget ind?');
      else { setImportNonce(n => n + 1); setValgtKogebog(k.id); }
    }
  }

  function administrérKogebog(id: string, navn: string) {
    Alert.alert(navn, undefined, [
      { text: 'Omdøb', onPress: () => setNavngiv({ id, start: navn }) },
      {
        text: 'Slet', style: 'destructive', onPress: () => {
          Alert.alert('Slet kogebog', `Slet "${navn}"? Opskrifterne slettes ikke — de fjernes bare fra kogebogen.`, [
            { text: 'Annuller', style: 'cancel' },
            {
              text: 'Slet', style: 'destructive', onPress: async () => {
                const ok = await sletKogebog(id);
                if (ok) { if (valgtKogebog === id) setValgtKogebog(null); setImportNonce(n => n + 1); }
                else Alert.alert('Fejl', 'Kunne ikke slette kogebogen.');
              },
            },
          ]);
        },
      },
      { text: 'Annuller', style: 'cancel' },
    ]);
  }

  // Et kort er valgt i "+"-arket → åbn det rette flow direkte (samme routing
  // som den centrale +-knap i App.tsx)
  function vælgMetode(m: TilføjMetode) {
    setSheetÅben(false);
    if (m === 'kogebog') {
      setTimeout(() => setKogebogImportÅben(true), 280);
      return;
    }
    if (m === 'skriv') {
      setTimeout(() => {
        setErNyOpskrift(true);
        setRedigerOpskrift({
          id: 'ny', navn: '', koed: 'Alt', portioner: 4,
          kategorier: [], ingredienser: [], fremgangsmaade: [], importeret: true,
        });
      }, 280);
      return;
    }
    setMetode(m);            // 'kamera' | 'galleri' | 'link'
    // Vent til arket er HELT lukket før import-modalen åbnes — to modaler i
    // transition samtidig forhindrer billedvælgeren i at præsentere.
    setTimeout(() => setImportÅben(true), 280);
  }

  function toggleRet(id: string) {
    // "Byt"-mode: én ret ad gangen — tryk vælger (og afvælger) netop denne
    if (enkeltValg) {
      setValgte(prev => (prev[0] === id ? [] : [id]));
      return;
    }
    setValgte(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAKS_RETTER) return prev;
      // Uge-loftet gælder kun når man bygger på tværs af ugen, ikke for én dag
      if (!dagMode && dækkedeMåltider >= UGE_MAAL) return prev;
      return [...prev, id];
    });
  }

  function håndterBekræft() {
    if (valgte.length === 0) return;
    if (dagMode) onVælgTilDag?.(valgte);     // læg de valgte retter på den valgte dag
    else onVælgEnRet(valgte);                 // 1+ retter → vælg ÉN dag til dem alle
    setValgte([]);
    setKategori(null);
    setValgtKogebog(null);
    onLuk();
  }

  function håndterAnnuller() {
    setValgte([]);
    setKategori(null);
    setValgtKogebog(null);
    onLuk();
  }

  // Slet en egen (importeret) opskrift — med bekræftelse. Bagefter lukkes
  // visningen og gridet gen-læser alleOpskrifter().
  function sletEgenOpskrift(o: Opskrift) {
    Alert.alert(
      'Slet opskrift',
      `Vil du slette "${o.navn}"? Det kan ikke fortrydes.`,
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Slet', style: 'destructive', onPress: async () => {
            const ok = await sletBrugerOpskrift(o.id);
            if (ok) { setSeOpskrift(null); setImportNonce(n => n + 1); }
            else Alert.alert('Fejl', 'Kunne ikke slette opskriften. Prøv igen.');
          },
        },
      ],
    );
  }

  const aktivValgte = valgte;
  // Hvor mange aftensmåltider dækker valget? (rester tæller med)
  const dækkedeMåltider = aktivValgte.reduce((sum, id) => {
    const info = retPriser.get(id);
    return sum + (info ? måltiderPrRet(info.portioner, personer) : 1);
  }, 0);

  return (
    <Modal visible={synlig} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={håndterAnnuller}>
            <Text style={styles.annuller}>Annuller</Text>
          </TouchableOpacity>
          <Text style={styles.titel}>{dagMode ? 'Vælg ret' : 'Vælg retter'}</Text>
          <Text style={styles.tæller} numberOfLines={1}>
            {dagMode ? `Til ${målDag!.dagNavn}` : ''}
          </Text>
        </View>

        {/* Søgefelt */}
        <View style={styles.søgRække}>
          <View style={styles.søgFelt}>
            <Text style={styles.søgIkon}>🔍</Text>
            <TextInput
              style={styles.søgInput}
              value={søg}
              onChangeText={setSøg}
              placeholder="Søg efter opskrift…"
              placeholderTextColor={Colors.inkSoft}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {søg.length > 0 && (
              <TouchableOpacity onPress={() => setSøg('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.søgRyd}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
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
            <TouchableOpacity
              style={[styles.chip, kategori === 'favoritter' && styles.chipAktiv]}
              onPress={() => vælgKategori(kategori === 'favoritter' ? null : 'favoritter')}
            >
              <Text style={[styles.chipTekst, kategori === 'favoritter' && styles.chipTekstAktiv]}>❤️ Favoritter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, kategori === 'kogeboeger' && styles.chipAktiv]}
              onPress={vælgKogebøger}
            >
              <Text style={[styles.chipTekst, kategori === 'kogeboeger' && styles.chipTekstAktiv]}>📚 Kogebøger</Text>
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
          {/* Kogebog-reol: liste af kogebøger + opret. Drill-in sætter valgtKogebog. */}
          {kategori === 'kogeboeger' && !valgtKogebog && (
            <View style={styles.reol}>
              <TouchableOpacity style={styles.nyKogebogKort} onPress={() => setNavngiv({ id: null, start: '' })}>
                <Text style={styles.nyKogebogPlus}>＋</Text>
                <Text style={styles.nyKogebogTekst}>Ny kogebog</Text>
              </TouchableOpacity>

              {/* Virtuelle samlinger: alle egne opskrifter / dem uden kogebog */}
              <TouchableOpacity style={styles.kogebogKort} onPress={() => setValgtKogebog(ALLE_MINE)}>
                <Text style={styles.kogebogKortEmoji}>🔗</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kogebogKortNavn}>Alle dine opskrifter</Text>
                  <Text style={styles.kogebogKortAntal}>{tilgængelige.filter(o => o.importeret).length} opskrifter</Text>
                </View>
                <Text style={styles.kogebogKortPil}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.kogebogKort} onPress={() => setValgtKogebog(UDEN_KOGEBOG)}>
                <Text style={styles.kogebogKortEmoji}>📂</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kogebogKortNavn}>Uden kogebog</Text>
                  <Text style={styles.kogebogKortAntal}>{tilgængelige.filter(o => o.importeret && !kogebogForOpskrift(o.id)).length} opskrifter</Text>
                </View>
                <Text style={styles.kogebogKortPil}>›</Text>
              </TouchableOpacity>

              {kogebøger().length === 0 ? (
                <Text style={styles.reolTom}>Ingen kogebøger endnu. Opret en, eller åbn en opskrift og tryk "Læg i kogebog".</Text>
              ) : (
                kogebøger().map(k => (
                  <TouchableOpacity
                    key={k.id}
                    style={styles.kogebogKort}
                    onPress={() => setValgtKogebog(k.id)}
                    onLongPress={() => administrérKogebog(k.id, k.navn)}
                  >
                    <Text style={styles.kogebogKortEmoji}>{k.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.kogebogKortNavn}>{k.navn}</Text>
                      <Text style={styles.kogebogKortAntal}>{antalIKogebog(k.id)} opskrifter</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => administrérKogebog(k.id, k.navn)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={styles.kogebogMenuKnap}
                    >
                      <Text style={styles.kogebogMenuPrik}>⋯</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* Drill-in-header: tilbage til reolen */}
          {kategori === 'kogeboeger' && valgtKogebog && (
            <TouchableOpacity style={styles.drillHeader} onPress={() => setValgtKogebog(null)}>
              <Text style={styles.drillTilbage}>‹ Alle kogebøger</Text>
              <Text style={styles.drillNavn} numberOfLines={1}>
                {valgtKogebog === ALLE_MINE ? 'Alle dine opskrifter'
                  : valgtKogebog === UDEN_KOGEBOG ? 'Uden kogebog'
                  : kogebøger().find(k => k.id === valgtKogebog)?.navn ?? ''}
              </Text>
            </TouchableOpacity>
          )}

          {/* Tom kategori */}
          {viste.length === 0 && !(kategori === 'kogeboeger' && !valgtKogebog) && (
            <View style={styles.tomKategori}>
              <Text style={styles.tomKategoriEmoji}>
                {kategori === 'favoritter' ? '🤍' : kategori === 'mine' ? '🔗' : '🔍'}
              </Text>
              <Text style={styles.tomKategoriTekst}>
                {søgQ
                  ? `Ingen retter matcher "${søg.trim()}"`
                  : kategori === 'favoritter'
                    ? 'Ingen favoritter endnu — åbn en opskrift og tryk på hjertet ❤️'
                    : kategori === 'mine'
                      ? 'Du har ingen egne opskrifter endnu — tryk "+ Tilføj opskrift" øverst'
                      : kategori === 'kogeboeger'
                        ? valgtKogebog === ALLE_MINE
                          ? 'Du har ingen egne opskrifter endnu — tryk "+ Tilføj opskrift"'
                          : valgtKogebog === UDEN_KOGEBOG
                            ? 'Ingen usorterede opskrifter — alle dine ligger i en kogebog'
                            : 'Denne kogebog er tom — tryk "+ Tilføj opskrift", eller åbn en opskrift og tryk "Læg i kogebog"'
                        : 'Ingen retter i denne kategori endnu'}
              </Text>
            </View>
          )}

          {/* Grid af opskrifter */}
          <View style={styles.grid}>
            {/* Indsæt egen opskrift — KUN inde i en kogebog (ikke i de øvrige kategorier) */}
            {!dagMode && kategori === 'kogeboeger' && !!valgtKogebog && (
              <TouchableOpacity
                style={styles.importKort}
                onPress={() => setSheetÅben(true)}
                activeOpacity={0.85}
              >
                <View style={styles.importIkon}>
                  <Text style={styles.importIkonTekst}>+</Text>
                </View>
                <Text style={styles.importTitel}>Tilføj opskrift</Text>
                <Text style={styles.importSub}>Foto, screenshot, link eller skriv selv</Text>
              </TouchableOpacity>
            )}
            {viste.map(o => {
              const erValgt = aktivValgte.includes(o.id);
              const info = retPriser.get(o.id);
              const kanTilføje = erValgt ||
                (aktivValgte.length < MAKS_RETTER && dækkedeMåltider < UGE_MAAL);
              const aftener = info ? måltiderPrRet(info.portioner, personer) : 1;

              const billede = billedeFor(o);
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
                <TouchableOpacity
                  key={o.id}
                  style={[styles.kort, erValgt && styles.kortValgt]}
                  activeOpacity={0.85}
                  onPress={() => setSeOpskrift(o)}
                >
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
                        <ButiksPill name={tilbudsMatch.butikker[0]} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Bund med total + knap */}
        <View style={styles.bund}>
          {!enkeltValg && aktivValgte.length > 1 && (
            <View style={styles.totalRække}>
              <Text style={styles.totalLabel}>
                {aktivValgte.length} retter · lægges på samme dag
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.genererKnap, aktivValgte.length < 1 && styles.genererKnapDisabled]}
            onPress={håndterBekræft}
            disabled={aktivValgte.length < 1}
          >
            <Text style={styles.genererKnapTekst}>
              {dagMode
                ? (aktivValgte.length < 1 ? 'Vælg en ret' : `Læg på ${målDag!.dagNavn}`)
                : aktivValgte.length < 1
                  ? 'Vælg mindst 1 ret'
                  : 'Vælg dag'}
            </Text>
          </TouchableOpacity>
        </View>

        <NavngivModal
          synlig={!!navngiv}
          titel={navngiv?.id ? 'Omdøb kogebog' : 'Ny kogebog'}
          startVærdi={navngiv?.start ?? ''}
          placeholder="Fx Min mors kogebog"
          gemTekst={navngiv?.id ? 'Gem' : 'Opret'}
          onGem={gemNavngivning}
          onLuk={() => setNavngiv(null)}
        />

        {/* Halvskærms-ark — vælg HVORDAN (foto/screenshot/link/skriv selv) */}
        <TilføjOpskriftSheet
          synlig={sheetÅben}
          onVælg={vælgMetode}
          onLuk={() => setSheetÅben(false)}
        />

        <ImportOpskriftModal
          synlig={importÅben}
          butikker={butikker}
          metode={metode}
          onLuk={() => { setImportÅben(false); setMetode(null); }}
          onGemt={async (opskrift) => {
            setImportÅben(false); setMetode(null);
            // Står man inde i en (ægte) kogebog, lægges den nye opskrift dér med det samme
            if (erRigtigKogebog(valgtKogebog)) await sætKogebogForOpskrift(opskrift.id, valgtKogebog);
            setImportNonce(n => n + 1);
          }}
          onSkrivSelv={() => {
            setImportÅben(false);
            setMetode(null);
            setErNyOpskrift(true);
            setRedigerOpskrift({
              id: 'ny', navn: '', koed: 'Alt', portioner: 4,
              kategorier: [], ingredienser: [], fremgangsmaade: [], importeret: true,
            });
          }}
        />

        <ImportKogebogModal
          synlig={kogebogImportÅben}
          onLuk={() => setKogebogImportÅben(false)}
          onFærdig={() => { setKogebogImportÅben(false); setImportNonce(n => n + 1); }}
        />

        {/* Ren visning af en opskrift — uden onTilføj vises ingen "tilføj"-knap.
            Egne (importerede) opskrifter får en "Slet opskrift"-knap. */}
        <OpskriftDetaljeModal
          opskrift={seOpskrift}
          butikker={butikker}
          personer={personer}
          onLuk={() => setSeOpskrift(null)}
          onRediger={seOpskrift?.importeret ? () => { const o = seOpskrift; setSeOpskrift(null); setErNyOpskrift(false); setRedigerOpskrift(o); } : undefined}
          onSlet={seOpskrift?.importeret ? () => sletEgenOpskrift(seOpskrift) : undefined}
        />

        {/* Rediger egen opskrift / skriv en ny ind — gen-læs grid + luk ved gemt */}
        <RedigerOpskriftModal
          opskrift={redigerOpskrift}
          erNy={erNyOpskrift}
          onLuk={() => { setRedigerOpskrift(null); setErNyOpskrift(false); }}
          onGemt={async (opskrift) => {
            // Kun NYE opskrifter skrevet inde i en (ægte) kogebog lægges dér (ikke ved redigering)
            if (erNyOpskrift && erRigtigKogebog(valgtKogebog)) await sætKogebogForOpskrift(opskrift.id, valgtKogebog);
            setRedigerOpskrift(null); setErNyOpskrift(false); setImportNonce(n => n + 1);
          }}
        />
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

  søgRække: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
    backgroundColor: Colors.paper,
  },
  søgFelt: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.card, borderRadius: Radii.btn,
    borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  søgIkon: { fontSize: 15 },
  søgInput: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.ink, padding: 0 },
  søgRyd: { fontSize: 14, color: Colors.inkSoft, fontFamily: 'Inter_600SemiBold', paddingHorizontal: 2 },

  tidBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  tidBadgeTekst: { color: '#fff', fontSize: 11, fontFamily: 'Inter_600SemiBold' },

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

  importKort: {
    width: '47.5%', minHeight: 160,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.green, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 24, paddingHorizontal: 12,
  },
  importIkon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.greenSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  importIkonTekst: { fontSize: 22, color: Colors.green, fontFamily: 'Inter_700Bold' },
  importTitel: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.green, textAlign: 'center' },
  importSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 4, textAlign: 'center' },

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

  reol: { gap: 10 },
  nyKogebogKort: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.green, borderStyle: 'dashed', padding: 16,
  },
  nyKogebogPlus: { fontSize: 20, color: Colors.green, fontFamily: 'Inter_700Bold' },
  nyKogebogTekst: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.green },
  kogebogKort: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, padding: 16,
  },
  kogebogKortEmoji: { fontSize: 24 },
  kogebogKortNavn: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  kogebogKortAntal: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 2 },
  kogebogKortPil: { fontSize: 22, color: Colors.inkSoft, fontFamily: 'Inter_400Regular' },
  kogebogMenuKnap: { paddingHorizontal: 6, paddingVertical: 2 },
  kogebogMenuPrik: { fontSize: 22, color: Colors.inkSoft, fontFamily: 'Inter_700Bold', lineHeight: 22 },
  reolTom: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textAlign: 'center', padding: 24, lineHeight: 20 },
  drillHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  drillTilbage: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.green },
  drillNavn: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
});
