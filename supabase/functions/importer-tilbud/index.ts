// Udtræk tilbud fra ÉN side af en dansk tilbudsavis (billede). Ren scanner:
// gemmer INTET — returnerer {varer:[{navn,pris,soeg}]}. Det lokale opdater-script
// (scripts/opdater-tilbud.mjs) kalder funktionen pr. side, samler resultaterne
// og upsert'er til `tilbud`-tabellen for (butik, uge). Genbruger samme GPT-mønster
// og soeg-ordforråd som importer-opskrift, så priserne kan matche appens motor.
//
// Test (én side):
//   curl -X POST "$SUPABASE_URL/functions/v1/importer-tilbud" \
//     -H "Authorization: Bearer $ANON_KEY" -H "Content-Type: application/json" \
//     -d '{"billede":"data:image/jpeg;base64,...."}'
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "https://deno.land/x/openai@v4.52.7/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Soeg-ord der HAR en basispris i appen (constants/basispriser.ts) — holdes i
// sync med importer-opskrift. LLM'en SKAL vælge soeg-ord herfra, ellers er varen
// usynlig for tilbuds-motoren.
const SOEG_VOCAB = [
  "havregryn", "rugbrød", "toastbrød", "hvedemel", "sukker", "rasp",
  "spaghetti", "fuldkornspasta", "pasta", "pastaskruer", "penne", "fusilli",
  "lasagneplader", "jasminris", "basmatiris", "parboiled", "ris", "couscous",
  "bulgur", "nudler", "søde kartofler", "kartofler", "tortilla", "pitabrød",
  "letmælk", "sødmælk", "mælk", "minimælk", "yoghurt naturel", "skyr", "a38",
  "yoghurt", "creme fraiche", "cremefine", "madlavningsfløde", "hytteost",
  "smørbar", "lurpak", "smør", "mozzarella", "revet ost", "ost", "æg",
  "skrabeæg", "hakket oksekød", "hakket grisekød", "hakket kylling",
  "kyllingebryst", "kyllingebrystfilet", "kyllingeinderfilet", "kyllingelår",
  "kyllingeoverlår", "kylling", "oksekød", "herregårdsbøffer", "bøffer",
  "svinekød", "grisekød", "koteletter", "medister", "bacon", "skinke",
  "pølser", "leverpostej", "fiskefrikadeller", "laks", "laksefilet",
  "rødspætte", "fiskefileter", "tun", "makrel", "hakkede tomater",
  "dåsetomater", "flåede tomater", "passata", "tomatpuré", "kidneybønner",
  "sorte bønner", "kikærter", "linser", "kokosmælk", "bouillon", "gulerødder",
  "løg", "hvidløg", "broccoli", "blomkål", "champignon", "peberfrugt",
  "spinat", "squash", "frosne ærter", "frossen", "grøntsagsmix", "rapsolie",
  "piskefløde", "fløde", "kaffe", "sodavand", "øl", "is",
];

// Samme ord-start-match som appens motor (≤3 tegn = helt ord).
function matcherSoegeord(tekst: string, soegeord: string): boolean {
  const norm = (s: string) =>
    " " + s.toLowerCase().replace(/[^a-z0-9æøåé]+/g, " ").trim() + " ";
  const t = norm(tekst);
  const k = norm(soegeord);
  if (k.trim().length <= 3) return t.includes(k);
  return t.includes(k.substring(0, k.length - 1));
}

type Vare = { navn: string; pris: number; soeg: string[] };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { billede } = await req.json();
    if (!billede || typeof billede !== "string" || !billede.startsWith("data:")) {
      return svar({ error: "Mangler 'billede' (data-URL)" }, 400);
    }

    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });
    const ordliste = SOEG_VOCAB.join(", ");

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Du får ÉT billede af én side fra en dansk supermarkeds-tilbudsavis. " +
                "Udtræk ALLE tilbud på siden. For hvert tilbud returnér: " +
                "`navn` (produktnavnet som det står), `pris` (tilbudsprisen i kr som tal, fx 18 eller 12.95), " +
                "og `soeg` (0-3 ord der beskriver varen, VALGT FRA ORDLISTEN nedenfor — udelad ord der ikke passer; tom liste hvis intet passer). " +
                "Medtag KUN varer med en tydelig pris. Spring reklamer, opskrifter, konkurrencer og ikke-madvarer over (undtagen kaffe/sodavand/øl/is som er i listen). " +
                "Returnér JSON på formen {\"varer\":[{\"navn\":\"...\",\"pris\":0,\"soeg\":[\"...\"]}]}.\n\n" +
                "ORDLISTE: " + ordliste,
            },
            { type: "image_url", image_url: { url: billede } },
          ],
        },
      ],
    });

    const raw = res.choices[0]?.message?.content ?? "{}";
    let parsed: { varer?: Vare[] };
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    // Rens: kun gyldige priser, og soeg-ord begrænses til ordforrådet.
    const varer: Vare[] = (parsed.varer ?? [])
      .filter((v) => v && typeof v.navn === "string" && Number.isFinite(Number(v.pris)))
      .map((v) => ({
        navn: String(v.navn).trim(),
        pris: Number(v.pris),
        soeg: (Array.isArray(v.soeg) ? v.soeg : [])
          .map((s) => String(s).toLowerCase().trim())
          .filter((s) => SOEG_VOCAB.some((vok) => matcherSoegeord(s, vok) || s === vok))
          .slice(0, 3),
      }))
      .filter((v) => v.navn.length > 0 && v.pris > 0);

    return svar({ varer }, 200);
  } catch (e) {
    return svar({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

function svar(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
