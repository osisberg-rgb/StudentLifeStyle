// Akkumuleret besparelse — ren beregningslogik (ingen React/Supabase),
// så den kan testes i scripts/test-tilbud.ts.
// Kilden til sandhed er madplaner.total_spar — den ægte tilbuds-besparelse
// (normalpris minus tilbudspris) der beregnes deterministisk når planen gemmes.
// Gamle rækker uden total_spar falder tilbage til plan-JSON'en og tæller som 0
// hvis heller ikke den kan bruges — appen må aldrig vælte på gamle planer.
import { beregnBesparelse } from './indkoeb';
import { IndkoebsButik } from '../types/madplan';

export type BesparelsesRække = {
  total_spar: number | null;
  plan_besparelse: number | null;
  plan_indkoebsliste: unknown;
  // Kun sat når rækken kommer fra databasen (ikke i unit-tests) — bruges til
  // besparelse-over-tid-grafen og historikken
  uge_nr?: number | null;
  total_pris?: number | null;
  plan_pris?: number | null;
};

// Én uges tal til grafen og historikken
export type BesparelsesUge = { uge: number; spar: number; pris: number };

// Besparelsen for én gemt plan: total_spar-kolonnen → plan.besparelse →
// udledt af plan.indkoebsliste → 0.
export function beregnPlanBesparelse(række: BesparelsesRække): number {
  if (typeof række.total_spar === 'number' && Number.isFinite(række.total_spar)) {
    return Math.max(0, Math.round(række.total_spar));
  }
  if (typeof række.plan_besparelse === 'number' && Number.isFinite(række.plan_besparelse)) {
    return Math.max(0, Math.round(række.plan_besparelse));
  }
  if (Array.isArray(række.plan_indkoebsliste)) {
    try {
      const udledt = beregnBesparelse(række.plan_indkoebsliste as IndkoebsButik[]);
      if (Number.isFinite(udledt)) return Math.max(0, udledt);
    } catch {
      // gammelt planformat uden varer-felter
    }
  }
  return 0;
}

export function beregnSamletBesparelse(rækker: BesparelsesRække[]): number {
  return rækker.reduce((sum, r) => sum + beregnPlanBesparelse(r), 0);
}

// Ugens samlede pris: total_pris-kolonnen → plan.indkoebspris → udledt af
// indkøbslistens subtotaler → 0. Samme robusthed som besparelsen.
export function beregnPlanPris(række: BesparelsesRække): number {
  if (typeof række.total_pris === 'number' && Number.isFinite(række.total_pris)) {
    return Math.max(0, Math.round(række.total_pris));
  }
  if (typeof række.plan_pris === 'number' && Number.isFinite(række.plan_pris)) {
    return Math.max(0, Math.round(række.plan_pris));
  }
  if (Array.isArray(række.plan_indkoebsliste)) {
    try {
      const sum = (række.plan_indkoebsliste as IndkoebsButik[])
        .reduce((s, b) => s + (b?.subtotal ?? 0), 0);
      if (Number.isFinite(sum)) return Math.max(0, Math.round(sum));
    } catch {
      // gammelt planformat
    }
  }
  return 0;
}

// Per-uge serie til grafen, sorteret stigende efter ugenummer. Rækker uden
// ugenummer (fx unit-test-objekter) springes over.
export function byggUgeSerie(rækker: BesparelsesRække[]): BesparelsesUge[] {
  return rækker
    .filter(r => typeof r.uge_nr === 'number')
    .map(r => ({ uge: r.uge_nr as number, spar: beregnPlanBesparelse(r), pris: beregnPlanPris(r) }))
    .sort((a, b) => a.uge - b.uge);
}

// Dansk tusindtals-format uden Intl (Hermes): 2340 → "2.340"
export function formatKr(beløb: number): string {
  return String(Math.max(0, Math.round(beløb))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
