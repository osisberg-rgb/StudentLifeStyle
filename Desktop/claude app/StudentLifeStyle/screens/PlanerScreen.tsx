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
import BytRetModal from '../components/BytRetModal';
import { supabase } from '../lib/supabase';
import { Madplan, Dag, Maltid, Ingrediens } from '../types/madplan';
import { OPSKRIFTER } from '../constants/opskrifter';
import { bygIndkøbsliste, beregnBesparelse } from '../constants/indkoeb';
import { slåEffektivPrisOp } from '../constants/tilbudspriser';
import { hentOpskriftPriser } from '../constants/opskriftPriser';
import { byggUgeplan } from '../constants/ugeplan';
import { tagForvalgteRetter } from '../constants/onboardingHandoff';
import { sætValgtUge, hentValgtUge } from '../constants/ugeState';
import { hentBillede } from '../constants/opskriftBilleder';
import { tælTilbudsMatch } from '../constants/tilbudsMatch';

export default function PlanerScreen() {
  const [madplan, setMadplan] = useState<Madplan | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uge, setUge] = useState(() => hentValgtUge(getWeekNumber()));
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

  // Dag-lås: første dag der stadig må ændres. 0 i fremtidige uger,
  // i dag i indeværende uge, null i tidligere uger (alt er historie).
  // Bruges både af dag-kortets Byt-knap og af bytRetUd, så en ret kun
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
      supabase.from('profiles').select('diet, stores, household_size').maybeSingle()
        .then(({ data }) => {
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
      const plan = byggUgeplan(opskriftIds, butikker, personer, uge, 0);

      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error('Ikke logget ind');

      await supabase.from('profiles').upsert({ id: u.id }, { onConflict: 'id', ignoreDuplicates: true });
      const { error: gemFejl } = await supabase.from('madplaner').upsert({
        user_id: u.id,
        uge_nr: uge,
        plan,
        total_pris: plan.indkoebspris,
        total_spar: plan.besparelse ?? 0,
      }, { onConflict: 'user_id,uge_nr' });

      if (gemFejl) throw new Error(`Gem fejlede: ${gemFejl.message}`);
      setMadplan(plan);
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

        {(loading || generating) && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.green} size="large" />
            <Text style={styles.loadingText}>
              {generating ? 'Bygger din madplan...' : 'Henter madplan...'}
            </Text>
          </View>
        )}

        {!loading && !generating && !madplan && (
          <View style={styles.tom}>
            <Text style={styles.tomEmoji}>🗓️</Text>
            <Text style={styles.tomTekst}>Ingen plan for denne uge</Text>
            <Text style={styles.tomSub}>Vælg ugens retter og se hvilke ingredienser der er på tilbud</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setVælgerSynlig(true)}>
              <Text style={styles.btnText}>Generér madplan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Dag-kort: kun aftensmaden, med opskriftens billede — det er det
            spørgsmål planen svarer på. Dagens kort fremhæves. */}
        {!loading && !generating && madplan?.dage?.map((dag, i) => {
          const erIDag = uge === getWeekNumber() && i === iDagIndex;
          const aften = dag.aftensmad;
          const erRester = !!aften?.rester_fra;
          const rentNavn = aften?.navn?.replace(/^Rester:\s*/i, '').trim() ?? '';
          const opskrift = findOpskriftForNavn(rentNavn);
          const billede = opskrift ? hentBillede(opskrift.id) : null;
          const minutter = (opskrift as any)?.minutter as number | undefined;
          const tilbudsMatch = opskrift && !erRester
            ? tælTilbudsMatch(opskrift.id, butikker)
            : null;

          return (
            <TouchableOpacity
              key={i}
              style={[styles.dagKort, erIDag && styles.dagKortIDag]}
              onPress={() => aften?.navn && åbnMaltid(dag, 'aftensmad')}
              activeOpacity={aften?.navn ? 0.8 : 1}
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
                  {/* Byt direkte fra dag-kortet — låsen følger KORTETS dag:
                      i dag og frem kan byttes, også selvom retten først blev
                      lavet tidligere på ugen. Rester følger med automatisk. */}
                  {!erRester && opskrift && (
                    (() => { const g = førsteFrieDag(); return g != null && i >= g; })() ? (
                      <TouchableOpacity
                        style={styles.bytKnap}
                        onPress={() => setBytRet({ id: opskrift.id, navn: rentNavn })}
                        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                      >
                        <Text style={styles.bytKnapTekst}>Byt</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.retLåst}>🔒</Text>
                    )
                  )}
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
        synlig={vælgerSynlig}
        kost={kost}
        budget={0}
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

// Slå opskriften op ud fra måltidsnavnet — samme opslag som forsiden
// bruger til "I aften"-kortet, så billede og tid altid matcher
function findOpskriftForNavn(navn: string): typeof OPSKRIFTER[0] | null {
  if (!navn) return null;
  const n = navn.toLowerCase();
  return OPSKRIFTER.find(o => o.navn.toLowerCase() === n)
    ?? OPSKRIFTER.find(o => n.includes(o.navn.toLowerCase()))
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
  aftenTom: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft, fontStyle: 'italic' },
  bytKnap: {
    backgroundColor: Colors.card, borderRadius: 999,
    borderWidth: 1, borderColor: Colors.green,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  bytKnapTekst: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.green },
  retLåst: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
});
