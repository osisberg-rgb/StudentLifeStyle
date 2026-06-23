// Delt "valgt uge" på tværs af faner — planlægger man uge 25 på Planer,
// skal Indkøb også vise uge 25, uden at man selv skal skifte.
// Modul-niveau state (samme mønster som onboardingHandoff): fanerne
// læser ved fokus og skriver når brugeren skifter uge.
let valgtUge: number | null = null;

export function sætValgtUge(uge: number): void {
  valgtUge = uge;
}

// Fallback = kalenderens aktuelle uge, indtil brugeren selv har valgt en
export function hentValgtUge(fallback: number): number {
  return valgtUge ?? fallback;
}
