export const Colors = {
  paper: '#FCFBF8',
  canvas: '#F0ECE3',
  ink: '#1A1714',
  inkSoft: '#7A7065',
  line: '#ECE6DB',
  green: '#0E5C3F',
  greenBright: '#16A34A',
  greenSoft: '#E7F2EC',
  red: '#E23A2E',
  redSoft: '#FCE9E7',
  yellow: '#FFC93C',
  card: '#FFFFFF',
} as const;

export const Radii = {
  btn: 14,
  card: 18,
  hero: 20,
  pill: 999,
  thumb: 12,
} as const;

export const Shadow = {
  shadowColor: '#1A1714',
  shadowOpacity: 0.35,
  shadowRadius: 40,
  shadowOffset: { width: 0, height: 18 },
  elevation: 10,
} as const;

export const StoreColors: Record<string, { bg: string; text: string }> = {
  Netto:     { bg: '#FFC93C', text: '#1A1714' },
  'Rema 1000': { bg: '#0033A0', text: '#FFFFFF' },
  Lidl:      { bg: '#0050AA', text: '#FFFFFF' },
  Føtex:     { bg: '#005EB8', text: '#FFFFFF' },
  Bilka:     { bg: '#1452CC', text: '#FFFFFF' },
  Aldi:        { bg: '#001E78', text: '#FFFFFF' },
  Coop:        { bg: '#E2231A', text: '#FFFFFF' },
  '365discount': { bg: '#E23A2E', text: '#FFFFFF' },
  SuperBrugsen:  { bg: '#00843D', text: '#FFFFFF' },
  Kvikly:        { bg: '#004B87', text: '#FFFFFF' },
};
