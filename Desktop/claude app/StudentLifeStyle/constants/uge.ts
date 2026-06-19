// Ugenummer brugt i hele appen — bevidst IKKE ISO-uge.
// Formlen tæller dage siden 1. januar, justerer med årets første ugedag og
// runder op til hele uger. Den SKAL matche edge-funktionen
// send-tilbud-notifikationer (Deno, kan ikke importere herfra), så tilbuds-
// notifikationer ser samme uge som klienten. Ret du formlen, så ret begge steder.
export function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((((now.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
}
