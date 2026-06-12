import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "https://deno.land/x/openai@v4.52.7/mod.ts";
import { OPSKRIFTER } from "./opskrifter.ts";

// Basispris-opslag: søgeord (lowercase) → normalpris i kr
// Bruges til deterministisk besparelses-beregning når en vare er på tilbud
const BASISPRISER: Array<{ soeg: string[]; pris: number }> = [
  { soeg: ["havregryn"], pris: 10 },
  { soeg: ["rugbrød", "rugbroed"], pris: 12 },
  { soeg: ["toastbrød", "toastbroed"], pris: 12 },
  { soeg: ["grovboller"], pris: 18 },
  { soeg: ["knækbrød", "knaekbroed"], pris: 13 },
  { soeg: ["cornflakes"], pris: 18 },
  { soeg: ["mysli"], pris: 24 },
  { soeg: ["hvedemel"], pris: 13 },
  { soeg: ["rugmel"], pris: 14 },
  { soeg: ["sukker"], pris: 13 },
  { soeg: ["rasp"], pris: 13 },
  { soeg: ["spaghetti"], pris: 10 },
  { soeg: ["pasta", "pastaskruer", "penne"], pris: 12 },
  { soeg: ["fuldkornspasta"], pris: 14 },
  { soeg: ["lasagneplader"], pris: 18 },
  { soeg: ["parboiled"], pris: 17 },
  { soeg: ["jasminris", "jasmin ris"], pris: 27 },
  { soeg: ["basmatiris", "basmati"], pris: 31 },
  { soeg: ["ris"], pris: 17 },
  { soeg: ["couscous"], pris: 15 },
  { soeg: ["bulgur"], pris: 18 },
  { soeg: ["nudler"], pris: 17 },
  { soeg: ["kartofler", "kartofler"], pris: 12 },
  { soeg: ["søde kartofler", "sode kartofler"], pris: 27 },
  { soeg: ["tortilla"], pris: 17 },
  { soeg: ["pitabrød", "pitabroed"], pris: 15 },
  { soeg: ["letmælk", "letmaelk", "skummetmælk", "sødmælk", "sodmaelk", "mælk", "maelk"], pris: 12 },
  { soeg: ["yoghurt naturel"], pris: 17 },
  { soeg: ["a38", "skyr"], pris: 26 },
  { soeg: ["yoghurt"], pris: 17 },
  { soeg: ["creme fraiche", "cremefine", "madlavningsfløde", "madlavningsfloede"], pris: 12 },
  { soeg: ["hytteost"], pris: 23 },
  { soeg: ["smørbar", "smorbar", "lurpak"], pris: 18 },
  { soeg: ["smør", "smor"], pris: 27 },
  { soeg: ["revet ost"], pris: 21 },
  { soeg: ["mozzarella"], pris: 21 },
  { soeg: ["ost"], pris: 50 },
  { soeg: ["æg", "aeg", "skrabeæg", "skrabaeaeg", "øko æg"], pris: 28 },
  { soeg: ["hakket oksekød", "hakket okse", "oksekød", "okse"], pris: 42 },
  { soeg: ["hakket grisekød", "hakket grise", "hakket dansk grise", "svinekød", "grisekød"], pris: 35 },
  { soeg: ["hakket kylling"], pris: 35 },
  { soeg: ["kyllingebryst", "kyllingebrystfilet", "kyllingeinderfilet"], pris: 47 },
  { soeg: ["kyllingelår", "kyllingeoverlår", "kylling"], pris: 47 },
  { soeg: ["bacontern", "bacon"], pris: 18 },
  { soeg: ["skinke"], pris: 18 },
  { soeg: ["pølser", "medister", "polser"], pris: 26 },
  { soeg: ["leverpostej"], pris: 14 },
  { soeg: ["fiskefrikadeller"], pris: 30 },
  { soeg: ["torskerogn"], pris: 17 },
  { soeg: ["tun"], pris: 12 },
  { soeg: ["makrel"], pris: 13 },
  { soeg: ["sardiner"], pris: 15 },
  { soeg: ["hakkede tomater", "dåsetomater", "daasetomater"], pris: 8 },
  { soeg: ["flåede tomater", "flaede tomater"], pris: 8 },
  { soeg: ["passata"], pris: 14 },
  { soeg: ["tomatpuré", "tomatpure"], pris: 7 },
  { soeg: ["kidneybønner", "kidneybonner"], pris: 9 },
  { soeg: ["sorte bønner", "sorte bonner"], pris: 11 },
  { soeg: ["kikærter", "kikaerter"], pris: 9 },
  { soeg: ["linser"], pris: 19 },
  { soeg: ["baked beans"], pris: 11 },
  { soeg: ["majs"], pris: 9 },
  { soeg: ["ærter", "aerter", "gulerødder dåse"], pris: 11 },
  { soeg: ["champignon"], pris: 11 },
  { soeg: ["kokosmælk", "kokosmælk"], pris: 14 },
  { soeg: ["bouillon"], pris: 1 },
  { soeg: ["pasta sauce", "pastasauce"], pris: 15 },
  { soeg: ["karrysauce", "karry"], pris: 18 },
  { soeg: ["ravioli på dåse"], pris: 18 },
  { soeg: ["gulerødder", "gulerodder"], pris: 11 },
  { soeg: ["løg", "log"], pris: 3 },
  { soeg: ["rødløg", "rodlog"], pris: 15 },
  { soeg: ["hvidløg", "hvidlog"], pris: 8 },
  { soeg: ["hvidkål", "hvidkal"], pris: 18 },
  { soeg: ["spidskål", "spidskal"], pris: 18 },
  { soeg: ["broccoli"], pris: 15 },
  { soeg: ["blomkål", "blomkal"], pris: 22 },
  { soeg: ["agurk"], pris: 11 },
  { soeg: ["tomater på stilk", "cocktailtomater", "tomater"], pris: 22 },
  { soeg: ["peberfrugt", "snackpebre", "pebre"], pris: 27 },
  { soeg: ["salat", "iceberg"], pris: 18 },
  { soeg: ["æbler", "aebler"], pris: 20 },
  { soeg: ["bananer"], pris: 16 },
  { soeg: ["appelsiner"], pris: 20 },
  { soeg: ["frosne ærter", "frosne aerter"], pris: 14 },
  { soeg: ["frossen broccoli"], pris: 15 },
  { soeg: ["grøntsagsmix", "grontsagsmix"], pris: 18 },
  { soeg: ["frossen spinat", "spinat"], pris: 14 },
  { soeg: ["pommes", "frosne kartofler"], pris: 18 },
  { soeg: ["frosne bær", "frosne baer"], pris: 26 },
  { soeg: ["rapsolie", "raps"], pris: 24 },
  { soeg: ["olivenolie", "olive"], pris: 47 },
  { soeg: ["mayonnaise"], pris: 18 },
  { soeg: ["ketchup"], pris: 17 },
  { soeg: ["sennep"], pris: 13 },
  { soeg: ["remoulade"], pris: 16 },
  { soeg: ["peanutbutter", "peanut"], pris: 26 },
  { soeg: ["marmelade"], pris: 16 },
  { soeg: ["piskefløde", "piskeflode", "fløde", "flode"], pris: 20 },
  { soeg: ["squash"], pris: 8 },
  { soeg: ["aubergine"], pris: 10 },
];

function slagBasispris(varenavn: string): number | null {
  const navn = varenavn.toLowerCase();
  for (const entry of BASISPRISER) {
    if (entry.soeg.some(s => navn.includes(s))) return entry.pris;
  }
  return null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Basispriser — fast prisniveau for alle ingredienser (ingen tilbudsavis)
const BASISVARER_TEKST = `
BASISVARER (estimerede priser):

BRØD & MORGENMAD:
- Havregryn 1kg: ca. 10 kr
- Rugbrød 500-1000g: ca. 12 kr
- Toastbrød 500-600g: ca. 12 kr
- Grovboller 6 stk: ca. 18 kr
- Knækbrød 200-250g: ca. 13 kr
- Cornflakes 500g: ca. 18 kr
- Mysli 750g: ca. 24 kr

MEL & BAGNING:
- Hvedemel 1kg: ca. 13 kr
- Rugmel 1kg: ca. 14 kr
- Sukker 1kg: ca. 13 kr
- Rasp 500g: ca. 13 kr

PASTA, RIS & KORN:
- Pasta spaghetti 500g: ca. 10 kr
- Pasta penne/skruer 500g: ca. 12 kr
- Fuldkornspasta 500g: ca. 14 kr
- Ris parboiled 1kg: ca. 17 kr
- Jasminris 1kg: ca. 27 kr
- Basmatiris 1kg: ca. 31 kr
- Couscous 500g: ca. 15 kr
- Bulgur 500g: ca. 18 kr
- Nudler 500g: ca. 17 kr
- Lasagneplader 500g: ca. 18 kr

KARTOFLER & BRØD:
- Kartofler 1kg: ca. 12 kr
- Søde kartofler 1kg: ca. 27 kr
- Tortillawraps 6-8 stk: ca. 17 kr
- Pitabrød 4-6 stk: ca. 15 kr

MEJERI:
- Mælk/letmælk 1L: ca. 12 kr
- Yoghurt naturel 1L: ca. 17 kr
- A38/skyr 1kg: ca. 26 kr
- Yoghurt med smag 1L: ca. 17 kr
- Creme fraiche 250g: ca. 12 kr
- Hytteost 400g: ca. 23 kr
- Smørbart blandingsprodukt 200g: ca. 18 kr
- Smør 200g: ca. 27 kr
- Revet ost 150-200g: ca. 21 kr
- Ost i blok/skiver 400-500g: ca. 50 kr
- Æg 10 stk: ca. 28 kr

KØDPÅLÆG & PÅLÆG:
- Bacontern 150-200g: ca. 18 kr
- Skinke i strimler 150-200g: ca. 18 kr
- Pølser 300-500g: ca. 26 kr
- Leverpostej 200-500g: ca. 14 kr

FISK PÅ DÅSE:
- Tun i dåse 1 dåse: ca. 12 kr
- Makrel i tomat 125g: ca. 13 kr
- Sardiner 100-125g: ca. 15 kr
- Fiskefrikadeller 300-500g: ca. 30 kr
- Torskerogn 200g: ca. 17 kr

DÅSEVARER & KOLONIAL:
- Hakkede tomater 400g: ca. 8 kr
- Flåede tomater 400g: ca. 8 kr
- Passata 500g: ca. 14 kr
- Tomatpuré 140g: ca. 7 kr
- Kidneybønner 400g: ca. 9 kr
- Sorte bønner 400g: ca. 11 kr
- Kikærter 400g: ca. 9 kr
- Linser tørrede 500g: ca. 18 kr
- Røde linser 500g: ca. 21 kr
- Baked beans 400g: ca. 11 kr
- Majs på dåse 300-340g: ca. 9 kr
- Ærter/gulerødder dåse 400g: ca. 11 kr
- Champignon på glas/dåse 200-300g: ca. 11 kr
- Kokosmælk 400ml: ca. 14 kr
- Bouillonterninger 10-12 stk: ca. 13 kr (ca. 1,30 kr/stk)
- Pasta sauce 500g: ca. 15 kr
- Karrysauce på glas 400-500g: ca. 18 kr
- Ravioli/pasta på dåse 400-800g: ca. 18 kr

FRISKE GRØNTSAGER:
- Gulerødder 1kg: ca. 11 kr
- Løg 1kg: ca. 14 kr
- Rødløg 500g-1kg: ca. 15 kr
- Hvidløg 1-3 stk: ca. 8 kr
- Hvidkål 1 stk: ca. 18 kr
- Spidskål 1 stk: ca. 18 kr
- Broccoli 1 stk: ca. 15 kr
- Blomkål 1 stk: ca. 22 kr
- Agurk 1 stk: ca. 11 kr
- Tomater 500g: ca. 22 kr
- Peberfrugt 3 stk: ca. 27 kr
- Salatmix 1 pose: ca. 18 kr
- Champignon frisk 250g: ca. 14 kr

FRUGT:
- Æbler 1kg: ca. 20 kr
- Bananer 1kg: ca. 16 kr
- Appelsiner 1kg: ca. 20 kr

FROST:
- Frosne ærter 400-600g: ca. 14 kr
- Frossen broccoli 400-600g: ca. 15 kr
- Frossen grøntsagsmix 500-1000g: ca. 18 kr
- Frossen spinat 400-600g: ca. 14 kr
- Pommes/frosne kartofler 750g-1kg: ca. 18 kr
- Frosne bær 300-500g: ca. 26 kr

OLIE, KRYDDERIER & TILBEHØR:
- Rapsolie 1L: ca. 24 kr
- Olivenolie 500ml: ca. 47 kr
- Mayonnaise 400g: ca. 18 kr
- Ketchup 500-1000g: ca. 17 kr
- Sennep 400g: ca. 13 kr
- Remoulade 400g: ca. 16 kr
- Peanutbutter 350g: ca. 26 kr
- Marmelade 400g: ca. 16 kr
- Salt, peber, krydderier: estimeret
`;

const SYSTEM_PROMPT = `Du er en madplanlægger der laver ugeplaner ud fra en fast opskriftsbog og basispriser.

== DIN OPGAVE ==
Du får en liste med OPSKRIFTER og en liste med BASISPRISER. Du skal:
1. For hver opskrift: brug basispriserne til at beregne pris pr. portion
2. Beregn pris pr. portion baseret på pakkepris (ikke gram-pris)
3. Fordel de valgte opskrifter på 7 dages aftensmad
4. Brug rester fra aftensmad som frokost næste dag
5. Tilføj en billig, gentagelig morgenmad

== PRISBEREGNING ==
- Brug ALTID pakkepris fra basisprislisten — aldrig gram-beregning
- pris_pr_portion = sum(pakkepris for alle ikke-estimerede ingredienser) / portioner
- Estimerede basisvarer (salt, olie, krydderier med estimereretPris: 0) tæller ikke med
- Sæt paa_tilbud: false for alle varer (ingen tilbudsavis)
- Sæt butik: null for alle ingredienser

== ØVRIGE REGLER ==
- Du SKAL generere ALLE 7 dage: Mandag, Tirsdag, Onsdag, Torsdag, Fredag, Lørdag, Søndag
- Hver dag har morgenmad, frokost og aftensmad — ingen dage må mangle
- Gennemse dit svar inden du returnerer: tæl dagene, der skal være præcis 7
- Genrug de valgte opskrifter på tværs af dagene — der er færre opskrifter end dage
- Rester fra aftensmad -> næste dags frokost (pris_pr_portion: 0, ingen ingredienser)
- Morgenmad: simpel og billig (havregryn, æg, rugbrød) - må gentages
- Respektér kostpræferencer - udeluk opskrifter der ikke passer
- Hold dig under budgettet
- Brug KUN opskrifter fra den udleverede opskriftsbog til aftensmad

== OUTPUT ==
Returnér KUN gyldig JSON. Ingen markdown, ingen prosa.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

    const body = await req.json();
    const {
      action,
      budget = 350,
      personer = 1,
      kost = ["Alt"],
      opskriftIds = [] as string[],
    } = body;

    if (action !== "generate_meal_plan") {
      return json({ error: "Ukendt action" }, 400);
    }

    const ugeNr = getWeekNumber();

    // Brug kun basispriser — ingen PDF-tilbudsavis
    const tilbudTekst = BASISVARER_TEKST;

    // --- 3. Filtrer opskrifter efter kødpræference og byg prompt ---
    const valgteKoed = kost.filter((k: string) => ["Kylling", "Oksekød", "Svinekød"].includes(k));
    const brugerVilHaveAlt = kost.includes("Alt") || valgteKoed.length === 0;

    const filtreretOpskrifter = OPSKRIFTER.filter(o => {
      if (opskriftIds.length > 0) return opskriftIds.includes(o.id);
      return brugerVilHaveAlt || valgteKoed.includes(o.koed) || o.koed === "Alt";
    });

    const opskrifterTekst = filtreretOpskrifter.map(o => {
      const ing = o.ingredienser.map(i =>
        i.estimeret
          ? `  - ${i.navn} ${i.maengde} [estimeret ~${(i as any).estimereretPris ?? 2} kr]`
          : `  - ${i.navn} ${i.maengde}${(i as any).vaelgBilligstPerKg ? " [VÆLG BILLIGST KR/KG]" : ""} (søg: ${(i as any).soeg?.join(", ")})`
      ).join("\n");
      return `${o.navn} (${o.portioner} portioner) [id: ${o.id}]\n${ing}`;
    }).join("\n\n");

    // --- 4. Generer madplan ---
    const userMessage = `BRUGER:
- budget_pr_uge: ${budget} kr
- antal_personer: ${personer}
- kost: ${buildKostInstruktion(kost)}
- uge: ${ugeNr}
${opskriftIds.length > 0 ? `- VALGTE RETTER: Brugeren har selv valgt præcis disse ${filtreretOpskrifter.length} retter. Brug KUN dem — ingen andre.\n` : ''}
OPSKRIFTSBOG (brug KUN disse til aftensmad):
${opskrifterTekst}

BASISPRISER (brug disse til alle ingredienser):
${tilbudTekst}

Lav en madplan for 7 dage. Beregn pris pr. portion ud fra basispriser (pakkepris / portioner).
Alle varer er estimerede basisvarer — sæt paa_tilbud: false og butik: null for alle.

Returnér JSON i præcis dette format:
{
  "uge": ${ugeNr},
  "antal_personer": ${personer},
  "proteinkilder": ["Hakket grisekød", "Medister"],
  "dage": [
    {
      "dag": "Mandag",
      "morgenmad": {
        "navn": "Havregrød",
        "pris_pr_portion": 3,
        "portioner": 1,
        "fremgangsmaade": ["Kog havregryn i vand 5 min", "Server med mælk"],
        "ingredienser": [
          { "vare": "Havregryn", "butik": null, "brugt": "80 g", "pakkestoerrelse": "1000 g", "pakkepris": 15, "antaget_pakke": true, "paa_tilbud": false, "estimeret": true }
        ]
      },
      "frokost": {
        "navn": "Rester: Pasta kødsovs",
        "rester_fra": "Mandag aftensmad",
        "pris_pr_portion": 0,
        "portioner": 1,
        "fremgangsmaade": ["Varm resterne op i mikroovn 2 min"],
        "ingredienser": []
      },
      "aftensmad": {
        "navn": "Pasta kødsovs",
        "pris_pr_portion": 12.5,
        "portioner": 4,
        "ekstra_portioner_til_rester": 1,
        "fremgangsmaade": ["Brun hakket kød", "Tilsæt tomater og simr 15 min", "Kog pasta og bland"],
        "ingredienser": [
          { "vare": "Hakket dansk grisekød 500g", "butik": "Rema 1000", "brugt": "500 g", "pakkestoerrelse": "500 g", "pakkepris": 20, "antaget_pakke": false, "paa_tilbud": true, "normalpris": 30, "estimeret": false },
          { "vare": "Pastaskruer 500g", "butik": "Rema 1000", "brugt": "500 g", "pakkestoerrelse": "500 g", "pakkepris": 5.95, "antaget_pakke": false, "paa_tilbud": true, "estimeret": false },
          { "vare": "Dåsetomater", "butik": null, "brugt": "400 g", "pakkestoerrelse": "400 g", "pakkepris": 6, "antaget_pakke": true, "paa_tilbud": false, "estimeret": true }
        ]
      }
    }
  ],
  "indkoebsliste": [
    {
      "butik": "Rema 1000",
      "subtotal": 120,
      "varer": [
        { "vare": "Hakket dansk grisekød 500g", "antal_pakker": 2, "pakkestoerrelse": "500 g", "pris": 40, "paa_tilbud": true }
      ]
    }
  ],
  "restlager": [
    { "vare": "Pasta", "koebt": "500 g", "brugt_i_ugen": "500 g", "rest": "0 g", "status": "gemt_til_naeste_gang", "vaerdi": 0 }
  ],
  "indkoebspris": 198,
  "besparelse": 45,
  "spild_kr": 0,
  "gemt_vaerdi": 12,
  "advarsler": []
}`;

    const madplanSvar = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_tokens: 16000,
      response_format: { type: "json_object" },
    });

    const madplanJson = JSON.parse(madplanSvar.choices[0].message.content ?? "{}");

    // Gem de valgte opskrifter deterministisk i planen — uafhængigt af hvad AI returnerer
    madplanJson.valgte_opskrifter = filtreretOpskrifter.map(o => ({
      id: o.id,
      navn: o.navn,
      portioner: o.portioner,
    }));

    // --- 5. Beregn totaler og besparelse deterministisk ---
    let beregnetTotal = 0;
    let beregnetBesparelse = 0;

    for (const butik of madplanJson.indkoebsliste ?? []) {
      let butikSubtotal = 0;
      for (const vare of butik.varer ?? []) {
        const tilbudspris = vare.pris ?? 0;
        butikSubtotal += tilbudspris;

        if (vare.paa_tilbud) {
          const basispris = slagBasispris(vare.vare);
          if (basispris !== null && basispris > tilbudspris) {
            const spart = (basispris - tilbudspris) * (vare.antal_pakker ?? 1);
            vare.normalpris = basispris;
            vare.spart = Math.round(spart * 100) / 100;
            beregnetBesparelse += spart;
          }
        }
      }
      butik.subtotal = Math.round(butikSubtotal * 100) / 100;
      beregnetTotal += butikSubtotal;
    }

    madplanJson.indkoebspris = Math.round(beregnetTotal);
    madplanJson.total = madplanJson.indkoebspris;
    madplanJson.besparelse = Math.round(beregnetBesparelse);
    madplanJson.spild_kr = Math.round(madplanJson.spild_kr ?? 0);
    madplanJson.gemt_vaerdi = Math.round(madplanJson.gemt_vaerdi ?? 0);

    // Gemmes IKKE her. Appen ejer alle gemte planer og upserter selv den
    // deterministiske version (kategori-inddelt indkøbsliste) på den VALGTE
    // uge efter svaret. Edge-funktionens eget gem skrev altid til indeværende
    // uge og overskrev appens liste, når man planlagde en fremtidig uge.
    return json(madplanJson);
  } catch (e: any) {
    console.error(e);
    return json({ error: e.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((((now.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
}

function filtrerTilbudTilButikker(tilbudTekst: string, stores: string[]): string {
  // Del teksten op i sektioner per butik (starter med "=== BUTIKSNAVN ===")
  const sektioner = tilbudTekst.split(/(?====)/);
  const valgte = sektioner.filter(sektion => {
    // Behold altid basisvarer (ingen butiksoverskrift)
    if (!sektion.trim().startsWith("===")) return true;
    // Tjek om butiksnavn matcher en af de valgte butikker
    return stores.some(store =>
      sektion.toUpperCase().includes(store.toUpperCase())
    );
  });
  return valgte.join("").trim();
}

function buildKostInstruktion(kost: string[]): string {
  const linjer: string[] = [];

  if (kost.includes("Veganer")) {
    linjer.push("VEGANER: ingen kød, fisk, æg, mejeri eller animalske produkter overhovedet");
  } else if (kost.includes("Vegetar")) {
    linjer.push("VEGETAR: ingen kød eller fisk i nogen ret");
  } else if (kost.includes("Pescetarer")) {
    linjer.push("PESCETARER: ingen kød, men fisk og skaldyr er tilladt");
  } else {
    const KOED = ["Kylling", "Oksekød", "Svinekød", "Fisk", "Lam"];
    const foretrukne = kost.filter(k => KOED.includes(k));
    const undgaa = KOED.filter(k => !foretrukne.includes(k));
    if (foretrukne.length > 0) {
      linjer.push(`Foretrækker ${foretrukne.join(", ")}. Prioritér disse opskrifter.`);
    }
    if (undgaa.length > 0 && foretrukne.length > 0) {
      linjer.push(`Undgå ${undgaa.join(", ")} medmindre intet andet passer.`);
    }
  }

  if (kost.includes("Halal")) linjer.push("HALAL: kun halal-certificerede kødprodukter");
  if (kost.includes("Glutenfri")) linjer.push("GLUTENFRI: ingen hvede, rug eller byg");
  if (kost.includes("Laktosefri")) linjer.push("LAKTOSEFRI: ingen mælk, ost, fløde eller smør");
  if (kost.includes("Høj protein")) linjer.push("HØJ PROTEIN: prioritér proteinrige opskrifter");

  return linjer.length > 0 ? linjer.join(" | ") : "ingen kostbegrænsninger";
}
