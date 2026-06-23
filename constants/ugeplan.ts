// Deterministisk uge-layout — bygger madplanen ØJEBLIKKELIGT i appen uden
// AI. Fordeler de valgte retter på ugens dage, lægger bevidste rester på
// de følgende aftener, og genberegner indkøbsliste, pris og besparelse med
// samme motor som resten af appen (slåEffektivPrisOp / bygIndkøbsliste).
//
// Erstatter det gamle GPT-4o-kald, der brugte 30-90 sek på at skrive en
// kæmpe JSON, hvoraf næsten alt blev smidt væk. Nu: millisekunder, gratis,
// offline. (ROADMAP: "lav uge-layoutet uden AI — øjeblikkeligt, gratis.")
import { hentOpskriftPriser } from './opskriftPriser';
import { måltiderPrRet } from './anbefaling';
import { slåEffektivPrisOp } from './tilbudspriser';
import { findOpskrift } from '../lib/brugerOpskrifter';
import { Madplan, Dag, Maltid, Ingrediens } from '../types/madplan';
import type { Opskrift } from '../types/opskrift';

const UGEDAGE = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

// Tomt måltid til morgenmad/frokost — vises ikke på ugeoversigten (kun
// aftensmaden), men Dag-typen kræver felterne udfyldt.
function tomMaltid(personer: number): Maltid {
  return { navn: '', pris_pr_portion: 0, portioner: personer, ingredienser: [], fremgangsmaade: [] };
}

// Aftensmad-måltid for en ret der laves (ikke rester) — samme felter og
// priser som byt-en-ret producerer, så de to veje altid matcher.
function kogtAftensmad(
  opskrift: Opskrift,
  butikker: string[] | undefined,
  portionerSkaleret: number,
  prisPrPortion: number,
  personer: number,
): Maltid {
  const ingredienser: Ingrediens[] = (opskrift.ingredienser as any[])
    .filter(i => !(i.estimeret && i.estimereretPris === 0))
    .map(i => {
      const e = slåEffektivPrisOp(i, butikker);
      return {
        vare: i.navn, butik: e.butik, brugt: i.maengde, pakkestoerrelse: i.maengde,
        pakkepris: e.pris, paa_tilbud: e.paaTilbud, normalpris: e.normalpris,
      } as Ingrediens;
    });
  const rester = Math.max(0, portionerSkaleret - personer);
  return {
    navn: opskrift.navn,
    pris_pr_portion: prisPrPortion,
    portioner: portionerSkaleret,
    ingredienser,
    fremgangsmaade: opskrift.fremgangsmaade ?? [],
    ...(rester > 0 ? { ekstra_portioner_til_rester: rester } : {}),
  };
}

// Rester-aften: refererer til rettens NAVN (ikke "Mandag aftensmad"), så
// byt-en-ret kan finde og opdatere resterne, når selve retten byttes.
function resterAftensmad(opskrift: Opskrift, personer: number): Maltid {
  return {
    navn: `Rester: ${opskrift.navn}`,
    rester_fra: opskrift.navn,
    pris_pr_portion: 0,
    portioner: personer,
    fremgangsmaade: ['Varm resterne op'],
    ingredienser: [],
  };
}

export function byggUgeplan(
  opskriftIds: string[],
  butikker: string[] | undefined,
  personer: number,
  ugeNr: number,
  budget: number,
): Madplan {
  const priser = hentOpskriftPriser(butikker, personer);

  // Bevar brugerens rækkefølge fra vælgeren
  const valgte = opskriftIds
    .map(id => findOpskrift(id))
    .filter((o): o is Opskrift => !!o);

  // Byg aftens-slots: hver ret fylder måltiderPrRet aftener — første er
  // kogt, resten er rester. Slots placeres i rækkefølge over ugens dage.
  const aftenslots: Maltid[] = [];
  for (const opskrift of valgte) {
    if (aftenslots.length >= UGEDAGE.length) break;
    const info = priser.get(opskrift.id);
    const portionerSkaleret = info?.portioner ?? (opskrift.portioner || 4);
    const prisPrPortion = info && info.portioner > 0 ? Math.round(info.pris / info.portioner) : 0;
    const aftener = måltiderPrRet(portionerSkaleret, personer);

    aftenslots.push(kogtAftensmad(opskrift, butikker, portionerSkaleret, prisPrPortion, personer));
    for (let r = 1; r < aftener && aftenslots.length < UGEDAGE.length; r++) {
      aftenslots.push(resterAftensmad(opskrift, personer));
    }
  }

  const dage: Dag[] = UGEDAGE.map((navn, i) => ({
    dag: navn,
    morgenmad: tomMaltid(personer),
    frokost: tomMaltid(personer),
    aftensmad: aftenslots[i] ?? tomMaltid(personer),
  }));

  // Indkøbslisten starter TOM. Varerne lægges først i listen, når brugeren
  // åbner en opskrift og trykker "Tilføj til indkøbsliste" — så listen
  // afspejler hvad familien rent faktisk vil købe, ikke hele planen automatisk.
  return {
    uge: ugeNr,
    antal_personer: personer,
    dage,
    valgte_opskrifter: valgte.map(o => ({
      id: o.id,
      navn: o.navn,
      portioner: priser.get(o.id)?.portioner ?? (o.portioner || 4),
    })),
    indkoebsliste: [],
    indkoebspris: 0,
    total: 0,
    besparelse: 0,
    advarsler: [],
  };
}

// En tom plan med ugens 7 dage og ingen retter — udgangspunktet, når
// brugeren bygger ugen dag for dag (tryk på en dag → vælg én ret) i stedet
// for at generere hele planen på én gang.
export function tomUgeplan(personer: number, ugeNr: number): Madplan {
  return {
    uge: ugeNr,
    antal_personer: personer,
    dage: UGEDAGE.map(navn => ({
      dag: navn,
      morgenmad: tomMaltid(personer),
      frokost: tomMaltid(personer),
      aftensmad: tomMaltid(personer),
    })),
    valgte_opskrifter: [],
    indkoebsliste: [],
    indkoebspris: 0,
    total: 0,
    besparelse: 0,
    advarsler: [],
  };
}

// Byg aftensmad-måltidet for én ret — samme felter og priser som
// byggUgeplan og byt-en-ret producerer, så alle veje matcher. Bruges når
// brugeren vælger en ret til en enkelt dag.
export function byggAftensmadForRet(
  opskriftId: string,
  butikker: string[] | undefined,
  personer: number,
): { maltid: Maltid; portioner: number } | null {
  const opskrift = findOpskrift(opskriftId);
  if (!opskrift) return null;
  const info = hentOpskriftPriser(butikker, personer).get(opskriftId);
  const portionerSkaleret = info?.portioner ?? (opskrift.portioner || 4);
  const prisPrPortion = info && info.portioner > 0 ? Math.round(info.pris / info.portioner) : 0;
  return {
    maltid: kogtAftensmad(opskrift, butikker, portionerSkaleret, prisPrPortion, personer),
    portioner: portionerSkaleret,
  };
}
