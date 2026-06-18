// Delt opskrift-type — dækker BÅDE de statiske OPSKRIFTER og brugerens
// importerede opskrifter, så de kan behandles ens overalt i appen via
// alleOpskrifter()/findOpskrift() (lib/brugerOpskrifter.ts).
//
// De importerede opskrifter har samme felt-form som de statiske, plus et par
// ekstra felter (billede_url, kilde_*) — derfor er de valgfri her.

export type OpskriftIngrediens = {
  navn: string;
  maengde: string;
  soeg: string[];
  vaelgBilligstPerKg?: boolean;
  estimeret?: boolean;
  estimereretPris?: number;
  // Sat af importeren når en ingrediens ikke kunne prissættes — vises i
  // preview, så brugeren kan rette den
  lav_sikkerhed?: boolean;
};

export type Opskrift = {
  id: string;
  navn: string;
  koed: string;          // Oksekød | Kylling | Svinekød | Fisk | Vegetar | Alt
  portioner: number;
  kategori?: string;     // de statiske bruger "aftensmad"
  kategorier?: string[];
  minutter?: number;
  ingredienser: OpskriftIngrediens[];
  fremgangsmaade: string[];
  // Kun på importerede opskrifter
  billede_url?: string | null;
  kilde_url?: string | null;
  kilde_navn?: string | null;
  importeret?: boolean;
};
