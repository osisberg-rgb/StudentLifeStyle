// Importér en opskrift fra en URL og omskriv den til appens faste skema, så
// ingredienserne automatisk kan matches mod ugens supermarkeds-tilbud.
//
// FASE 1: ren scanner + normalisering. Gemmer INTET — returnerer den
// normaliserede opskrift, så app'en kan vise et preview og selv gemme den i
// `bruger_opskrifter` (kommer i fase 2).
//
// Pipeline:
//   1. fetch(url) → HTML
//   2. JSON-LD (schema.org/Recipe) → rå navn/ingredienser/instruktioner/billede
//      (falder tilbage på ren sidetekst hvis siden ikke har JSON-LD)
//   3. gpt-4o-mini normaliserer til vores skema — vigtigst: et `soeg`-array
//      pr. ingrediens fra vores faste ordforråd, så prismotoren rammer varen
//   4. deterministisk validering: hver ikke-estimeret ingrediens tjekkes mod
//      basispris-ordforrådet og markeres `lav_sikkerhed` hvis intet match
//
// Test:
//   curl -i -X POST "$SUPABASE_URL/functions/v1/importer-opskrift" \
//     -H "Authorization: Bearer $ANON_KEY" -H "Content-Type: application/json" \
//     -d '{"url":"https://www.valdemarsro.dk/spaghetti-bolognese/"}'
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "https://deno.land/x/openai@v4.52.7/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Ordforråd ────────────────────────────────────────────────────────────
// Søgeordene der HAR en basispris i appen (constants/basispriser.ts). Et
// soeg-ord som rammer ét af disse, kan prissættes og dermed sammenlignes med
// et tilbud. LLM'en SKAL vælge sine soeg-ord herfra, ellers bliver varen
// usynlig for tilbuds-motoren. Holdes i sync med basispriser.ts.
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
  "piskefløde", "fløde",
];

// Samme ord-start-match som appens motor (constants/basispriser.ts):
// 'ris' rammer "ris"/"risengrød" men ikke "grisekød".
function matcherSoegeord(tekst: string, soegeord: string): boolean {
  const norm = (s: string) =>
    " " + s.toLowerCase().replace(/[^a-z0-9æøåé]+/g, " ").trim() + " ";
  const t = norm(tekst);
  const k = norm(soegeord);
  return t.includes(k.substring(0, k.length - 1));
}

// Har ingrediensen mindst ét soeg-ord (eller et navn) der kan prissættes?
function harBasispris(navn: string, soeg: string[]): boolean {
  const kandidater = [...(soeg ?? []), navn];
  return kandidater.some(k => SOEG_VOCAB.some(v => matcherSoegeord(k, v)));
}

// ── Hent + parse siden ───────────────────────────────────────────────────
type RaaOpskrift = {
  navn?: string;
  billede?: string;
  ingredienser: string[];
  fremgangsmaade: string[];
  portioner?: string;
  tid?: string;
};

async function hentHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      // Nogle sider afviser ikke-browser-agenter
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "da,en;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Kunne ikke hente siden (HTTP ${res.status})`);
  return await res.text();
}

// Fladgør et felt der kan være streng | streng[] | {text}[] | {url} osv.
function tekstListe(felt: unknown): string[] {
  if (!felt) return [];
  if (typeof felt === "string") return [felt];
  if (Array.isArray(felt)) {
    return felt.flatMap(tekstListe);
  }
  if (typeof felt === "object") {
    const o = felt as Record<string, unknown>;
    if (o.itemListElement) return tekstListe(o.itemListElement);
    if (typeof o.text === "string") return [o.text];
    if (typeof o.name === "string") return [o.name];
    if (typeof o.url === "string") return [o.url];
  }
  return [];
}

function førsteTekst(felt: unknown): string | undefined {
  const l = tekstListe(felt);
  return l.length ? l[0] : undefined;
}

function typeErRecipe(t: unknown): boolean {
  if (typeof t === "string") return t.toLowerCase().includes("recipe");
  if (Array.isArray(t)) return t.some(typeErRecipe);
  return false;
}

// Find et Recipe-objekt i en JSON-LD-blok (håndterer @graph og arrays)
function findRecipe(data: unknown): Record<string, unknown> | null {
  if (!data) return null;
  if (Array.isArray(data)) {
    for (const d of data) {
      const r = findRecipe(d);
      if (r) return r;
    }
    return null;
  }
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (typeErRecipe(o["@type"])) return o;
    if (o["@graph"]) return findRecipe(o["@graph"]);
  }
  return null;
}

function udtrækJsonLd(html: string): RaaOpskrift | null {
  const blokke = [...html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )];
  for (const m of blokke) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const r = findRecipe(data);
    if (!r) continue;
    return {
      navn: førsteTekst(r.name),
      billede: førsteTekst(r.image),
      ingredienser: tekstListe(r.recipeIngredient),
      fremgangsmaade: tekstListe(r.recipeInstructions),
      portioner: førsteTekst(r.recipeYield),
      tid: typeof r.totalTime === "string" ? r.totalTime : undefined,
    };
  }
  return null;
}

// OpenGraph-billede/titel — findes på stort set alle opskriftssider og
// redder billedet selv når opskriften ligger i microdata (fx valdemarsro)
// eller kun i sidetekst, hvor JSON-LD-stien ikke fanger det.
function udtrækMeta(html: string, property: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re) ??
    html.match(new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`,
      "i",
    ));
  return m ? m[1] : undefined;
}

// Fallback: strip HTML til ren tekst når siden ikke har JSON-LD
function renTekst(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);
}

// ISO 8601-varighed (PT1H10M) → minutter, til at fodre LLM'en
function isoTilMinutter(iso?: string): number | undefined {
  if (!iso) return undefined;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return undefined;
  const t = (parseInt(m[1] ?? "0") * 60) + parseInt(m[2] ?? "0");
  return t > 0 ? t : undefined;
}

function domæne(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// ── LLM-normalisering ────────────────────────────────────────────────────
const SYSTEM_PROMPT =
  `Du normaliserer en dansk madopskrift til et FAST JSON-skema, så en app kan
matche ingredienserne mod ugens supermarkeds-tilbud.

DET VIGTIGSTE: hver ingrediens skal have et "soeg"-array med danske
dagligvare-søgeord VALGT FRA DEN UDLEVEREDE ORDLISTE. Vælg de mest specifikke
ord der passer (fx "hakket oksekød" frem for "oksekød" hvis det er hakket).
Vælg gerne flere varianter. Bruger du ord uden for listen, bliver varen
usynlig for tilbuds-motoren.

REGLER:
- estimeret=true, estimereretPris=0, soeg=[] for krydderier, salt, peber,
  vand, en smule olie, frisk persille o.l. (varer man altid har / ikke køber
  særskilt).
- vaelgBilligstPerKg=true for kød og fisk (appen vælger billigste pr. kg).
  Ellers false.
- koed: præcis ét af "Oksekød", "Kylling", "Svinekød", "Fisk", "Vegetar",
  "Alt". Brug "Alt" hvis retten blander kødtyper eller ikke har kød men ikke
  er bevidst vegetarisk.
- portioner: heltal (default 4). minutter: heltal (default 30).
- kategorier: 0-2 af ["billig","fitness","boernefavorit","hverdag","storportion"].
- maengde: kort mængde-tekst, fx "400 g", "1 dåse (400 g)", "2 stk".
- fremgangsmaade: korte trin (omskriv/forkort gerne, men bevar betydningen).
- Oversæt til dansk hvis kilden er på et andet sprog.

Returnér KUN gyldig JSON i dette format (ingen markdown):
{
  "navn": "Spaghetti bolognese",
  "koed": "Oksekød",
  "portioner": 4,
  "minutter": 35,
  "kategorier": ["boernefavorit","storportion"],
  "ingredienser": [
    { "navn": "Hakket oksekød", "maengde": "400 g", "soeg": ["hakket oksekød","hakket dansk oksekød"], "vaelgBilligstPerKg": true, "estimeret": false },
    { "navn": "Hakkede tomater", "maengde": "1 dåse (400 g)", "soeg": ["hakkede tomater","dåsetomater"], "vaelgBilligstPerKg": false, "estimeret": true, "estimereretPris": 8 },
    { "navn": "Spaghetti", "maengde": "400 g", "soeg": ["spaghetti","pasta"], "vaelgBilligstPerKg": false, "estimeret": false },
    { "navn": "Salt og peber", "maengde": "lidt", "soeg": [], "vaelgBilligstPerKg": false, "estimeret": true, "estimereretPris": 0 }
  ],
  "fremgangsmaade": ["Brun kødet","Tilsæt tomater og simr 20 min","Kog spaghetti"]
}`;

type NormIngrediens = {
  navn: string;
  maengde: string;
  soeg: string[];
  vaelgBilligstPerKg?: boolean;
  estimeret?: boolean;
  estimereretPris?: number;
  lav_sikkerhed?: boolean;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url, billede } = await req.json().catch(() => ({}));
    const harBillede = typeof billede === "string" && billede.length > 0;

    if (!harBillede && (!url || typeof url !== "string" || !/^https?:\/\//i.test(url))) {
      return json({ error: "Send et gyldigt http(s)-link i 'url' eller et billede i 'billede'." }, 400);
    }

    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });
    const ordliste = `ORDLISTE (vælg soeg-ord herfra):\n${SOEG_VOCAB.join(", ")}\n\n`;

    let opskrift: Record<string, unknown>;
    let jsonLdBillede: string | null = null;
    let kildeType: string;

    if (harBillede) {
      // ── Billede-flow: læs opskriften direkte fra et foto/screenshot ──
      // `billede` er en data-URL (data:image/...;base64,XXXX)
      kildeType = "billede";
      const svar = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        max_tokens: 4000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: ordliste +
                  "Læs madopskriften på dette billede (foto eller screenshot) og " +
                  "udtræk navn, ingredienser og fremgangsmåde. Er noget ulæseligt, " +
                  "så udelad det frem for at gætte.",
              },
              { type: "image_url", image_url: { url: billede } },
            ],
          },
        ],
      });
      opskrift = JSON.parse(svar.choices[0].message.content ?? "{}");
    } else {
      // ── Link-flow: hent siden, parse JSON-LD/tekst, normalisér ──
      const html = await hentHtml(url);
      const jsonLd = udtrækJsonLd(html);
      jsonLdBillede = jsonLd?.billede ?? udtrækMeta(html, "og:image") ?? null;
      kildeType = jsonLd && jsonLd.ingredienser.length > 0 ? "json-ld" : "tekst";

      let raaTekst: string;
      if (jsonLd && jsonLd.ingredienser.length > 0) {
        raaTekst =
          `NAVN: ${jsonLd.navn ?? ""}\n` +
          `PORTIONER (yield): ${jsonLd.portioner ?? ""}\n` +
          `TID (minutter): ${isoTilMinutter(jsonLd.tid) ?? ""}\n\n` +
          `INGREDIENSER:\n${jsonLd.ingredienser.map(i => `- ${i}`).join("\n")}\n\n` +
          `FREMGANGSMÅDE:\n${jsonLd.fremgangsmaade.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
      } else {
        raaTekst =
          `Siden har ikke struktureret opskrift-data. Find opskriften i denne ` +
          `sidetekst og udtræk navn, ingredienser og fremgangsmåde:\n\n${renTekst(html)}`;
      }

      const svar = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        max_tokens: 4000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: ordliste + `RÅ OPSKRIFT:\n${raaTekst}` },
        ],
      });
      opskrift = JSON.parse(svar.choices[0].message.content ?? "{}");
    }

    // Deterministisk validering: markér ingredienser vi ikke kan prissætte,
    // så app'ens preview kan bede brugeren rette dem.
    const ingredienser: NormIngrediens[] = (opskrift.ingredienser ?? []).map(
      (i: NormIngrediens) => {
        const erEstimeret = !!i.estimeret;
        const kanPrissættes = erEstimeret || harBasispris(i.navn, i.soeg ?? []);
        return { ...i, soeg: i.soeg ?? [], lav_sikkerhed: !kanPrissættes };
      },
    );

    const lavSikkerhed = ingredienser.filter(i => i.lav_sikkerhed).length;

    // Server-side felter — mere pålidelige end at lade LLM'en gætte
    const resultat = {
      ...opskrift,
      ingredienser,
      billede_url: jsonLdBillede,
      kilde_url: harBillede ? null : url,
      kilde_navn: harBillede ? "Eget billede" : domæne(url),
      // Diagnostik til preview-skærmen
      _kilde: kildeType,
      _lav_sikkerhed_antal: lavSikkerhed,
    };

    return json(resultat);
  } catch (e: unknown) {
    const besked = e instanceof Error ? e.message : "Ukendt fejl";
    console.error("importer-opskrift fejl:", besked);
    return json({ error: besked }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
