// Engangs-overlevering fra onboardingens aha-skærm til Planer-fanen.
// Tallet brugeren ser i onboardingen SKAL holde: "Se jeres madplan" lander i
// vælgeren med præcis de samme retter præ-valgt, så ét tryk giver planen.
// Kun i hukommelsen — overleveringen sker i samme app-session.
let forvalgte: string[] | null = null;

export function sætForvalgteRetter(ids: string[]) {
  forvalgte = ids;
}

// Til navigations-beslutningen (må ikke rydde)
export function harForvalgteRetter(): boolean {
  return !!forvalgte && forvalgte.length > 0;
}

// Henter OG rydder — så vælgeren kun auto-åbner én gang
export function tagForvalgteRetter(): string[] | null {
  const f = forvalgte;
  forvalgte = null;
  return f;
}
