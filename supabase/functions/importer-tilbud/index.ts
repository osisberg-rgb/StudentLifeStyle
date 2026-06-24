// Udtræk tilbud fra ÉN side af en dansk tilbudsavis (billede). Ren scanner:
// gemmer INTET — returnerer {varer:[{navn,pris,soeg}], forventet_antal}. forventet_antal
// er modellens egen optælling, så cloud-scriptet kan opdage under-tælling. Det lokale opdater-script
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
type RaaVare = { navn: string; pris: number; tilbudstype?: string; betingelse?: string };

// Udled op til 3 soeg-ord fra varenavnet (mest specifikke ord først). soeg
// kommer IKKE fra modellen længere — det stjæler fokus fra at finde ALLE varer.
function udledSoeg(navn: string): string[] {
  return SOEG_VOCAB
    .filter((vok) => matcherSoegeord(navn, vok))
    .sort((a, b) => b.length - a.length)
    .slice(0, 3);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { billede } = await req.json();
    if (!billede || typeof billede !== "string" || !billede.startsWith("data:")) {
      return svar({ error: "Mangler 'billede' (data-URL)" }, 400);
    }

    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });

    const prompt =
      "Du er ekspert i at læse danske supermarkeds-tilbudsaviser. Du får ÉT " +
      "billede af én side. Sider kan være MEGET tætpakkede med 20-40 små " +
      "vare-fliser — din vigtigste opgave er at finde ALLE, ikke kun de tydelige.\n\n" +
      "ARBEJDSGANG (følg den præcist):\n" +
      "1. Scan systematisk: øverste række venstre→højre, derefter næste række, osv. " +
      "Husk små fliser, kant-bånd, hjørne-bokse og fod-striben. Spring INTET over.\n" +
      "2. Tæl FØRST hvor mange separate pris-mærker du kan se på siden.\n" +
      "3. Udtræk så ét objekt pr. tilbud, til antallet matcher din optælling.\n\n" +
      "FOR HVERT TILBUD:\n" +
      "- navn: produktnavnet som det står (inkl. mærke hvis synligt).\n" +
      "- pris: den pris du FAKTISK betaler i kassen for den annoncerede vare, som " +
      "tal (fx 18 eller 12.95). Følg reglerne i rækkefølge:\n" +
      "  • En MÆNGDE-/pakkeangivelse — \"8 stk\", \"6-pak\", \"500 g\", \"4 ruller\", " +
      "\"1 kg\", \"2 l\" — beskriver INDHOLDET i ÉN pakke. pris = den viste pris for " +
      "pakken. DIVIDÉR ALDRIG med antallet/vægten (8 stk Sun Lolly til 16 kr → pris = 16, " +
      "IKKE 2).\n" +
      "  • Ægte multibuy, hvor man skal købe FLERE SEPARATE pakker for at få prisen " +
      "(\"3 for 20\", \"2 for 25\"): pris = pris pr. stk = total ÷ antal (20/3 = 6.67), " +
      "afrundet til 2 decimaler.\n" +
      "  • Ved \"spar/%\": pris = den faktiske tilbudspris hvis den vises, ellers null.\n" +
      "- tilbudstype: \"stk\" | \"multipak\" | \"multibuy\" | \"rabat\". Brug \"multipak\" " +
      "når antallet er indholdet i én pakke (8 stk i én pose), og kun \"multibuy\" når " +
      "man skal købe flere separate pakker.\n" +
      "- betingelse: betingelsesteksten ordret hvis relevant (\"3 for 20\", \"spar 30%\", " +
      "\"min. 2 stk\"), ellers \"\".\n\n" +
      "MEDTAG: alle madvarer + drikkevarer (kaffe, sodavand, øl, vin, is).\n" +
      "SPRING OVER: rene reklamer, opskrifter, konkurrencer, non-food (medmindre drikkevare).\n" +
      "Er du i tvivl om en flise er en vare → MEDTAG den hellere.\n\n" +
      "Returnér KUN JSON: " +
      "{\"forventet_antal\":0,\"varer\":[{\"navn\":\"...\",\"pris\":0,\"tilbudstype\":\"stk\",\"betingelse\":\"\"}]}";

    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            // detail:"high" → OpenAI tiler billedet (512px-fliser) så småtryk/priser læses
            { type: "image_url", image_url: { url: billede, detail: "high" } },
          ],
        },
      ],
    });

    const raw = res.choices[0]?.message?.content ?? "{}";
    let parsed: { varer?: RaaVare[]; forventet_antal?: number };
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    // Rens: kun gyldige priser; soeg-ord udledes fra navnet mod ordforrådet.
    const varer: Vare[] = (parsed.varer ?? [])
      .filter((v) => v && typeof v.navn === "string" && Number.isFinite(Number(v.pris)))
      .map((v) => ({
        navn: String(v.navn).trim(),
        pris: Number(v.pris),
        soeg: udledSoeg(String(v.navn)),
      }))
      .filter((v) => v.navn.length > 0 && v.pris > 0);

    // forventet_antal lader cloud-scriptet opdage under-tælling og køre siden igen.
    return svar({ varer, forventet_antal: Number(parsed.forventet_antal) || varer.length }, 200);
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
