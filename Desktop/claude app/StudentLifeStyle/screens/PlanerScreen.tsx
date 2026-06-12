import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import ButiksPill from '../components/ButiksPill';
import OpskriftModal from '../components/OpskriftModal';
import VælgRetterModal from '../components/VælgRetterModal';
import OpskriftDetaljeModal from '../components/OpskriftDetaljeModal';
import BytRetModal from '../components/BytRetModal';
import { supabase } from '../lib/supabase';
import { Madplan, Dag, Maltid, Ingrediens } from '../types/madplan';
import { OPSKRIFTER } from '../constants/opskrifter';
import { bygIndkøbsliste, beregnBesparelse } from '../constants/indkoeb';
import { slåEffektivPrisOp } from '../constants/tilbudspriser';
import { hentOpskriftPriser } from '../constants/opskriftPriser';
import { tagForvalgteRetter } from '../constants/onboardingHandoff';
import { sætValgtUge, hentValgtUge } from '../constants/ugeState';

const MALTID_IKONER = { morgenmad: '🌅', frokost: '🥙', aftensmad: '🍽️' };
const MALTID_LABELS = { morgenmad: 'Morgenmad', frokost: 'Frokost', aftensmad: 'Aftensmad' };

export default function PlanerScreen() {
  const [madplan, setMadplan] = useState<Madplan | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uge, setUge] = useState(() => hentValgtUge(getWeekNumber()));
  const [budget, setBudget] = useState(350);
  const [valgtMaltid, setValgtMaltid] = useState<{ maltid: Maltid; type: string; dag: string } | null>(null);
  const [vælgerSynlig, setVælgerSynlig] = useState(false);
  const [kost, setKost] = useState<string[]>(['Alt']);
  const [butikker, setButikker] = useState<string[]>([]);
  const [personer, setPersoner] = useState(4);
  const [åbenOpskrift, setÅbenOpskrift] = useState<typeof OPSKRIFTER[0] | null>(null);
  const [gemmerDetalje, setGemmerDetalje] = useState(false);
  // Retter fra onboardingens aha-skærm — seeder vælgeren én gang, så
  // tallet brugeren lige har set, holder hele vejen til planen
  const [forvalgte, setForvalgte] = useState<string[] | null>(null);
  // Ret der er ved at blive byttet ud (åbner BytRetModal)
  const [bytRet, setBytRet] = useState<{ id: string; navn: string } | null>(null);
  // Mandag = 0 ... søndag = 6, samme rækkefølge som plan.dage
  const iDagIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  // Hvilken dag laves retten? Første dag hvor den står som aftensmad
  // (rester tæller ikke — de følger med, når selve retten byttes).
  function dagIndexForRet(navn: string): number | null {
    const dage = madplan?.dage ?? [];
    for (let i = 0; i < dage.length; i++) {
      const a = dage[i]?.aftensmad;
      if (a?.navn && !a.rester_fra && a.navn.toLowerCase() === navn.toLowerCase()) return i;
    }
    return null;
  }

  // Dag-lås: passerede dage i indeværende uge kan ikke byttes — maden er
  // (formentlig) købt og lavet. Fremtidige uger kan altid redigeres,
  // tidligere uger aldrig.
  function kanRetByttes(navn: string): boolean {
    const nuUge = getWeekNumber();
    if (uge < nuUge) return false;
    if (uge > nuUge) return true;
    const dagIdx = dagIndexForRet(navn);
    return dagIdx == null || dagIdx >= iDagIndex;
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
      supabase.from('profiles').select('budget_per_week, diet, stores, household_size').maybeSingle()
        .then(({ data }) => {
          if (data?.budget_per_week) setBudget(data.budget_per_week);
          if (data?.diet) setKost(data.diet);
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

  async function generer(opskriftIds: string[]) {
    setGenerating(true);
    try {
      const { data: profil } = await supabase
        .from('profiles').select('stores, budget_per_week, diet, household_size').maybeSingle();

      const stores: string[] = profil?.stores ?? ['Netto'];
      const planBudget: number = profil?.budget_per_week ?? 350;
      const kostPræf: string[] = profil?.diet ?? ['Alt'];

      const { data, error } = await supabase.functions.invoke('dynamic-action', {
        body: { action: 'generate_meal_plan', budget: planBudget, personer, kost: kostPræf, stores, opskriftIds },
      });
      if (error) throw error;

      // Byg indkøbslisten deterministisk fra valgte opskrifter, skaleret til personer
      const autoListe = bygIndkøbsliste(opskriftIds, butikker, personer);
      const autoTotal = autoListe.reduce((s, b) => s + b.subtotal, 0);
      data.indkoebsliste = autoListe;
      data.indkoebspris = autoTotal;
      data.total = autoTotal;
      data.besparelse = beregnBesparelse(autoListe);
      data.antal_personer = personer;

      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error('Ikke logget ind');

      await supabase.from('profiles').upsert({ id: u.id }, { onConflict: 'id', ignoreDuplicates: true });
      const { error: gemFejl } = await supabase.from('madplaner').upsert({
        user_id: u.id,
        uge_nr: uge,
        plan: data,
        total_pris: autoTotal,
        total_spar: data.besparelse ?? 0,
      }, { onConflict: 'user_id,uge_nr' });

      if (gemFejl) throw new Error(`Gem fejlede: ${gemFejl.message}`);
      setMadplan(data);
    } catch (e: any) {
      Alert.alert('Fejl', e.message ?? 'Prøv igen');
    } finally {
      setGenerating(false);
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
  async function bytRetUd(nyId: string) {
    if (!bytRet || !madplan) return;
    const opskrift = OPSKRIFTER.find(o => o.id === nyId);
    if (!opskrift) return;
    const gammel = bytRet;
    setBytRet(null);

    const info = hentOpskriftPriser(butikker, personer).get(nyId);
    const gammelTotal = madplan.indkoebspris ?? madplan.total ?? 0;
    const nyPortioner = info?.portioner ?? (opskrift.portioner || 4);

    const nyeValgte = (madplan.valgte_opskrifter ?? []).map(r =>
      r.id === gammel.id ? { id: nyId, navn: opskrift.navn, portioner: nyPortioner } : r
    );

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

    const nyeDage = (madplan.dage ?? []).map(d => {
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

    const tjekkede = new Set<string>();
    for (const s of madplan.indkoebsliste ?? [])
      for (const v of s.varer) if (v.checked) tjekkede.add(v.vare.toLowerCase());
    const nyListe = bygIndkøbsliste(nyeValgte.map(r => r.id), butikker, personer)
      .map(s => ({ ...s, varer: s.varer.map(v => ({ ...v, checked: tjekkede.has(v.vare.toLowerCase()) })) }));
    const nyTotal = nyListe.reduce((s, b) => s + b.subtotal, 0);
    const nySpar = beregnBesparelse(nyListe);

    const nyPlan: Madplan = {
      ...madplan, valgte_opskrifter: nyeValgte, dage: nyeDage,
      indkoebsliste: nyListe, indkoebspris: nyTotal, total: nyTotal, besparelse: nySpar,
    };
    const { error } = await supabase.from('madplaner')
      .update({ plan: nyPlan, total_pris: nyTotal, total_spar: nySpar })
      .eq('uge_nr', uge);
    if (error) {
      Alert.alert('Fejl', 'Byttet kunne ikke gemmes. Prøv igen.');
      return;
    }
    setMadplan(nyPlan);
    const delta = nyTotal - gammelTotal;
    Alert.alert(
      'Ret byttet ✅',
      `Ugens pris: ${nyTotal} kr (${delta === 0 ? '±0' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`} kr)` +
      (nySpar > 0 ? ` · du sparer ${nySpar} kr på tilbud` : '')
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

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Madplaner</Text>
        <TouchableOpacity
          style={styles.nyPlanKnap}
          onPress={() => setVælgerSynlig(true)}
          disabled={generating}
        >
          {generating
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.nyPlanKnapTekst}>+ Ny plan</Text>
          }
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
            {madplan && (
              <Text style={styles.ugeSub}>
                {madplan.indkoebspris ?? madplan.total ?? 0} / {budget} kr
                {(madplan.besparelse ?? 0) > 0
                  ? ` · spar ${madplan.besparelse} kr på tilbud`
                  : ` · ${Math.max(0, budget - (madplan.indkoebspris ?? madplan.total ?? 0))} kr tilbage`
                }
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => skiftUge(1)}>
            <Text style={styles.ugeArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Dine valgte retter — fra deterministisk kilde */}
        {madplan?.valgte_opskrifter && madplan.valgte_opskrifter.length > 0 && (
          <View style={styles.valgteRetterSektion}>
            <Text style={styles.retterTitel}>Dine valgte retter</Text>
            {madplan.valgte_opskrifter.map((ret, i) => {
              const opskrift = OPSKRIFTER.find(o => o.id === ret.id);
              const kanByttes = kanRetByttes(ret.navn);
              const dagIdx = dagIndexForRet(ret.navn);
              const dagNavn = dagIdx != null ? madplan.dage?.[dagIdx]?.dag : null;
              return (
                <TouchableOpacity
                  key={ret.id}
                  style={styles.retRække}
                  onPress={() => opskrift && setÅbenOpskrift(opskrift)}
                  activeOpacity={opskrift ? 0.7 : 1}
                >
                  <View style={[styles.retNummer, styles.retNummerAktiv]}>
                    <Text style={styles.retNummerTekst}>{i + 1}</Text>
                  </View>
                  <Text style={styles.retNavn} numberOfLines={1}>{ret.navn}</Text>
                  <Text style={styles.retPortioner}>{ret.portioner} port.</Text>
                  {kanByttes ? (
                    <TouchableOpacity
                      style={styles.bytKnap}
                      onPress={() => setBytRet({ id: ret.id, navn: ret.navn })}
                      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                    >
                      <Text style={styles.bytKnapTekst}>Byt</Text>
                    </TouchableOpacity>
                  ) : (
                    /* Dagen er passeret — maden er købt og (formentlig) lavet */
                    <Text style={styles.retLåst}>🔒{dagNavn ? ` ${dagNavn.slice(0, 3)}` : ''}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Protein-ankre */}
        {madplan?.proteinkilder && madplan.proteinkilder.length > 0 && (
          <View style={styles.proteinRow}>
            <Text style={styles.proteinLabel}>Bygget på: </Text>
            {madplan.proteinkilder.map((p, i) => (
              <View key={i} style={styles.proteinBadge}>
                <Text style={styles.proteinBadgeTekst}>{p}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Spild / gemt info */}
        {madplan && ((madplan.spild_kr ?? 0) > 0 || (madplan.gemt_vaerdi ?? 0) > 0) && (
          <View style={styles.pantryRad}>
            {(madplan.gemt_vaerdi ?? 0) > 0 && (
              <View style={styles.pantryGemt}>
                <Text style={styles.pantryTekst}>🫙 Gemt: {madplan.gemt_vaerdi} kr</Text>
              </View>
            )}
            {(madplan.spild_kr ?? 0) > 0 && (
              <View style={styles.pantrySpild}>
                <Text style={styles.pantryTekst}>⚠️ Spild: {madplan.spild_kr} kr</Text>
              </View>
            )}
          </View>
        )}

        {/* Advarsel hvis planen er over budget */}
        {madplan?.advarsler && madplan.advarsler.length > 0 && (
          <View style={styles.advarsel}>
            <Text style={styles.advarselTekst}>⚠️ {madplan.advarsler[0]}</Text>
          </View>
        )}

        {(loading || generating) && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.green} size="large" />
            <Text style={styles.loadingText}>
              {generating ? 'Bygger din madplan og regner priserne ud...' : 'Henter madplan...'}
            </Text>
          </View>
        )}

        {!loading && !generating && !madplan && (
          <View style={styles.tom}>
            <Text style={styles.tomEmoji}>🗓️</Text>
            <Text style={styles.tomTekst}>Ingen plan for denne uge</Text>
            <Text style={styles.tomSub}>Vælg ugens retter og få indkøbsliste med tilbudspriser</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setVælgerSynlig(true)}>
              <Text style={styles.btnText}>Generér madplan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Dag-kort med 3 måltider — dagens kort fremhæves, så man ikke
            skal lede efter onsdag blandt 7 ens kort */}
        {!loading && !generating && madplan?.dage?.map((dag, i) => {
          const erIDag = uge === getWeekNumber() && i === iDagIndex;
          return (
          <View key={i} style={[styles.dagKort, erIDag && styles.dagKortIDag]}>
            <View style={styles.dagHeader}>
              <Text style={[styles.dagNavn, erIDag && styles.dagNavnIDag]}>{dag.dag.toUpperCase()}</Text>
              {erIDag && (
                <View style={styles.iDagBadge}>
                  <Text style={styles.iDagBadgeTekst}>I dag</Text>
                </View>
              )}
            </View>
            <View style={styles.dagDivider} />
            {(['morgenmad', 'frokost', 'aftensmad'] as const).map(type => {
              const maltid = dag[type];
              if (!maltid) return null;
              const erRester = !!maltid.rester_fra;
              const primærButik = maltid.ingredienser?.find(i => i.butik)?.butik;

              return (
                <TouchableOpacity
                  key={type}
                  style={styles.maltidRække}
                  onPress={() => åbnMaltid(dag, type)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.maltidIkon}>{MALTID_IKONER[type]}</Text>
                  <View style={styles.maltidMidten}>
                    <Text style={styles.maltidLabel}>{MALTID_LABELS[type]}</Text>
                    <Text style={styles.maltidNavn} numberOfLines={1}>
                      {erRester ? `Rester: ${maltid.navn.replace(/^Rester:\s*/i, '')}` : maltid.navn}
                    </Text>
                  </View>
                  {primærButik && !erRester && (
                    <View style={styles.maltidHøjre}>
                      <ButiksPill name={primærButik} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
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
        synlig={vælgerSynlig}
        kost={kost}
        budget={budget}
        butikker={butikker}
        personer={personer}
        forvalgte={forvalgte}
        onPersonerChange={setPersoner}
        onLuk={() => { setVælgerSynlig(false); setForvalgte(null); }}
        onGenerer={(ids) => { setForvalgte(null); generer(ids); }}
      />

      <OpskriftDetaljeModal
        opskrift={åbenOpskrift}
        butikker={butikker}
        personer={personer}
        onLuk={() => setÅbenOpskrift(null)}
        onTilføj={tilføjOpskriftTilIndkøb}
        gemmer={gemmerDetalje}
      />

      <BytRetModal
        synlig={!!bytRet}
        gammelRet={bytRet}
        kost={kost}
        butikker={butikker}
        personer={personer}
        eksisterendeIds={(madplan?.valgte_opskrifter ?? []).map(r => r.id)}
        onLuk={() => setBytRet(null)}
        onVælg={bytRetUd}
      />
    </SafeAreaView>
  );
}



function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((((now.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
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
  proteinRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    marginBottom: 10, gap: 6,
  },
  proteinLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  proteinBadge: {
    backgroundColor: Colors.greenSoft, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  proteinBadgeTekst: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.green },
  pantryRad: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  pantryGemt: {
    flex: 1, backgroundColor: Colors.greenSoft, borderRadius: Radii.btn,
    padding: 10, alignItems: 'center',
  },
  pantrySpild: {
    flex: 1, backgroundColor: '#FFF8E1', borderRadius: Radii.btn,
    padding: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.yellow,
  },
  pantryTekst: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  advarsel: {
    backgroundColor: '#FFF8E1', borderRadius: Radii.btn, padding: 12,
    marginBottom: 14, borderWidth: 1, borderColor: Colors.yellow,
  },
  advarselTekst: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.ink },
  loadingWrap: { alignItems: 'center', marginTop: 60, gap: 16 },
  loadingText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textAlign: 'center', paddingHorizontal: 32 },
  tom: { alignItems: 'center', marginTop: 60, gap: 12 },
  tomEmoji: { fontSize: 56 },
  tomTekst: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  tomSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, textAlign: 'center' },
  btnPrimary: { backgroundColor: Colors.green, borderRadius: Radii.btn, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
  btnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
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
  dagDivider: { height: 1, backgroundColor: Colors.line, marginHorizontal: 16 },
  maltidRække: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  maltidIkon: { fontSize: 18, marginRight: 12, width: 24, textAlign: 'center' },
  maltidMidten: { flex: 1, marginRight: 8 },
  maltidLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  maltidNavn: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.ink },
  maltidHøjre: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  maltidPris: { fontSize: 14, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.ink },
  maltidPrisFri: { color: Colors.greenBright },
  valgteRetterSektion: {
    backgroundColor: Colors.greenSoft, borderRadius: Radii.card,
    borderWidth: 1, borderColor: Colors.green, padding: 16, marginBottom: 12,
  },
  retterTitel: {
    fontSize: 11, fontFamily: 'BricolageGrotesque_700Bold', color: Colors.green,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  retRække: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  retDetaljeHint: {
    fontSize: 18, color: Colors.inkSoft, marginLeft: 4,
  },
  retNummer: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  retNummerAktiv: { backgroundColor: Colors.greenBright },
  retNummerTekst: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' },
  retNavn: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.ink },
  retPortioner: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  bytKnap: {
    backgroundColor: Colors.card, borderRadius: 999,
    borderWidth: 1, borderColor: Colors.green,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  bytKnapTekst: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.green },
  retLåst: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
});
