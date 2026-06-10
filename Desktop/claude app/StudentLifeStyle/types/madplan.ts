export type Ingrediens = {
  vare: string;
  butik: string | null;
  brugt: string;
  pakkestoerrelse: string;
  pakkepris: number;
  antaget_pakke?: boolean;
  paa_tilbud: boolean;
  normalpris?: number;
  estimeret?: boolean;
};

export type Maltid = {
  navn: string;
  pris_pr_portion: number;
  portioner: number;
  rester_fra?: string;
  ekstra_portioner_til_rester?: number;
  ingredienser?: Ingrediens[];
  fremgangsmaade?: string[];
};

export type Dag = {
  dag: string;
  morgenmad: Maltid;
  frokost: Maltid;
  aftensmad: Maltid;
};

export type IndkoebsVare = {
  vare: string;
  antal_pakker: number;
  pakkestoerrelse: string;
  pris: number;
  paa_tilbud: boolean;
  checked?: boolean;
};

export type IndkoebsButik = {
  butik: string;
  subtotal: number;
  varer: IndkoebsVare[];
};

export type RestlagerVare = {
  vare: string;
  koebt: string;
  brugt_i_ugen: string;
  rest: string;
  status: 'gemt_til_naeste_gang' | 'spild';
  vaerdi: number;
};

export type Madplan = {
  uge: number;
  antal_personer: number;
  proteinkilder?: string[];
  dage: Dag[];
  indkoebsliste: IndkoebsButik[];
  restlager?: RestlagerVare[];
  indkoebspris: number;
  besparelse: number;
  spild_kr?: number;
  gemt_vaerdi?: number;
  advarsler?: string[];
  // legacy
  total?: number;
};
