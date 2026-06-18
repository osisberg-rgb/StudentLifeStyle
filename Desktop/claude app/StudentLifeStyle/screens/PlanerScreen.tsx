import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import ButiksPill from '../components/ButiksPill';
import OpskriftModal from '../components/OpskriftModal';
import VælgRetterModal from '../components/VælgRetterModal';
import OpskriftDetaljeModal from '../components/OpskriftDetaljeModal';
import VælgDagModal, { VælgDag } from '../components/VælgDagModal';
import { supabase } from '../lib/supabase';
import { Madplan, Dag, Maltid, Ingrediens } from '../types/madplan';
import { findOpskrift, alleOpskrifter } from '../lib/brugerOpskrifter';
import type { Opskrift } from '../types/opskrift';
import { bygIndkøbsliste, beregnBesparelse } from '../constants/indkoeb';
import { slåEffektivPrisOp } from '../constants/tilbudspriser';
import { hentOpskriftPriser } from '../constants/opskriftPriser';
import { tomUgeplan, byggAftensmadForRet } from '../constants/ugeplan';
import { tagForvalgteRetter } from '../constants/onboardingHandoff';
import { sætValgtUge, hentValgtUge } from '../constants/ugeState';
import { billedeFor } from '../constants/opskriftBilleder';
import { tælTilbudsMatch } from '../constants/tilbudsMatch';

export default function PlanerScreen() {
  const [madplan, setMadplan] = useState<Madplan | null>(null);
  const [loading, setLoading] = useState(false);
  const [uge, setUge] = useState(() => hentValgtUge(getWeekNumber()));
  const [valgtMaltid, setValgtMaltid] = useState<{ maltid: Maltid; type: string; dag: string } | null>(null);
  const [vælgerSynlig, setVælgerSynlig] = useState(false);
  const [butikker, setButikker] = useState<string[]>([]);
  const [personer, setPersoner] = useState(4);
  const [åbenOpskrift, setÅbenOpskrift] = useState<Opskrift | null>(null);
  const [gemmerDetalje, setGemmerDetalje] = useState(false);
  // Retter fra onboardingens aha-skærm — seeder vælgeren én gang, så
  // tallet brugeren lige har set, holder hele vejen til planen
  const [forvalgte, setForvalgte] = useState<string[] | null>(null);
  // Dag som Opskrifter-vælgeren er åbnet FOR (via "Byt" eller tryk på en dag).
  // byttFra sat = dagen har en ret der skal byttes ud (rester rettes med);
  // ellers placeres den valgte ret bare på dagen.
  const [vælgerMålDag, setVælgerMålDag] =
    useState<{
      index: number;
      dagNavn: string;
      byttFra?: { id: string; navn: string };  // byt hovedret (retter også rester)
      byttEkstra?: number;                      // byt ekstra-ret nr. (index)
      tilføjEkstra?: boolean;                   // tilføj endnu en ret
    } | null>(null);
  // Ret valgt i vælgeren (præcis 1, uden måldag) der skal placeres på en valgt dag
  const [placerRet, setPlacerRet] = useState<{ ids: string[]; navn: string } | null>(null);
  // Mandag = 0 ... søndag = 6, samme rækkefølge som plan.dage
  const iDagIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  // Dag-lås: første dag der stadig må ændres. 0 i fremtidige uger,
  // i dag i indeværende uge, null i tidligere uger (alt er historie).
  // Bruges både af dag-kortets Byt-knap og af byttRet, så en ret kun
  // kan byttes på dage fra i dag og frem.
  function førsteFrieDag(): number | null {
    const nuUge = getWeekNumber();
    if (uge < nuUge) return null;
    return uge > nuUge ? 0 : iDagIndex;
  }

  useFocusEffect(
    useCallback(() => {
      // Følg den delte uge (kan være ændret fra Indkøb-fanen) —
      // setUge ændrer dep'en, så effekten kører igen med den rigtige uge
      const deltUge = hentValgtUge(uge);
      if (deltUge !== uge) {
        setUge(deltUge);
        return;
      }
      const fraOnboarding = tagForvalgteRetter();
      if (fraOnboarding && fraOnboarding.length >= 2) {
        setForvalgte(fraOnboarding);
        setVælgerSynlig(true);
      }
      hentMadplan(uge);
      supabase.from('profiles').select('stores, household_size').maybeSingle()
        .then(({ data }) => {
          if (data?.stores) setButikker(data.stores);
          if (data?.household_size) setPersoner(data.household_size);
        });
    }, [uge])
  );

  async function hentMadplan(ugeNr: number) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('madplaner')
        .select('plan, total_pris, total_spar')
        .eq('uge_nr', ugeNr)
        .maybeSingle();

      if (error) console.error('hentMadplan fejl:', error.message);
      setMadplan(data?.plan ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function tilføjOpskriftTilIndkøb(opskriftId: string) {
    setGemmerDetalje(true);
    try {
      const nyListe = bygIndkøbsliste([opskriftId], butikker, personer);
      const total = nyListe.reduce((s, b) => s + b.subtotal, 0);
      const { data: row } = await supabase.from('madplaner').select('plan').eq('uge_nr', uge).maybeSingle();
      if (row) {
        const gammelListe: typeof nyListe = row.plan?.indkoebsliste ?? [];
        // Merge: bevar kategorier, tilføj/opdater varer per kategori
        const byKategori = new Map<string, Map<string, typeof nyListe[0]['varer'][0]>>();
        for (const b of gammelListe) {
          if (!byKategori.has(b.butik)) byKategori.set(b.butik, new Map());
          for (const v of b.varer) byKategori.get(b.butik)!.set(v.vare.toLowerCase(), v);
        }
        for (const b of nyListe) {
          if (!byKategori.has(b.butik)) byKategori.set(b.butik, new Map());
          for (const v of b.varer) byKategori.get(b.butik)!.set(v.vare.toLowerCase(), v);
        }
        const ORDEN = ['Kød','Fisk','Mejeri & æg','Pasta, ris & korn','Grøntsager','Dåse & konserves','Brød','Andet'];
        const samletListe = [...new Set([...ORDEN, ...Array.from(byKategori.keys())])]
          .filter(k => byKategori.has(k) && byKategori.get(k)!.size > 0)
          .map(k => {
            const varer = [...byKategori.get(k)!.values()];
            return { butik: k, subtotal: varer.reduce((s, v) => s + v.pris, 0), varer };
          });
        const nyTotal = samletListe.reduce((s, b) => s + b.subtotal, 0);
        const nySpar = beregnBesparelse(samletListe);
        await supabase.from('madplaner').update({
          plan: { ...row.plan, indkoebsliste: samletListe, indkoebspris: nyTotal, total: nyTotal, besparelse: nySpar },
          total_pris: nyTotal,
          total_spar: nySpar,
        }).eq('uge_nr', uge);
        setMadplan(prev => prev ? { ...prev, indkoebsliste: samletListe, indkoebspris: nyTotal, besparelse: nySpar } : prev);
      }
      setÅbenOpskrift(null);
    } finally {
      setGemmerDetalje(false);
    }
  }

  // Byt én ret: opdaterer valgte retter, dagene (inkl. rester-aftener),
  // og genberegner indkøbsliste, pris og besparelse deterministisk.
  // Afkrydsede varer ("har det allerede") bevares for varer der overlever.
  async function byttRet(gammel: { id: string; navn: string }, nyId: string) {
    if (!madplan) return;
    const opskrift = findOpskrift(nyId);
    if (!opskrift) return;

    const info = hentOpskriftPriser(butikker, personer).get(nyId);
    const gammelTotal = madplan.indkoebspris ?? madplan.total ?? 0;
    const nyPortioner = info?.portioner ?? (opskrift.portioner || 4);

    // Den nye rets måltid til dag-kortene — samme deterministiske priser
    // som resten af appen
    const nyeIngredienser: Ingrediens[] = (opskrift.ingredienser as any[])
      .filter(i => !(i.estimeret && i.estimereretPris === 0))
      .map(i => {
        const e = slåEffektivPrisOp(i, butikker);
        return {
          vare: i.navn, butik: e.butik, brugt: i.maengde, pakkestoerrelse: i.maengde,
          pakkepris: e.pris, paa_tilbud: e.paaTilbud, normalpris: e.normalpris,
        } as Ingrediens;
      });
    const prisPrPortion = info && info.portioner > 0 ? Math.round(info.pris / info.portioner) : 0;
    const gNavn = gammel.navn.toLowerCase();

    // Kun dage fra i dag og frem skrives om — passerede dage er et
    // dokument over hvad der faktisk blev lavet
    const grænse = førsteFrieDag() ?? 0;

    const nyeDage = (madplan.dage ?? []).map((d, di) => {
      if (di < grænse) return d;
      const nyDag: any = { ...d };
      for (const t of ['morgenmad', 'frokost', 'aftensmad'] as const) {
        const m: any = nyDag[t];
        if (!m?.navn) continue;
        if (!m.rester_fra && m.navn.toLowerCase() === gNavn) {
          nyDag[t] = {
            navn: opskrift.navn,
            pris_pr_portion: prisPrPortion,
            portioner: nyPortioner,
            ingredienser: nyeIngredienser,
            fremgangsmaade: opskrift.fremgangsmaade ?? [],
          };
        } else if (m.rester_fra && m.rester_fra.toLowerCase() === gNavn) {
          nyDag[t] = { ...m, navn: `Rester: ${opskrift.navn}`, rester_fra: opskrift.navn };
        }
      }
      return nyDag;
    });

    // Blev den gamle ret lavet på en passeret dag, er den stadig en del
    // af ugen (og indkøbene) — behold den og tilføj den nye ved siden af.
    // Ellers erstattes den helt.
    const gammelStadigBrugt = nyeDage.some(d => {
      const a: any = (d as any).aftensmad;
      return a?.navn && !a.rester_fra && a.navn.toLowerCase() === gNavn;
    });
    const eksisterende = madplan.valgte_opskrifter ?? [];
    const nyeValgte = gammelStadigBrugt
      ? (eksisterende.some(r => r.id === nyId)
          ? eksisterende
          : [...eksisterende, { id: nyId, navn: opskrift.navn, portioner: nyPortioner }])
      : eksisterende.map(r =>
          r.id === gammel.id ? { id: nyId, navn: opskrift.navn, portioner: nyPortioner } : r
        );

    // Indkøbslisten røres IKKE ved byt — den er nu brugerens egen manuelle
    // liste. Kun planen og dagene ændres; den nye ret lægges i listen, når
    // brugeren åbner den og trykker "Tilføj til indkøbsliste".
    const nyTotal = madplan.indkoebspris ?? madplan.total ?? 0;
    const nySpar = madplan.besparelse ?? 0;

    const nyPlan: Madplan = {
      ...madplan, valgte_opskrifter: nyeValgte, dage: nyeDage,
    };
    const { error } = await supabase.from('madplaner')
      .update({ plan: nyPlan, total_pris: nyTotal, total_spar: nySpar })
      .eq('uge_nr', uge);
    if (error) {
      Alert.alert('Fejl', 'Byttet kunne ikke gemmes. Prøv igen.');
      return;
    }
    setMadplan(nyPlan);
    const nyMatch = tælTilbudsMatch(nyId, butikker);
    Alert.alert(
      'Ret byttet ✅',
      nyMatch.antal > 0
        ? `${opskrift.navn} har ${nyMatch.antal} ingredienser på tilbud`
        : `${opskrift.navn} er tilføjet til ugen`
    );
  }

  function skiftUge(retning: number) {
    const ny = uge + retning;
    sætValgtUge(ny);
    setUge(ny);
    hentMadplan(ny);
  }

  function åbnMaltid(dag: Dag, type: 'morgenmad' | 'frokost' | 'aftensmad') {
    setValgtMaltid({ maltid: dag[type], type, dag: dag.dag });
  }

  // Læg én valgt ret på dag nr. idx. Findes der ingen plan for ugen endnu,
  // oprettes en tom plan først, så man kan bygge ugen dag for dag. Selve
  // indkøbslisten røres ikke — den fyldes via "Tilføj til indkøbsliste".
  // Bruges af både "tryk på en tom dag" og "vælg ret i vælgeren → vælg dag".
  async function placérRetPåDag(opskriftId: string, idx: number, somEkstra = false) {
    const bygget = byggAftensmadForRet(opskriftId, butikker, personer);
    const opskrift = findOpskrift(opskriftId);
    if (!bygget || !opskrift) return;

    const basis = madplan ?? tomUgeplan(personer, uge);
    const nyeDage = basis.dage.map((d, i) => {
      if (i !== idx) return d;
      // somEkstra (eller dagen har allerede en hovedret) → læg ved siden af;
      // ellers bliv hovedretten
      if (somEkstra && d.aftensmad?.navn) {
        return { ...d, ekstraAftensmad: [...(d.ekstraAftensmad ?? []), bygget.maltid] };
      }
      return { ...d, aftensmad: bygget.maltid };
    });
    const eksisterende = basis.valgte_opskrifter ?? [];
    const nyeValgte = eksisterende.some(r => r.id === opskriftId)
      ? eksisterende
      : [...eksisterende, { id: opskriftId, navn: opskrift.navn, portioner: bygget.portioner }];
    const nyPlan: Madplan = { ...basis, dage: nyeDage, valgte_opskrifter: nyeValgte };

    setMadplan(nyPlan);

    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { Alert.alert('Fejl', 'Du er ikke logget ind'); return; }
    await supabase.from('profiles').upsert({ id: u.id }, { onConflict: 'id', ignoreDuplicates: true });
    const { error } = await supabase.from('madplaner').upsert({
      user_id: u.id,
      uge_nr: uge,
      plan: nyPlan,
      total_pris: nyPlan.indkoebspris ?? 0,
      total_spar: nyPlan.besparelse ?? 0,
    }, { onConflict: 'user_id,uge_nr' });
    if (error) {
      Alert.alert('Fejl', 'Retten kunne ikke gemmes. Prøv igen.');
      hentMadplan(uge);
    }
  }

  // Læg FLERE valgte retter på den samme dag: den første bliver hovedret (eller
  // ekstra hvis dagen allerede har en), resten lægges som ekstra-retter ved siden
  // af. Bygges i én plan-opdatering, så de ikke overskriver hinanden.
  async function placérRetterPåDag(opskriftIds: string[], idx: number) {
    const basis = madplan ?? tomUgeplan(personer, uge);
    let dage = basis.dage;
    let valgte = basis.valgte_opskrifter ?? [];

    for (const opskriftId of opskriftIds) {
      const bygget = byggAftensmadForRet(opskriftId, butikker, personer);
      const opskrift = findOpskrift(opskriftId);
      if (!bygget || !opskrift) continue;
      dage = dage.map((d, i) => {
        if (i !== idx) return d;
        // Har dagen allerede en hovedret → læg ved siden af; ellers bliv hovedret
        if (d.aftensmad?.navn) {
          return { ...d, ekstraAftensmad: [...(d.ekstraAftensmad ?? []), bygget.maltid] };
        }
        return { ...d, aftensmad: bygget.maltid };
      });
      if (!valgte.some(r => r.id === opskriftId)) {
        valgte = [...valgte, { id: opskriftId, navn: opskrift.navn, portioner: bygget.portioner }];
      }
    }

    const nyPlan: Madplan = { ...basis, dage, valgte_opskrifter: valgte };
    setMadplan(nyPlan);

    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { Alert.alert('Fejl', 'Du er ikke logget ind'); return; }
    await supabase.from('profiles').upsert({ id: u.id }, { onConflict: 'id', ignoreDuplicates: true });
    const { error } = await supabase.from('madplaner').upsert({
      user_id: u.id,
      uge_nr: uge,
      plan: nyPlan,
      total_pris: nyPlan.indkoebspris ?? 0,
      total_spar: nyPlan.besparelse ?? 0,
    }, { onConflict: 'user_id,uge_nr' });
    if (error) {
      Alert.alert('Fejl', 'Retterne kunne ikke gemmes. Prøv igen.');
      hentMadplan(uge);
    }
  }

  // En ret er valgt i Opskrifter-vælgeren, der var åbnet for en bestemt dag.
  // Havde dagen allerede en ret → byt (retter også rester-dage); ellers læg
  // bare retten på dagen.
  function vælgTilMålDag(ids: string[]) {
    const md = vælgerMålDag;
    setVælgerMålDag(null);
    if (!md || ids.length === 0) return;
    if (md.byttFra) byttRet(md.byttFra, ids[0]);              // byt → præcis én ret
    else if (md.byttEkstra != null) byttEkstraRet(md.index, md.byttEkstra, ids[0]);
    else placérRetterPåDag(ids, md.index);                    // tilføj → en eller flere
  }

  // Gem en ændret plan (dage) — fælles for slet/byt af enkeltretter
  async function gemDage(nyeDage: Dag[], valgte?: Madplan['valgte_opskrifter']) {
    if (!madplan) return;
    const nyPlan: Madplan = {
      ...madplan, dage: nyeDage,
      ...(valgte ? { valgte_opskrifter: valgte } : {}),
    };
    setMadplan(nyPlan);
    const { error } = await supabase.from('madplaner')
      .update({ plan: nyPlan }).eq('uge_nr', uge);
    if (error) { Alert.alert('Fejl', 'Kunne ikke gemmes. Prøv igen.'); hentMadplan(uge); }
  }

  // Byt en ekstra-ret ud med en anden (rester røres ikke — ekstra-retter har ingen)
  function byttEkstraRet(dagIndex: number, ekstraIndex: number, nyId: string) {
    if (!madplan) return;
    const bygget = byggAftensmadForRet(nyId, butikker, personer);
    const opskrift = findOpskrift(nyId);
    if (!bygget || !opskrift) return;
    const nyeDage = madplan.dage.map((d, i) =>
      i === dagIndex
        ? { ...d, ekstraAftensmad: (d.ekstraAftensmad ?? []).map((m, j) => j === ekstraIndex ? bygget.maltid : m) }
        : d
    );
    const eksisterende = madplan.valgte_opskrifter ?? [];
    const nyeValgte = eksisterende.some(r => r.id === nyId)
      ? eksisterende
      : [...eksisterende, { id: nyId, navn: opskrift.navn, portioner: bygget.portioner }];
    gemDage(nyeDage, nyeValgte);
  }

  // Fjern en ekstra-ret fra en dag (hovedretten røres ikke)
  function fjernEkstraRet(dagIndex: number, ekstraIndex: number) {
    if (!madplan) return;
    const nyeDage = madplan.dage.map((d, i) =>
      i === dagIndex
        ? { ...d, ekstraAftensmad: (d.ekstraAftensmad ?? []).filter((_, j) => j !== ekstraIndex) }
        : d
    );
    gemDage(nyeDage);
  }

  // Slet hovedretten. Har dagen ekstra-retter, rykker den første op som ny
  // hovedret (så dagen aldrig har ekstra-retter uden en hovedret). Rester-dage
  // der pegede på den slettede ret ryddes også.
  function sletHovedret(dagIndex: number) {
    if (!madplan) return;
    const dag = madplan.dage[dagIndex];
    const gNavn = dag?.aftensmad?.navn?.toLowerCase();
    const ekstra = dag?.ekstraAftensmad ?? [];
    const tom: Maltid = { navn: '', pris_pr_portion: 0, portioner: personer, ingredienser: [], fremgangsmaade: [] };

    const nyeDage = madplan.dage.map((d, i) => {
      if (i === dagIndex) {
        return ekstra.length > 0
          ? { ...d, aftensmad: ekstra[0], ekstraAftensmad: ekstra.slice(1) }
          : { ...d, aftensmad: tom, ekstraAftensmad: [] };
      }
      // ryd rester-dage der refererede til den slettede ret
      if (gNavn && d.aftensmad?.rester_fra?.toLowerCase() === gNavn) {
        return { ...d, aftensmad: tom };
      }
      return d;
    });
    gemDage(nyeDage);
  }

  // Dagene der vises — den rigtige plan, eller en tom uge så man kan trykke
  // på en dag og vælge en ret, selv før der er genereret en plan.
  const visteDage = madplan?.dage ?? tomUgeplan(personer, uge).dage;

  // Dagene som valg i VælgDagModal (når man har valgt 1 ret i vælgeren).
  // Passerede dage er låste; dage med en ret vises, så man ved den erstattes.
  function dagValg(): VælgDag[] {
    const grænse = førsteFrieDag();
    return visteDage.map((d, i) => ({
      index: i,
      dagNavn: d.dag,
      retNavn: d.aftensmad?.navn?.replace(/^Rester:\s*/i, '').trim() ?? '',
      laast: grænse == null || i < grænse,
    }));
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Madplaner</Text>
        <TouchableOpacity
          style={styles.nyPlanKnap}
          onPress={() => setVælgerSynlig(true)}
        >
          <Text style={styles.nyPlanKnapTekst}>Opskrifter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Uge-vælger */}
        <View style={styles.ugeVælger}>
          <TouchableOpacity onPress={() => skiftUge(-1)}>
            <Text style={styles.ugeArrow}>‹</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.ugeNr}>Uge {uge}</Text>
            {madplan && (() => {
              const antal = (madplan.indkoebsliste ?? [])
                .flatMap(s => s.varer).filter(v => v.paa_tilbud).length;
              return (
                <Text style={styles.ugeSub}>
                  {antal > 0 ? `🏷 ${antal} tilbuds-varer i planen` : 'Ingen tilbud denne uge'}
                </Text>
              );
            })()}
          </View>
          <TouchableOpacity onPress={() => skiftUge(1)}>
            <Text style={styles.ugeArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.green} size="large" />
            <Text style={styles.loadingText}>Henter madplan...</Text>
          </View>
        )}

        {!loading && !madplan && (
          <View style={styles.introKort}>
            <Text style={styles.introEmoji}>🗓️</Text>
            <Text style={styles.introTekst}>Byg ugen dag for dag</Text>
            <Text style={styles.introSub}>
              Tryk på en dag og vælg en ret — eller tryk “Opskrifter” for at vælge flere på én gang.
            </Text>
          </View>
        )}

        {/* Dag-kort: kun aftensmaden, med opskriftens billede — det er det
            spørgsmål planen svarer på. Dagens kort fremhæves. Tomme, frie
            dage kan trykkes for at vælge en ret. */}
        {!loading && visteDage.map((dag, i) => {
          const erIDag = uge === getWeekNumber() && i === iDagIndex;
          const aften = dag.aftensmad;
          const erRester = !!aften?.rester_fra;
          const rentNavn = aften?.navn?.replace(/^Rester:\s*/i, '').trim() ?? '';
          const opskrift = findOpskriftForNavn(rentNavn);
          const billede = opskrift ? billedeFor(opskrift) : null;
          const minutter = (opskrift as any)?.minutter as number | undefined;
          const tilbudsMatch = opskrift && !erRester
            ? tælTilbudsMatch(opskrift.id, butikker)
            : null;
          const g = førsteFrieDag();
          const fri = g != null && i >= g;

          return (
            <TouchableOpacity
              key={i}
              style={[styles.dagKort, erIDag && styles.dagKortIDag]}
              onPress={() => {
                if (aften?.navn) åbnMaltid(dag, 'aftensmad');
                else if (fri) setVælgerMålDag({ index: i, dagNavn: dag.dag });
              }}
              activeOpacity={(aften?.navn || fri) ? 0.8 : 1}
            >
              <View style={styles.dagHeader}>
                <Text style={[styles.dagNavn, erIDag && styles.dagNavnIDag]}>{dag.dag.toUpperCase()}</Text>
                {erIDag && (
                  <View style={styles.iDagBadge}>
                    <Text style={styles.iDagBadgeTekst}>I dag</Text>
                  </View>
                )}
              </View>
              {aften?.navn ? (
                <>
                <View style={styles.aftenRække}>
                  {billede ? (
                    <Image source={billede} style={styles.aftenBillede} />
                  ) : (
                    <View style={[styles.aftenBillede, styles.aftenBilledeTom]}>
                      <Text style={styles.aftenBilledeEmoji}>{erRester ? '🫕' : '🍽️'}</Text>
                    </View>
                  )}
                  <View style={styles.aftenInfo}>
                    {erRester && <Text style={styles.resterTag}>RESTER</Text>}
                    <Text style={styles.aftenNavn} numberOfLines={2}>{rentNavn}</Text>
                    <View style={styles.aftenMeta}>
                      {minutter != null && !erRester && (
                        <Text style={styles.aftenTid}>⏱ {minutter} min</Text>
                      )}
                      {tilbudsMatch && tilbudsMatch.antal > 0 && (
                        <View style={styles.tilbudsBadge}>
                          <Text style={styles.tilbudsBadgeTekst}>🏷 {tilbudsMatch.antal} tilbud</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {/* Byt + Slet direkte fra dag-kortet — låsen følger KORTETS
                      dag: i dag og frem kan ændres. */}
                  {!fri ? (
                    <Text style={styles.retLåst}>🔒</Text>
                  ) : (!erRester && opskrift && (
                    <View style={styles.dagAktioner}>
                      <TouchableOpacity
                        style={styles.bytKnap}
                        onPress={() => setVælgerMålDag({ index: i, dagNavn: dag.dag, byttFra: { id: opskrift.id, navn: rentNavn } })}
                        hitSlop={{ top: 8, bottom: 6, left: 8, right: 8 }}
                      >
                        <Text style={styles.bytKnapTekst}>Byt</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.sletKnap}
                        onPress={() => sletHovedret(i)}
                        hitSlop={{ top: 6, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.sletKnapTekst}>Slet</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Ekstra retter samme dag (salat, tilbehør osv.) — samme
                    størrelse som hovedretten */}
                {(dag.ekstraAftensmad ?? []).map((m, j) => {
                  const eOpskrift = findOpskriftForNavn(m.navn);
                  const eBillede = eOpskrift ? billedeFor(eOpskrift) : null;
                  const eMin = (eOpskrift as any)?.minutter as number | undefined;
                  const eTilbud = eOpskrift ? tælTilbudsMatch(eOpskrift.id, butikker) : null;
                  return (
                    <TouchableOpacity
                      key={j}
                      style={[styles.aftenRække, styles.ekstraSkille]}
                      activeOpacity={0.8}
                      onPress={() => setValgtMaltid({ maltid: m, type: 'aftensmad', dag: dag.dag })}
                    >
                      {eBillede ? (
                        <Image source={eBillede} style={styles.aftenBillede} />
                      ) : (
                        <View style={[styles.aftenBillede, styles.aftenBilledeTom]}>
                          <Text style={styles.aftenBilledeEmoji}>🍽️</Text>
                        </View>
                      )}
                      <View style={styles.aftenInfo}>
                        <Text style={styles.aftenNavn} numberOfLines={2}>{m.navn}</Text>
                        <View style={styles.aftenMeta}>
                          {eMin != null && <Text style={styles.aftenTid}>⏱ {eMin} min</Text>}
                          {eTilbud && eTilbud.antal > 0 && (
                            <View style={styles.tilbudsBadge}>
                              <Text style={styles.tilbudsBadgeTekst}>🏷 {eTilbud.antal} tilbud</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      {fri && (
                        <View style={styles.dagAktioner}>
                          <TouchableOpacity
                            style={styles.bytKnap}
                            onPress={() => setVælgerMålDag({ index: i, dagNavn: dag.dag, byttEkstra: j })}
                            hitSlop={{ top: 8, bottom: 6, left: 8, right: 8 }}
                          >
                            <Text style={styles.bytKnapTekst}>Byt</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.sletKnap}
                            onPress={() => fjernEkstraRet(i, j)}
                            hitSlop={{ top: 6, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.sletKnapTekst}>Slet</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* Tilføj endnu en ret til dagen */}
                {fri && (
                  <TouchableOpacity
                    style={styles.tilføjRetKnap}
                    onPress={() => setVælgerMålDag({ index: i, dagNavn: dag.dag, tilføjEkstra: true })}
                  >
                    <Text style={styles.tilføjRetTekst}>+ Tilføj ret til dagen</Text>
                  </TouchableOpacity>
                )}
                </>
              ) : fri ? (
                <View style={styles.aftenRække}>
                  <View style={[styles.aftenBillede, styles.vælgPlus]}>
                    <Text style={styles.vælgPlusTegn}>+</Text>
                  </View>
                  <View style={styles.aftenInfo}>
                    <Text style={styles.vælgRetTekst}>Vælg ret</Text>
                    <Text style={styles.aftenTom}>Tryk for at vælge en ret til {dag.dag.toLowerCase()}</Text>
                  </View>
                  <Text style={styles.vælgPil}>›</Text>
                </View>
              ) : (
                <View style={styles.aftenRække}>
                  <Text style={styles.aftenTom}>Ingen ret planlagt</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <OpskriftModal
        maltid={valgtMaltid?.maltid ?? null}
        maltidType={valgtMaltid?.type ?? ''}
        dagNavn={valgtMaltid?.dag ?? ''}
        ugeNr={uge}
        onClose={() => setValgtMaltid(null)}
      />

      <VælgRetterModal
        synlig={vælgerSynlig || !!vælgerMålDag}
        målDag={vælgerMålDag ? {
          index: vælgerMålDag.index,
          dagNavn: vælgerMålDag.dagNavn,
          // "Byt"-flowet udskifter præcis én ret → enkelt-valg; ellers flere
          enkeltValg: !!(vælgerMålDag.byttFra || vælgerMålDag.byttEkstra != null),
        } : null}
        butikker={butikker}
        personer={personer}
        forvalgte={forvalgte}
        onPersonerChange={setPersoner}
        onLuk={() => { setVælgerSynlig(false); setVælgerMålDag(null); setForvalgte(null); }}
        onVælgEnRet={(ids) => {
          setForvalgte(null);
          setVælgerSynlig(false);
          const første = findOpskrift(ids[0]);
          const navn = ids.length === 1 ? (første?.navn ?? '') : `${ids.length} retter`;
          setPlacerRet({ ids, navn });
        }}
        onVælgTilDag={vælgTilMålDag}
      />

      <OpskriftDetaljeModal
        opskrift={åbenOpskrift}
        butikker={butikker}
        personer={personer}
        onLuk={() => setÅbenOpskrift(null)}
        onTilføj={tilføjOpskriftTilIndkøb}
        gemmer={gemmerDetalje}
      />

      <VælgDagModal
        synlig={!!placerRet}
        retNavn={placerRet?.navn ?? ''}
        dage={dagValg()}
        onVælg={(idx) => {
          const ids = placerRet?.ids;
          setPlacerRet(null);
          if (ids && ids.length) placérRetterPåDag(ids, idx);
        }}
        onLuk={() => setPlacerRet(null)}
      />
    </SafeAreaView>
  );
}



function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((((now.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
}

// Slå opskriften op ud fra måltidsnavnet — samme opslag som forsiden
// bruger til "I aften"-kortet, så billede og tid altid matcher
function findOpskriftForNavn(navn: string): Opskrift | null {
  if (!navn) return null;
  const n = navn.toLowerCase();
  const alle = alleOpskrifter();
  return alle.find(o => o.navn.toLowerCase() === n)
    ?? alle.find(o => n.includes(o.navn.toLowerCase()))
    ?? null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.canvas },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 12, backgroundColor: Colors.paper,
    borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  title: { fontSize: 22, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.4 },
  nyPlanKnap: {
    backgroundColor: Colors.green, borderRadius: Radii.btn,
    paddingHorizontal: 14, paddingVertical: 8, minWidth: 88, alignItems: 'center',
  },
  nyPlanKnapTekst: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' },
  content: { padding: 20, paddingBottom: 32 },
  ugeVælger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.green, borderRadius: Radii.card, padding: 18, marginBottom: 16,
  },
  ugeArrow: { fontSize: 28, color: '#fff', paddingHorizontal: 8 },
  ugeNr: { fontSize: 18, fontFamily: 'BricolageGrotesque_700Bold', color: '#fff', letterSpacing: -0.3 },
  ugeSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  tilbudsBadge: {
    backgroundColor: '#F0FAF0', borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.green,
  },
  tilbudsBadgeTekst: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.green },
  loadingWrap: { alignItems: 'center', marginTop: 60, gap: 16 },
  loadingText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textAlign: 'center', paddingHorizontal: 32 },
  introKort: {
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line,
    alignItems: 'center', padding: 20, marginBottom: 16, gap: 6,
  },
  introEmoji: { fontSize: 40 },
  introTekst: { fontSize: 16, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink, letterSpacing: -0.2 },
  introSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textAlign: 'center', lineHeight: 19 },
  dagKort: {
    backgroundColor: Colors.card, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.line, marginBottom: 12, overflow: 'hidden',
  },
  dagKortIDag: { borderWidth: 2, borderColor: Colors.green },
  dagHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  dagNavn: {
    fontSize: 11, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.inkSoft,
    letterSpacing: 1,
  },
  dagNavnIDag: { color: Colors.green },
  iDagBadge: {
    backgroundColor: Colors.green, borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 2,
  },
  iDagBadgeTekst: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#fff' },
  aftenRække: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 14, gap: 12,
  },
  aftenBillede: {
    width: 80, height: 80, borderRadius: Radii.thumb,
    backgroundColor: Colors.line,
  },
  aftenBilledeTom: { alignItems: 'center', justifyContent: 'center' },
  aftenBilledeEmoji: { fontSize: 30 },
  aftenInfo: { flex: 1 },
  resterTag: {
    fontSize: 10, fontFamily: 'Inter_700Bold', color: Colors.inkSoft,
    letterSpacing: 0.8, marginBottom: 2,
  },
  aftenNavn: {
    fontSize: 16, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink,
    letterSpacing: -0.2,
  },
  aftenMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  aftenTid: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  aftenTom: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  vælgPlus: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F0FAF0', borderWidth: 1, borderColor: Colors.green,
    borderStyle: 'dashed',
  },
  vælgPlusTegn: { fontSize: 34, color: Colors.green, fontFamily: 'Inter_400Regular', lineHeight: 38 },
  vælgRetTekst: { fontSize: 16, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.green, letterSpacing: -0.2 },
  vælgPil: { fontSize: 24, color: Colors.green },
  bytKnap: {
    backgroundColor: Colors.card, borderRadius: 999,
    borderWidth: 1, borderColor: Colors.green,
    paddingHorizontal: 12, paddingVertical: 5, alignItems: 'center',
  },
  bytKnapTekst: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.green },
  retLåst: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  ekstraSkille: { borderTopWidth: 1, borderTopColor: Colors.line, paddingTop: 14 },
  dagAktioner: { gap: 6, alignItems: 'stretch' },
  sletKnap: {
    backgroundColor: Colors.card, borderRadius: 999,
    borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 12, paddingVertical: 5, alignItems: 'center',
  },
  sletKnapTekst: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.red },
  tilføjRetKnap: {
    marginHorizontal: 16, marginBottom: 14, marginTop: 2,
    borderRadius: 999, borderWidth: 1, borderColor: Colors.green, borderStyle: 'dashed',
    paddingVertical: 9, alignItems: 'center',
  },
  tilføjRetTekst: { fontSize: 13, fontFamily: 'Inter_700Bold', color: Colors.green },
});
