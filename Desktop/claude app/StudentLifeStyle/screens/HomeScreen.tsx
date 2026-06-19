import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ImageBackground,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Radii, Shadow, StoreColors } from '../constants/theme';
import ButiksPill from '../components/ButiksPill';
import OpskriftDetaljeModal from '../components/OpskriftDetaljeModal';
import AlleTilbudModal from '../components/AlleTilbudModal';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Ingrediens, Madplan } from '../types/madplan';
import { bedsteTilbud, aktiveTilbud, tilbudTilDig } from '../constants/tilbudspriser';
import { termerFor } from '../constants/mineVarer';
import { hentMineVarer } from '../lib/mineVarer';
import MineVarerModal from '../components/MineVarerModal';
import { tælTilbudsMatch } from '../constants/tilbudsMatch';
import { alleOpskrifter, findOpskrift } from '../lib/brugerOpskrifter';
import { alleFavoritter, favoritterVersion } from '../lib/favoritter';
import { byggAftensmadForRet, tomUgeplan } from '../constants/ugeplan';
import { bygIndkøbsliste, beregnBesparelse } from '../constants/indkoeb';
import VælgDagModal, { VælgDag } from '../components/VælgDagModal';
import { tilføjTilbudTilUge } from '../lib/indkøbsliste';
import KlokkeKnap from '../components/KlokkeKnap';
import { hentWatchlist, termFraTilbud } from '../lib/watchlist';
import { billedeFor } from '../constants/opskriftBilleder';
import { getWeekNumber } from '../constants/uge';
import type { Opskrift } from '../types/opskrift';

const UGEDAGE = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];

// Ugens tilbudsaviser. Netto + Føtex er hostede PDF'er i Supabase Storage
// (bucket: tilbudsaviser, offentlig). Rema's PDF er for stor til free-planens
// 50 MB-uploadgrænse, så den peger på butikkens online-avis indtil videre.
// Opdater PDF'erne hver uge ved at uploade nye filer med samme navn (upsert).
const AVIS_BASE = 'https://oqolcifpmdybimspnadc.supabase.co/storage/v1/object/public/tilbudsaviser';
const AVISER = [
  { butik: 'Netto', url: `${AVIS_BASE}/netto-uge25.pdf`, cover: `${AVIS_BASE}/netto-cover.png` },
  { butik: 'Rema 1000', url: `${AVIS_BASE}/rema1000-uge25.pdf`, cover: `${AVIS_BASE}/rema1000-cover.png` },
  { butik: 'Føtex', url: `${AVIS_BASE}/fotex-uge25.pdf`, cover: `${AVIS_BASE}/fotex-cover.png` },
];

type Props = { navigation: any };

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [madplan, setMadplan] = useState<Madplan | null>(null);
  const [butikker, setButikker] = useState<string[]>([]);
  const [personer, setPersoner] = useState(4);
  const [navn, setNavn] = useState<string | null>(null);
  const [åbenOpskrift, setÅbenOpskrift] = useState<Opskrift | null>(null);
  const [tilbudBrowserÅben, setTilbudBrowserÅben] = useState(false);
  const [mineLabels, setMineLabels] = useState<string[]>([]);
  const [mineVarerÅben, setMineVarerÅben] = useState(false);
  // Ret der venter på at blive lagt på madplanen (åbner dag-vælgeren)
  const [planRet, setPlanRet] = useState<Opskrift | null>(null);
  const [gemmerDetalje, setGemmerDetalje] = useState(false);
  // Tilbud lagt på indkøbslisten (nøgle: butik|navn) → viser ✓ på kortet
  const [tilføjedeTilbud, setTilføjedeTilbud] = useState<Set<string>>(new Set());

  const firstName = navn ?? user?.email?.split('@')[0] ?? 'dig';
  const weekNo = getWeekNumber();
  const idag = new Date().getDay();

  // Looper tilbudsvarer + basispris-opslag + sortering — skal ikke køre
  // ved hvert re-render (fetch-svarene alene giver 3-4 renders pr. fokus)
  // "Tilbud til dig": relevante søgeord = ingredienser fra favoritter + ugens
  // valgte opskrifter; watch-termer fra "Mine varer".
  const relevanteOrd = useMemo(() => {
    const ids = new Set<string>([
      ...alleFavoritter(),
      ...((madplan?.valgte_opskrifter ?? []).map(r => r.id)),
    ]);
    const ord = new Set<string>();
    ids.forEach(id => {
      const o = findOpskrift(id);
      ((o?.ingredienser ?? []) as any[]).forEach(i => (i.soeg ?? []).forEach((s: string) => ord.add(s)));
    });
    return [...ord];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [madplan, favoritterVersion()]);
  const ugensTilbud = useMemo(
    () => tilbudTilDig(termerFor(mineLabels), relevanteOrd, 4, butikker),
    [mineLabels, relevanteOrd, butikker, weekNo],
  );
  const harTilbudsdata = useMemo(() => aktiveTilbud().length > 0, [weekNo]);

  // Familiens vigtigste spørgsmål kl. 17: hvad skal vi have i aften?
  const dagIndex = idag === 0 ? 6 : idag - 1;
  const aftensmad = madplan?.dage?.[dagIndex]?.aftensmad;
  const erRester = !!aftensmad?.rester_fra;

  // Slå opskriften op ud fra måltidsnavnet — giver billede, tid og detalje-visning
  const aftenOpskrift = useMemo(() => {
    if (!aftensmad?.navn) return null;
    const navn = aftensmad.navn.replace(/^Rester:\s*/i, '').trim().toLowerCase();
    const alle = alleOpskrifter();
    return alle.find(o => o.navn.toLowerCase() === navn)
      ?? alle.find(o => navn.includes(o.navn.toLowerCase()))
      ?? null;
  }, [aftensmad?.navn]);

  const aftenBillede = aftenOpskrift ? billedeFor(aftenOpskrift) : null;
  const aftenMinutter = (aftenOpskrift as any)?.minutter as number | undefined;
  const aftenTilbud = aftenOpskrift && !erRester
    ? tælTilbudsMatch(aftenOpskrift.id, butikker)
    : null;

  // Er der en plan for ugen, men ingen ret valgt til I DAG? Så foreslå en ret —
  // helst en favorit man ikke allerede har på ugens plan (= ikke spist for nyligt).
  const manglerIAften = !!madplan && !aftensmad?.navn;
  const forslag = useMemo(() => {
    if (!manglerIAften) return null;
    // Navne der allerede er på ugens plan (alle dage) — dem foreslår vi ikke
    const brugteNavne = new Set(
      (madplan?.dage ?? []).flatMap(d => {
        const n = d.aftensmad?.navn?.replace(/^Rester:\s*/i, '').trim().toLowerCase();
        return n ? [n] : [];
      }),
    );
    const ikkeBrugt = (o: Opskrift) => !brugteNavne.has(o.navn.toLowerCase());

    // 1) favoritter der ikke er på ugens plan
    const favoritter = alleFavoritter()
      .map(id => findOpskrift(id))
      .filter((o): o is Opskrift => !!o);
    let kandidater = favoritter.filter(ikkeBrugt);
    let fraFavorit = true;
    // 2) ingen brugbare favoritter → fald tilbage på alle retter
    if (kandidater.length === 0) {
      kandidater = alleOpskrifter().filter(ikkeBrugt);
      fraFavorit = false;
    }
    if (kandidater.length === 0) return null;

    // Prioritér flest tilbud denne uge — men roter blandt de 3 bedste pr.
    // ugedag, så det ikke bliver den samme ret hver gang.
    const rangordnet = kandidater
      .map(o => ({ o, antal: tælTilbudsMatch(o.id, butikker).antal }))
      .sort((a, b) => b.antal - a.antal);
    const top = rangordnet.slice(0, 3);
    const valgt = top[dagIndex % top.length].o;
    return { opskrift: valgt, fraFavorit };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manglerIAften, madplan, dagIndex, butikker, favoritterVersion()]);

  const forslagBillede = forslag ? billedeFor(forslag.opskrift) : null;
  const forslagMinutter = (forslag?.opskrift as any)?.minutter as number | undefined;
  const forslagTilbud = forslag ? tælTilbudsMatch(forslag.opskrift.id, butikker) : null;

  // Brugerens favorit-opskrifter — vises som en vandret stribe på forsiden
  const favoritOpskrifter = useMemo(
    () => alleFavoritter().map(id => findOpskrift(id)).filter((o): o is Opskrift => !!o),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [favoritterVersion()],
  );

  // Dage til dag-vælgeren (mandag→søndag; passerede dage i indeværende uge låst)
  function dagValg(): VælgDag[] {
    const PLAN_DAGE = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
    const dage = madplan?.dage ?? [];
    return PLAN_DAGE.map((navn, i) => ({
      index: i,
      dagNavn: navn,
      retNavn: dage[i]?.aftensmad?.navn?.replace(/^Rester:\s*/i, '').trim() ?? '',
      laast: i < dagIndex,
    }));
  }

  // Læg en favorit på en valgt dag (opretter tom plan hvis ingen findes endnu)
  async function lægPåDag(opskriftId: string, idx: number) {
    const bygget = byggAftensmadForRet(opskriftId, butikker, personer);
    const opskrift = findOpskrift(opskriftId);
    if (!bygget || !opskrift) return;
    const basis = madplan ?? tomUgeplan(personer, weekNo);
    const nyeDage = basis.dage.map((d, i) => {
      if (i !== idx) return d;
      if (d.aftensmad?.navn) return { ...d, ekstraAftensmad: [...(d.ekstraAftensmad ?? []), bygget.maltid] };
      return { ...d, aftensmad: bygget.maltid };
    });
    const eksisterende = basis.valgte_opskrifter ?? [];
    const nyeValgte = eksisterende.some(r => r.id === opskriftId)
      ? eksisterende
      : [...eksisterende, { id: opskriftId, navn: opskrift.navn, portioner: bygget.portioner }];
    const nyPlan: Madplan = { ...basis, dage: nyeDage, valgte_opskrifter: nyeValgte };
    setMadplan(nyPlan);
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    await supabase.from('profiles').upsert({ id: u.id }, { onConflict: 'id', ignoreDuplicates: true });
    await supabase.from('madplaner').upsert({
      user_id: u.id, uge_nr: weekNo, plan: nyPlan,
      total_pris: nyPlan.indkoebspris ?? 0, total_spar: nyPlan.besparelse ?? 0,
    }, { onConflict: 'user_id,uge_nr' });
  }

  // Tilføj en favorits ingredienser til ugens indkøbsliste (flet ind i listen)
  async function tilføjTilIndkøb(opskriftId: string) {
    setGemmerDetalje(true);
    try {
      const nyListe = bygIndkøbsliste([opskriftId], butikker, personer);
      const { data: row } = await supabase.from('madplaner').select('plan').eq('uge_nr', weekNo).maybeSingle();
      const basisPlan: Madplan = row?.plan ?? madplan ?? tomUgeplan(personer, weekNo);
      const byKategori = new Map<string, Map<string, any>>();
      for (const b of (basisPlan.indkoebsliste ?? [])) {
        if (!byKategori.has(b.butik)) byKategori.set(b.butik, new Map());
        for (const v of b.varer) byKategori.get(b.butik)!.set(v.vare.toLowerCase(), v);
      }
      for (const b of nyListe) {
        if (!byKategori.has(b.butik)) byKategori.set(b.butik, new Map());
        for (const v of b.varer) byKategori.get(b.butik)!.set(v.vare.toLowerCase(), v);
      }
      const ORDEN = ['Kød', 'Fisk', 'Mejeri & æg', 'Pasta, ris & korn', 'Grøntsager', 'Dåse & konserves', 'Brød', 'Andet'];
      const samletListe = [...new Set([...ORDEN, ...Array.from(byKategori.keys())])]
        .filter(k => byKategori.has(k) && byKategori.get(k)!.size > 0)
        .map(k => {
          const varer = [...byKategori.get(k)!.values()];
          return { butik: k, subtotal: varer.reduce((s, v) => s + v.pris, 0), varer };
        });
      const nyTotal = samletListe.reduce((s, b) => s + b.subtotal, 0);
      const nySpar = beregnBesparelse(samletListe);
      const nyPlan: Madplan = { ...basisPlan, indkoebsliste: samletListe, indkoebspris: nyTotal, besparelse: nySpar };
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        await supabase.from('profiles').upsert({ id: u.id }, { onConflict: 'id', ignoreDuplicates: true });
        await supabase.from('madplaner').upsert({
          user_id: u.id, uge_nr: weekNo, plan: nyPlan, total_pris: nyTotal, total_spar: nySpar,
        }, { onConflict: 'user_id,uge_nr' });
        setMadplan(nyPlan);
      }
    } finally {
      setGemmerDetalje(false);
    }
  }

  // Læg et enkelt tilbud direkte på ugens indkøbsliste (fra "Tilbud til dig")
  async function tilføjTilbudPåListen(t: { butik: string; navn: string; tilbudspris: number; soeg: string[] }) {
    const nøgle = `${t.butik}|${t.navn}`;
    if (tilføjedeTilbud.has(nøgle)) return;
    // Optimistisk ✓ med det samme — vend tilbage hvis det fejler
    setTilføjedeTilbud(prev => new Set(prev).add(nøgle));
    const res = await tilføjTilbudTilUge(
      { butik: t.butik, navn: t.navn, pris: t.tilbudspris, soeg: t.soeg },
      weekNo,
    );
    if (res === 'fejl') {
      setTilføjedeTilbud(prev => {
        const n = new Set(prev);
        n.delete(nøgle);
        return n;
      });
    }
  }

  // Læg det foreslåede måltid på i dag og gem planen
  async function læggForslagPåIDag() {
    if (!forslag || !madplan) return;
    const bygget = byggAftensmadForRet(forslag.opskrift.id, butikker, personer);
    if (!bygget) return;
    const nyeDage = madplan.dage.map((d, i) =>
      i === dagIndex ? { ...d, aftensmad: bygget.maltid } : d,
    );
    const eksisterende = madplan.valgte_opskrifter ?? [];
    const nyeValgte = eksisterende.some(r => r.id === forslag.opskrift.id)
      ? eksisterende
      : [...eksisterende, { id: forslag.opskrift.id, navn: forslag.opskrift.navn, portioner: bygget.portioner }];
    const nyPlan: Madplan = { ...madplan, dage: nyeDage, valgte_opskrifter: nyeValgte };
    setMadplan(nyPlan);

    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    await supabase.from('madplaner').upsert({
      user_id: u.id,
      uge_nr: weekNo,
      plan: nyPlan,
      total_pris: nyPlan.indkoebspris ?? 0,
      total_spar: nyPlan.besparelse ?? 0,
    }, { onConflict: 'user_id,uge_nr' });
  }

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        supabase.from('madplaner').select('plan, total_pris, total_spar').eq('uge_nr', weekNo).maybeSingle(),
        supabase.from('profiles').select('stores, household_size, watch_items').maybeSingle(),
      ]).then(([{ data: plan }, { data: profil }]) => {
        if (plan) setMadplan(plan.plan);
        if (profil?.stores) setButikker(profil.stores);
        if (profil?.household_size) setPersoner(profil.household_size);
        if (profil?.watch_items) setMineLabels(profil.watch_items);
      });
      // Separat kald: display_name-kolonnen kræver SQL i dashboardet og må
      // ikke kunne vælte hentningen af budget/butikker ovenfor
      supabase.from('profiles').select('display_name').maybeSingle().then(({ data, error }) => {
        if (!error && data?.display_name) setNavn(data.display_name);
      });
      // Hent overvågede varer ind i storen, så 🔔-knapperne viser korrekt tilstand
      hentWatchlist();
    }, [])
  );

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.weekLabel}>{UGEDAGE[idag]} · Uge {weekNo}</Text>
          <Text style={styles.greeting}>Hej {firstName} 👋</Text>
        </View>
        <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profil')}>
          <Text style={styles.avatarText}>{firstName[0]?.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {madplan ? (
          <>
            {/* I aften — aftensmaden er det, familien åbner appen for */}
            {aftensmad?.navn ? (
              <View style={styles.section}>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>I aften</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Planer')}>
                    <Text style={styles.sectionLink}>Hele ugen</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.aftenKort}>
                  {aftenBillede ? (
                    <ImageBackground source={aftenBillede} style={styles.aftenBillede}>
                      {aftenMinutter != null && (
                        <View style={styles.aftenTid}>
                          <Text style={styles.aftenTidTekst}>⏱ {aftenMinutter} min</Text>
                        </View>
                      )}
                    </ImageBackground>
                  ) : (
                    <View style={[styles.aftenBillede, styles.aftenFallback]}>
                      <Text style={{ fontSize: 44 }}>🍽️</Text>
                      {aftenMinutter != null && (
                        <View style={styles.aftenTid}>
                          <Text style={styles.aftenTidTekst}>⏱ {aftenMinutter} min</Text>
                        </View>
                      )}
                    </View>
                  )}
                  <View style={styles.aftenInfo}>
                    <Text style={styles.aftenNavn} numberOfLines={2}>
                      {erRester ? `Rester: ${aftensmad.navn.replace(/^Rester:\s*/i, '')}` : aftensmad.navn}
                    </Text>
                    <View style={styles.aftenMetaRække}>
                      <Text style={styles.aftenMeta}>👤 {aftensmad.portioner} portioner</Text>
                      {aftenTilbud && aftenTilbud.antal > 0 && (
                        <View style={styles.aftenTilbudBadge}>
                          <Text style={styles.aftenTilbudTekst}>🏷 {aftenTilbud.antal} tilbud</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.aftenKnap}
                      onPress={() => aftenOpskrift ? setÅbenOpskrift(aftenOpskrift) : navigation.navigate('Planer')}
                    >
                      <Text style={styles.aftenKnapTekst}>Se opskrift</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : forslag ? (
              /* Ingen ret valgt i dag → foreslå en (helst en favorit) */
              <View style={styles.section}>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Forslag til i aften</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Planer')}>
                    <Text style={styles.sectionLink}>Vælg selv</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.aftenKort}>
                  {forslagBillede ? (
                    <ImageBackground source={forslagBillede} style={styles.aftenBillede}>
                      {forslagMinutter != null && (
                        <View style={styles.aftenTid}>
                          <Text style={styles.aftenTidTekst}>⏱ {forslagMinutter} min</Text>
                        </View>
                      )}
                    </ImageBackground>
                  ) : (
                    <View style={[styles.aftenBillede, styles.aftenFallback]}>
                      <Text style={{ fontSize: 44 }}>🍽️</Text>
                    </View>
                  )}
                  <View style={styles.aftenInfo}>
                    {forslag.fraFavorit && (
                      <View style={styles.forslagBadge}>
                        <Text style={styles.forslagBadgeTekst}>❤️ Fra dine favoritter</Text>
                      </View>
                    )}
                    <Text style={styles.aftenNavn} numberOfLines={2}>{forslag.opskrift.navn}</Text>
                    <View style={styles.aftenMetaRække}>
                      <Text style={styles.aftenMeta}>👤 {forslag.opskrift.portioner} portioner</Text>
                      {forslagTilbud && forslagTilbud.antal > 0 && (
                        <View style={styles.aftenTilbudBadge}>
                          <Text style={styles.aftenTilbudTekst}>🏷 {forslagTilbud.antal} tilbud</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.forslagKnapper}>
                      <TouchableOpacity style={[styles.aftenKnap, styles.forslagKnapFlex]} onPress={læggForslagPåIDag}>
                        <Text style={styles.aftenKnapTekst}>Læg på i aften</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.forslagSeKnap}
                        onPress={() => setÅbenOpskrift(forslag.opskrift)}
                      >
                        <Text style={styles.forslagSeKnapTekst}>Se opskrift</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}
          </>
        ) : (
          /* Tom tilstand — sælg handlingen, ikke "0 kr" */
          <View style={styles.ctaKort}>
            <Text style={styles.ctaTitel}>Klar til ugens madplan?</Text>
            <Text style={styles.ctaSub}>
              Vælg ugens retter — vi finder hvilke ingredienser der er på tilbud i dine butikker.
            </Text>
            <TouchableOpacity style={styles.ctaKnap} onPress={() => navigation.navigate('Planer')}>
              <Text style={styles.ctaKnapTekst}>Lav ugens plan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bedste tilbud — fra ugens tilbudsfil */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Tilbud til dig</Text>
            <View style={styles.tilbudLinks}>
              <TouchableOpacity onPress={() => setMineVarerÅben(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.sectionLink}>⚙ Tilpas</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setTilbudBrowserÅben(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.sectionLink}>Se alle ›</Text>
              </TouchableOpacity>
            </View>
          </View>
          {ugensTilbud.length === 0 ? (
            <View style={styles.tilbudTom}>
              <Text style={styles.tilbudTomEmoji}>🏷️</Text>
              {harTilbudsdata ? (
                <>
                  <Text style={styles.tilbudTomTekst}>Ingen tilbud i dine valgte butikker</Text>
                  <Text style={styles.tilbudTomSub}>Tilføj flere butikker i din profil for at se ugens tilbud</Text>
                </>
              ) : (
                <>
                  <Text style={styles.tilbudTomTekst}>Ugens tilbud er ikke klar endnu</Text>
                  <Text style={styles.tilbudTomSub}>Kig forbi igen senere — vi opdaterer hver uge</Text>
                </>
              )}
            </View>
          ) : ugensTilbud.map((t, i) => {
            const tilføjet = tilføjedeTilbud.has(`${t.butik}|${t.navn}`);
            return (
              <View key={i} style={styles.tilbudKort}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tilbudNavn}>
                    {t.kilde === 'watch' ? '⭐ ' : t.kilde === 'favorit' ? '❤️ ' : ''}{t.navn}
                  </Text>
                  <ButiksPill name={t.butik} />
                </View>
                <Text style={styles.tilbudspris}>{t.tilbudspris},-</Text>
                <KlokkeKnap label={t.navn} term={termFraTilbud(t.navn)} størrelse={20} />
                <TouchableOpacity
                  style={[styles.tilbudPlus, tilføjet && styles.tilbudPlusTilføjet]}
                  onPress={() => tilføjTilbudPåListen(t)}
                  disabled={tilføjet}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={tilføjet ? 'Tilføjet til indkøbsliste' : `Tilføj ${t.navn} til indkøbsliste`}
                >
                  <Text style={[styles.tilbudPlusTekst, tilføjet && styles.tilbudPlusTekstTilføjet]}>
                    {tilføjet ? '✓' : '+'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Ugens aviser — link til butikkernes online-tilbudsaviser */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Ugens aviser</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.aviserStribe}>
            {AVISER.map(a => {
              const farver = StoreColors[a.butik] ?? { bg: Colors.green, text: '#fff' };
              return (
                <TouchableOpacity
                  key={a.butik}
                  style={styles.avisKort}
                  onPress={() => WebBrowser.openBrowserAsync(a.url)}
                  activeOpacity={0.85}
                >
                  <ImageBackground source={{ uri: a.cover }} style={styles.avisCover} imageStyle={styles.avisCoverImg}>
                    <View style={[styles.avisLabel, { backgroundColor: farver.bg }]}>
                      <Text style={[styles.avisNavn, { color: farver.text }]}>{a.butik}</Text>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Dine favoritter — vandret stribe med samme kort-design som i Opskrifter */}
        {favoritOpskrifter.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>❤️ Dine favoritter</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.favStribe}
            >
              {favoritOpskrifter.map(o => {
                const billede = billedeFor(o);
                const tilbud = tælTilbudsMatch(o.id, butikker);
                const minutter = (o as any).minutter as number | undefined;
                return (
                  <TouchableOpacity
                    key={o.id}
                    style={styles.favKort}
                    activeOpacity={0.85}
                    onPress={() => setÅbenOpskrift(o)}
                  >
                    {billede ? (
                      <ImageBackground source={billede} style={styles.favBillede} imageStyle={styles.favBilledeImg}>
                        {tilbud.antal > 0 && (
                          <View style={styles.favTilbudBadge}>
                            <Text style={styles.favTilbudTekst}>🏷 {tilbud.antal}</Text>
                          </View>
                        )}
                        {minutter != null && (
                          <View style={styles.favTid}>
                            <Text style={styles.favTidTekst}>⏱ {minutter} min</Text>
                          </View>
                        )}
                      </ImageBackground>
                    ) : (
                      <View style={[styles.favBillede, styles.favFallback]}>
                        <Text style={{ fontSize: 40 }}>🍽️</Text>
                        {tilbud.antal > 0 && (
                          <View style={styles.favTilbudBadge}>
                            <Text style={styles.favTilbudTekst}>🏷 {tilbud.antal}</Text>
                          </View>
                        )}
                      </View>
                    )}
                    <View style={styles.favInfo}>
                      <Text style={styles.favNavn} numberOfLines={2}>{o.navn}</Text>
                      <Text style={styles.favMeta} numberOfLines={1}>👤 {o.portioner} port.</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <OpskriftDetaljeModal
        opskrift={åbenOpskrift}
        butikker={butikker}
        personer={personer}
        gemmer={gemmerDetalje}
        onTilføj={tilføjTilIndkøb}
        onLægPåPlan={() => { const o = åbenOpskrift; setÅbenOpskrift(null); setPlanRet(o); }}
        onLuk={() => setÅbenOpskrift(null)}
      />

      <VælgDagModal
        synlig={!!planRet}
        retNavn={planRet?.navn ?? ''}
        dage={dagValg()}
        onVælg={(idx) => { const id = planRet?.id; setPlanRet(null); if (id) lægPåDag(id, idx); }}
        onLuk={() => setPlanRet(null)}
      />

      <AlleTilbudModal
        synlig={tilbudBrowserÅben}
        butikker={butikker}
        ugeNr={weekNo}
        onClose={() => setTilbudBrowserÅben(false)}
      />

      <MineVarerModal
        synlig={mineVarerÅben}
        valgte={mineLabels}
        onGemt={(labels) => { setMineLabels(labels); setMineVarerÅben(false); }}
        onLuk={() => setMineVarerÅben(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.canvas },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 12,
    backgroundColor: Colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  weekLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5 },
  greeting: { fontSize: 22, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.4 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.green },
  content: { padding: 20, paddingBottom: 32 },

  aftenKort: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.line,
    overflow: 'hidden',
  },
  aftenBillede: { height: 140, justifyContent: 'flex-end' },
  aftenFallback: { backgroundColor: Colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  aftenTid: {
    position: 'absolute', bottom: 10, left: 10,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  aftenTidTekst: { color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  aftenInfo: { padding: 14 },
  aftenNavn: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.3 },
  aftenMetaRække: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  aftenMeta: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  aftenTilbudBadge: {
    backgroundColor: '#F0FAF0', borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.green,
  },
  aftenTilbudTekst: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.green },
  aftenKnap: {
    backgroundColor: Colors.green, borderRadius: Radii.btn,
    padding: 13, alignItems: 'center', marginTop: 12,
  },
  aftenKnapTekst: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  forslagBadge: {
    alignSelf: 'flex-start', backgroundColor: '#FFF0F0', borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.red, marginBottom: 6,
  },
  forslagBadgeTekst: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.red },
  forslagKnapper: { flexDirection: 'row', gap: 8, marginTop: 12 },
  forslagKnapFlex: { flex: 1, marginTop: 0 },
  forslagSeKnap: {
    flex: 1, borderRadius: Radii.btn, padding: 13, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.green, backgroundColor: Colors.card,
  },
  forslagSeKnapTekst: { color: Colors.green, fontSize: 14, fontFamily: 'Inter_700Bold' },

  ctaKort: {
    backgroundColor: Colors.green,
    borderRadius: Radii.hero,
    padding: 22,
    marginBottom: 24,
    ...Shadow,
  },
  ctaTitel: { fontSize: 20, fontFamily: 'BricolageGrotesque_700Bold', color: '#fff', letterSpacing: -0.4 },
  ctaSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)', marginTop: 6, lineHeight: 19 },
  ctaKnap: {
    backgroundColor: '#fff', borderRadius: Radii.btn,
    padding: 14, alignItems: 'center', marginTop: 16,
  },
  ctaKnapTekst: { color: Colors.green, fontSize: 15, fontFamily: 'Inter_700Bold' },

  section: { marginBottom: 24 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.3 },
  sectionLink: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.green },
  tilbudLinks: { flexDirection: 'row', gap: 14 },

  tilbudKort: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.line,
    marginBottom: 8,
  },
  aviserStribe: { gap: 12, paddingRight: 4, paddingVertical: 2 },
  avisKort: {
    width: 132, borderRadius: Radii.card, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.card,
  },
  avisCover: { width: 132, height: 178, justifyContent: 'flex-end', backgroundColor: Colors.canvas },
  avisCoverImg: { borderRadius: 0 },
  avisLabel: { paddingVertical: 7, alignItems: 'center' },
  avisNavn: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  tilbudNavn: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink, marginBottom: 4 },
  tilbudspris: { fontSize: 18, fontFamily: 'BricolageGrotesque_800ExtraBold', color: Colors.red, letterSpacing: -0.36 },
  tilbudPlus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  tilbudPlusTilføjet: { backgroundColor: Colors.line },
  tilbudPlusTekst: { fontSize: 22, lineHeight: 24, color: '#fff', fontFamily: 'Inter_600SemiBold' },
  tilbudPlusTekstTilføjet: { fontSize: 16, color: Colors.green },
  tilbudTom: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: 24,
    alignItems: 'center',
  },
  tilbudTomEmoji: { fontSize: 32, marginBottom: 8 },
  tilbudTomTekst: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.ink, marginBottom: 4 },
  tilbudTomSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textAlign: 'center', lineHeight: 17 },

  // Favorit-stribe — samme kort-design som Opskrifter-grid'et, men fast bredde
  // og vandret scroll.
  favStribe: { gap: 12, paddingRight: 4, paddingVertical: 2 },
  favKort: {
    width: 150,
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, overflow: 'hidden',
  },
  favBillede: {
    height: 100, backgroundColor: Colors.canvas,
    alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
  },
  favBilledeImg: { borderTopLeftRadius: Radii.card, borderTopRightRadius: Radii.card },
  favFallback: { backgroundColor: Colors.greenSoft },
  favTilbudBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: Colors.red, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  favTilbudTekst: { color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold' },
  favTid: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  favTidTekst: { color: '#fff', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  favInfo: { padding: 10 },
  favNavn: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.ink, lineHeight: 18, minHeight: 36 },
  favMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, marginTop: 6 },
});
