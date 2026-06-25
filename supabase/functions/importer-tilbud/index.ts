// Udtræk tilbud fra ÉN side af en dansk tilbudsavis (billede). Ren scanner:
// gemmer INTET — returnerer {varer:[{navn,pris,soeg}], forventet_antal}. forventet_antal
// er modellens egen optælling, så cloud-scriptet kan opdage under-tælling. Det lokale opdater-script
// (scripts/opdater-tilbud.mjs) kalder funktionen pr. side, samler resultaterne
// og upsert'er til `tilbud`-tabellen for (butik, uge). Genbruger samme mønster
// og soeg-ordforråd som importer-opskrift, så priserne kan matche appens motor.
//
// Test (én side):
//   curl -X POST "$SUPABASE_URL/functions/v1/importer-tilbud" \
//     -H "Authorization: Bearer $ANON_KEY" -H "Content-Type: application/json" \
//     -d '{"billede":"data:image/jpeg;base64,...."}'
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Claude-model til tilbuds-aflæsning. Haiku (claude-haiku-4-5) er valgt for at
// sænke omkostningen. Den er mindre præcis på tætte avissider, så prompten beder
// eksplicit om at finde ALLE varer og vælge soeg-ord fra ordforrådet — kør et par
// avis-sider igennem efter ændringer og vurder om kvaliteten holder.
const CLAUDE_MODEL = "claude-haiku-4-5";

// En data-URL (data:image/jpeg;base64,XXXX) → Anthropics billed-kilde-format.
function dataUrlTilKilde(dataUrl: string): { media_type: string; data: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
  if (!m) throw new Error("Ugyldigt billede (forventede en base64 data-URL)");
  return { media_type: m[1], data: m[2] };
}

// Træk teksten ud af et Anthropic-svar (content er en liste af blokke).
function udtrækTekst(resp: { content?: Array<{ type: string; text?: string }> }): string {
  return resp.content?.find((b) => b.type === "text")?.text ?? "";
}

// Defensiv JSON-parse: strip evt. ```json-hegn og fald tilbage på at klippe
// fra første { til sidste } (Claude har ikke OpenAIs json_object-tilstand).
function parseJson(tekst: string): { varer?: RaaVare[]; forventet_antal?: number } {
  let t = (tekst ?? "").trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  const start = t.indexOf("{");
  const slut = t.lastIndexOf("}");
  if (start >= 0 && slut > start) {
    try { return JSON.parse(t.slice(start, slut + 1)); } catch { /* opgiv */ }
  }
  return {};
}

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

type Vare = { navn: string; maengde: string; pris: number; soeg: string[] };
type RaaVare = { navn: string; maengde?: string; pris: number; soeg?: string[]; tilbudstype?: string; betingelse?: string };

// FALLBACK-udledning af soeg fra varenavnet (mest specifikke ord først). Bruges
// KUN når modellen ikke selv gav brugbare soeg-ord. Modellen er primær kilde,
// fordi den forstår at fx "Coca-Cola" = sodavand og "Matilde kakaomælk" = mælk —
// den rene navne-match her rammer ikke mærkenavne/sammensatte ord (det var
// årsagen til at tilbud uden soeg blev usynlige for pris-motoren).
function udledSoeg(navn: string): string[] {
  return SOEG_VOCAB
    .filter((vok) => matcherSoegeord(navn, vok))
    .sort((a, b) => b.length - a.length)
    .slice(0, 3);
}

// Hurtigt opslag til at validere modellens soeg-ord mod ordforrådet.
const SOEG_SET = new Set(SOEG_VOCAB);

// Sikkerhedsnet (Opgave 2): selv om prompten beder om kun mad/drikke, dropper vi
// åbenlys non-food som modellen ved et uheld tager med. Bevidst KONSERVATIV liste
// (kun entydige nøgleord) så vi aldrig taber rigtige fødevarer.
const NONFOOD_ORD = [
  "toiletpapir", "køkkenrulle", "husholdningsrulle", "servietter", "rengøring",
  "rengørings", "vaskemiddel", "vaskepulver", "skyllemiddel", "opvasketabs",
  "opvaskemiddel", "håndsæbe", "sæbe", "shampoo", "balsam", "tandpasta", "deodorant",
  "kosmetik", "makeup", "mascara", "bleer", "vatpinde", "hundefoder", "hundemad",
  "kattefoder", "kattemad", "kattegrus", "batterier", "lyspære", "glødepære",
  // "affald" fanger både affaldsposer og affaldposer; "pleje" fanger hud-/hår-/
  // ansigtspleje (også med stavefejl som "hårtpleje"). Ingen fødevare indeholder
  // disse delstrenge, så de er sikre at matche bredt.
  "affald", "pleje",
];
function erNonFood(navn: string): boolean {
  const n = " " + navn.toLowerCase() + " ";
  return NONFOOD_ORD.some((o) => n.includes(o));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { billede } = await req.json();
    if (!billede || typeof billede !== "string" || !billede.startsWith("data:")) {
      return svar({ error: "Mangler 'billede' (data-URL)" }, 400);
    }

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

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
      "- maengde: pakkestørrelsen/mængden brugeren får, som den står på flisen " +
      "(fx \"500 g\", \"8 stk\", \"1 l\", \"6-pak\", \"1 kg\", \"4 ruller\"). Tom streng " +
      "hvis intet mængde-mål er vist.\n" +
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
      "\"min. 2 stk\"), ellers \"\".\n" +
      "- soeg: 0-3 ord VALGT FRA ORDLISTEN nedenfor, der beskriver varens TYPE, så " +
      "prisen kan matche appens motor. Du kender varen bedre end et tekst-match: vælg " +
      "fx \"sodavand\" til Coca-Cola/Fanta/Pepsi, \"mælk\" til kakaoskummetmælk, " +
      "\"ost\" til skiveost/smelteost, \"grisekød\" til mørbrad af gris. Vælg de mest " +
      "specifikke ord der passer. Brug KUN ord fra listen — opfind aldrig nye. Tom " +
      "liste hvis intet ord passer.\n" +
      "ORDLISTE: " + SOEG_VOCAB.join(", ") + "\n\n" +
      "MEDTAG KUN spiselige eller drikkelige varer: fødevarer + drikkevarer (også " +
      "kaffe, sodavand, øl, vin, is, slik, snacks).\n" +
      "UDELAD ALT non-food — også selvom det er på tilbud: toiletpapir, køkkenrulle, " +
      "servietter, rengøring, vaskemiddel, opvask, sæbe, shampoo, kosmetik, bleer, " +
      "dyrefoder/kattegrus, batterier, køkken-/husholdningsartikler, blomster, tøj. " +
      "Spring også rene reklamer, opskrifter og konkurrencer over.\n" +
      "Er du i tvivl om en MAD-flise er en vare → MEDTAG den hellere. Er du i tvivl om " +
      "noget er non-food → UDELAD det.\n\n" +
      "Returnér KUN JSON: " +
      "{\"forventet_antal\":0,\"varer\":[{\"navn\":\"...\",\"maengde\":\"500 g\",\"pris\":0,\"soeg\":[\"...\"],\"tilbudstype\":\"stk\",\"betingelse\":\"\"}]}";

    const { media_type, data } = dataUrlTilKilde(billede);
    const res = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      // Plads til 30-40 varer PR. side med alle felter (nu også soeg). For lavt
      // → JSON klippes midt i en vare og siden taber tilbud.
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            // Claude læser billedet i fuld opløsning op til modellens grænse —
            // ingen detail-flag som hos OpenAI.
            { type: "image", source: { type: "base64", media_type, data } },
          ],
        },
      ],
    });

    const raw = udtrækTekst(res) || "{}";
    let parsed: { varer?: RaaVare[]; forventet_antal?: number };
    try { parsed = JSON.parse(raw); } catch { parsed = parseJson(raw); }

    // Rens: kun gyldige priser. soeg kommer PRIMÆRT fra modellen (den ved at
    // Coca-Cola = sodavand) — vi beholder kun ord der findes i ordforrådet, og
    // falder tilbage på lokal navne-udledning hvis modellen ikke gav brugbare ord.
    // Uden et gyldigt soeg-ord er et tilbud usynligt for pris-motoren.
    const varer: Vare[] = (parsed.varer ?? [])
      .filter((v) => v && typeof v.navn === "string" && Number.isFinite(Number(v.pris)))
      .map((v) => {
        const navn = String(v.navn).trim();
        const fraModel = (Array.isArray(v.soeg) ? v.soeg : [])
          .map((s) => String(s).toLowerCase().trim())
          .filter((s) => SOEG_SET.has(s));
        const soeg = fraModel.length > 0 ? [...new Set(fraModel)].slice(0, 3) : udledSoeg(navn);
        return {
          navn,
          maengde: String(v.maengde ?? "").trim(),
          pris: Number(v.pris),
          soeg,
        };
      })
      // Sikkerhedsnet: fjern tomme/ugyldige rækker OG åbenlys non-food (Opgave 2).
      .filter((v) => v.navn.length > 0 && v.pris > 0 && !erNonFood(v.navn));

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
