import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "https://deno.land/x/openai@v4.52.7/mod.ts";
import { OPSKRIFTER } from "./opskrifter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Testdata — bruges når ingen PDF er uploadet.
const TEST_TILBUD = `
=== REMA 1000 (aktuelle tilbud) ===

KYLLING:
- Dansk kylling 250-800g: 29 kr (max 116 kr/kg)
- Kyllingebrystfilet eller -lår med BBQ, lårfilet eller hele lår 325-825g: 32,95 kr (max 101,38 kr/kg)
- Dansk kyllingebrystfilet 280g: 27,95 kr (99,82 kr/kg)
- Kyllingespyd, kyllingewings eller nuggets 240-750g: 29 kr (max 120,83 kr/kg)

OKSEKØD & KALV:
- Herregårdsbøffer 360g: 39 kr (108,33 kr/kg)
- Hakket dansk oksekød med 35% grønt 400g: 29,95 kr (74,88 kr/kg)
- Hakket oksekød 4-7% 350g: 44,95 kr (128,43 kr/kg)
- Hakket dansk oksekød 15-18% 400g: 37,95 kr (94,88 kr/kg)

GRIS:
- Ovnklar flæskesteg pr. ½ kg: 19,95 kr (39,90 kr/kg)
- Hakket grise- og kalvekød, stegeflæsk eller koteletter 400-500g: 29,95 kr (max 74,88 kr/kg)
- Hakket dansk grisekød 8-12% eller medister 500g: 24,95 kr (49,90 kr/kg)
- Hakket dansk grisekød 8-12%, koteletter eller medister 400-500g: 20 kr (max 50 kr/kg)
- Bacon i skiver eller brunchpølser 300-350g: 22 kr (max 73,33 kr/kg)
- Frilandsgris pulled pork 800-1100g: 69 kr (max 86,25 kr/kg)
- Leverpostej eller krydderpaté 200-250g: 12 kr (max 60 kr/kg)

FISK & SKALDYR:
- Laksefileter 225g: 40 kr (177,78 kr/kg)
- Laksefilet 600g: 99 kr (165 kr/kg)
- Rødspættefileter 300g: 25 kr (83,33 kr/kg)
- Indbagt laks 500g: 39 kr (78 kr/kg)
- Fiskefars 400g: 30 kr (75 kr/kg)
- Grønlandske rejer eller Fish & Crisp 200-480g: 25 kr (max 125 kr/kg)
- Bornholms fiskekonserves 120-260g: 14 kr (max 116,67 kr/kg)

FÆRDIGRETTER:
- Frikadeller, gyros eller karbonader 300-480g: 25 kr (max 83,33 kr/kg)
- Jensens spareribs 1200g: 79 kr (65,83 kr/kg)

MEJERI & ÆG:
- Yoghurt 1000g: 11,95 kr
- Hytteost 1,5% 250g: 12 kr (48 kr/kg)
- Mozzarella 150-200g: 10 kr (max 66,67 kr/kg)
- Creme fraiche 18% eller madlavningsfløde 8% 250ml/g: 10 kr
- Letmælk eller sødmælk 1L: 14 kr
- Piskefløde økologisk ½L: 20 kr
- Cremefine 250ml: 9 kr
- Økologiske æg M/L 10 stk: 30 kr (3 kr/stk)

FRUGT & GRØNT:
- Kartofler 500g: 12 kr (24 kr/kg)
- Tomater på stilk 500g: 10 kr (20 kr/kg)
- Squash økologisk stk: 6 kr
- Spinat økologisk 75g: 8 kr
- Røde stenfri druer 500g: 15 kr (30 kr/kg)
- Vandmelon stk: 20 kr
- Donutferskner 450g: 12 kr

PASTA, BRØD & KOLONIAL:
- Pastaskruer 500g: 5,95 kr (11,90 kr/kg)
- Spaghetti 1kg: 8,95 kr (8,95 kr/kg)
- Schulstad brød 470-1080g: 15 kr

BASISVARER (estimerede priser, ikke tilbud):
- Havregryn 1kg: ca. 15 kr
- Ris 1kg: ca. 15 kr
- Rugbrød 1kg: ca. 22 kr
- Rapsolie 1L: ca. 20 kr
- Løg 1 stk: ca. 2 kr
- Dåsetomater hakkede 400g: ca. 6 kr
- Bouillonterning: ca. 2 kr
- Salt, peber, krydderier: estimeret

=== NETTO (aktuelle tilbud) ===

KYLLING:
- Kyllingemarked 280-600g: 39 kr (max 139,29 kr/kg)
- Hakket kylling 7-10% 400g: 25 kr (62,50 kr/kg)
- Kyllingefilet, -inderfilet eller -lårfilet 900-1000g: 69 kr (max 76,67 kr/kg)
- Kyllingemarked 300-750g: 25 kr (max 83,33 kr/kg)

OKSEKØD & KALV:
- Hakket oksekød 8-12% 400g: 39,95 kr (99,88 kr/kg)
- Hakket okse- og grisekød 8-12% 650g: 49 kr (75,38 kr/kg)

GRIS:
- Mørbrad af dansk gris 1650-2300g: 99 kr (max 60 kr/kg)
- Ribbenssteg uden ben pr. ½ kg: 24,95 kr (49,90 kr/kg)
- Hakket grisekød 8-12% 500g: 24,95 kr (49,90 kr/kg)
- Dansk flæsk i skiver 300g: 20 kr (66,67 kr/kg)
- Pølsemesteren pølser 400-500g: 25 kr (max 62,50 kr/kg)
- Tulip BBQ pulled pork eller spareribs 500g: 37 kr (74 kr/kg)

FISK & SKALDYR:
- Fiskefileter 400g: 35 kr (87,50 kr/kg)

MEJERI & ÆG:
- Yoghurt 1L: 12 kr
- Skrabeæg 6 stk: 15 kr (2,50 kr/stk)
- Græsk yoghurt 400g: 16 kr (40 kr/kg)
- Lurpak smør eller smørbar 200g: 15 kr (75 kr/kg)

FRUGT & GRØNT:
- Nye kartofler 1kg: 15 kr (15 kr/kg)
- Aubergine stk: 5 kr
- Cocktailtomater 500g: 18 kr (36 kr/kg)
- Røde snackpebre 500g: 15 kr (30 kr/kg)
- Dansk icebergsalat stk: 10 kr
- Majskolbe stk: 8 kr

PASTA, BRØD & KOLONIAL:
- Fuldkornspasta 500g: 9 kr (18 kr/kg)
- Rugbrød 600g: 15 kr (25 kr/kg)
- Brød 470-750g: 15 kr (max 31,91 kr/kg)
- Jasmin ris 1kg: 20 kr (20 kr/kg)
`;

const SYSTEM_PROMPT = `Du er en madplanlægger der laver ugeplaner ud fra en fast opskriftsbog og aktuelle tilbud.

== DIN OPGAVE ==
Du får en liste med OPSKRIFTER og en liste med TILBUD. Du skal:
1. For hver opskrift: find de billigste matchende tilbudsvarer til ingredienserne
2. Beregn den præcise pris pr. portion baseret på pakkepris (ikke gram-pris)
3. Vælg de bedste opskrifter til 7 dages aftensmad inden for budget og kostpræferencer
4. Brug rester fra aftensmad som frokost næste dag
5. Tilføj en billig, gentagelig morgenmad

== PRISBEREGNING (vigtigst) ==
- Brug ALTID pakkepris — aldrig gram-beregning
- Ingrediens "500 g hakket kød" → find billigste matchende tilbudsvare per kg, noter pakkeprisen
- Hvis "vaelgBilligstPerKg: true": sammenlign kr/kg på tværs af matchende varer, vælg billigst
- pris_pr_portion = sum(pakkepris for alle ikke-estimerede ingredienser) / portioner
- Estimerede basisvarer (salt, olie, krydderier) tæller ikke med i prisen

== MATCHING ==
- Brug søgeordene i opskriften til at finde den bedste tilbudsvare
- Vær fleksibel: "hakket kød" matcher "hakket grisekød", "hakket grise- og kalvekød" osv.
- Kan en ingrediens ikke matches mod tilbud, brug en estimeret standardpris

== BUTIKKER — ABSOLUT REGEL ==
Brugeren handler KUN i disse butikker: se "butikker" i bruger-beskeden.
- Brug ALDRIG varer fra andre butikker — uanset om de er billigere.
- Hvis en ingrediens ikke findes i de valgte butikkers tilbud, brug en estimeret basisvare (estimeret: true).
- Sæt butik-feltet til null for estimerede varer — aldrig en butik brugeren ikke har valgt.

== ØVRIGE REGLER ==
- 7 dage: Mandag-Søndag med morgenmad, frokost og aftensmad
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
      tilbudsaviser = [],
      budget = 350,
      personer = 1,
      kost = ["Alt"],
      stores = ["Rema 1000"],
    } = body;

    if (action !== "generate_meal_plan") {
      return json({ error: "Ukendt action" }, 400);
    }

    const ugeNr = getWeekNumber();

    // --- 1. Download PDFer fra storage og upload til OpenAI Files API ---
    const openaiFileIds: string[] = [];

    for (const filnavn of tilbudsaviser.slice(0, 5)) {
      try {
        const { data: blob, error } = await supabase.storage
          .from("tilbudsaviser")
          .download(filnavn);
        if (error || !blob) continue;

        const formData = new FormData();
        formData.append("purpose", "assistants");
        formData.append("file", new File([blob], filnavn, { type: "application/pdf" }));

        const uploadRes = await fetch("https://api.openai.com/v1/files", {
          method: "POST",
          headers: { Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}` },
          body: formData,
        });

        if (!uploadRes.ok) continue;
        const uploadData = await uploadRes.json();
        if (uploadData.id) openaiFileIds.push(uploadData.id);
      } catch (_) {}
    }

    // --- 2. Udtræk tilbud fra PDFer ---
    let tilbudTekst = TEST_TILBUD;

    if (openaiFileIds.length > 0) {
      try {
        const udtrækSvar = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyser disse tilbudsaviser og returner ALLE madvarer på tilbud fra disse butikker: ${stores.join(", ")}.
Returnér som struktureret tekst (IKKE JSON) i dette format:
=== BUTIKSNAVN ===
KATEGORI:
- Varenavn, pakkestørrelse -> pris kr (kr/kg hvis relevant) [normalpris X kr]

Regler:
- Kun faktiske priser fra avisen
- Inkludér pakkestørrelse og beregn kr/kg for kød og fisk
- Kun madvarer`,
                },
                ...openaiFileIds.map((fileId) => ({
                  type: "file" as const,
                  file: { file_id: fileId },
                })),
              ],
            },
          ],
          max_tokens: 4000,
        } as any);

        tilbudTekst = udtrækSvar.choices[0].message.content ?? TEST_TILBUD;
      } catch (e: any) {
        console.error("PDF-udtræk fejlede:", e.message);
      }

      for (const fileId of openaiFileIds) {
        await fetch(`https://api.openai.com/v1/files/${fileId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}` },
        }).catch(() => {});
      }
    }

    // --- 3. Filtrer opskrifter efter kødpræference og byg prompt ---
    const valgteKoed = kost.filter((k: string) => ["Kylling", "Oksekød", "Svinekød"].includes(k));
    const brugerVilHaveAlt = kost.includes("Alt") || valgteKoed.length === 0;

    const filtreretOpskrifter = OPSKRIFTER.filter(o =>
      brugerVilHaveAlt || valgteKoed.includes(o.koed) || o.koed === "Alt"
    );

    const opskrifterTekst = filtreretOpskrifter.map(o => {
      const ing = o.ingredienser.map(i =>
        i.estimeret
          ? `  - ${i.navn} ${i.maengde} [estimeret ~${(i as any).estimereretPris ?? 2} kr]`
          : `  - ${i.navn} ${i.maengde}${(i as any).vaelgBilligstPerKg ? " [VÆLG BILLIGST KR/KG]" : ""} (søg: ${(i as any).soeg?.join(", ")})`
      ).join("\n");
      return `${o.navn} (${o.portioner} portioner) [id: ${o.id}]\n${ing}`;
    }).join("\n\n");

    // --- 4. Filtrer tilbudstekst til kun valgte butikker ---
    const filtreretTilbudTekst = filtrerTilbudTilButikker(tilbudTekst, stores);

    // --- 5. Generer madplan ---
    const userMessage = `BRUGER:
- budget_pr_uge: ${budget} kr
- antal_personer: ${personer}
- kost: ${buildKostInstruktion(kost)}
- butikker: ${JSON.stringify(stores)}
- uge: ${ugeNr}

OPSKRIFTSBOG (brug KUN disse til aftensmad):
${opskrifterTekst}

TILBUD FRA TILBUDSAVISER (KUN fra dine valgte butikker):
${filtreretTilbudTekst}

Lav en madplan for 7 dage. For hver aftensmad: match ingredienserne mod tilbuddene,
beregn pris pr. portion korrekt (pakkepris / portioner), og vælg den billigste opskrift
der passer til kostpræferencerne.

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

    // --- 5. Beregn totaler deterministisk fra indkoebsliste ---
    let beregnetTotal = 0;
    let beregnetBesparelse = 0;

    for (const butik of madplanJson.indkoebsliste ?? []) {
      let butikSubtotal = 0;
      for (const vare of butik.varer ?? []) {
        butikSubtotal += vare.pris ?? 0;
        if (vare.paa_tilbud && vare.normalpris) {
          beregnetBesparelse += (vare.normalpris - vare.pris);
        }
      }
      // Sæt subtotal deterministisk så indkøbsliste og forside altid stemmer overens
      butik.subtotal = Math.round(butikSubtotal * 100) / 100;
      beregnetTotal += butikSubtotal;
    }

    madplanJson.indkoebspris = Math.round(beregnetTotal);
    madplanJson.total = madplanJson.indkoebspris;
    madplanJson.besparelse = beregnetBesparelse > 0 ? Math.round(beregnetBesparelse) : (madplanJson.besparelse ?? 0);
    madplanJson.spild_kr = Math.round(madplanJson.spild_kr ?? 0);
    madplanJson.gemt_vaerdi = Math.round(madplanJson.gemt_vaerdi ?? 0);

    // --- 6. Gem i databasen ---
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const userSupabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user } } = await userSupabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
        await supabase.from("madplaner").upsert({
          user_id: user.id,
          uge_nr: ugeNr,
          plan: madplanJson,
          total_pris: madplanJson.indkoebspris,
          total_spar: madplanJson.besparelse,
        }, { onConflict: "user_id,uge_nr" });
      }
    }

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
