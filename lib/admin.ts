import type { Session } from '@supabase/supabase-js';

// Admin-e-mails der må uploade tilbudsaviser. Den RIGTIGE håndhævelse sker
// server-side (edge-funktionen start-tilbud-import + RLS) — dette skjuler blot
// indgangen i UI'et. Hold listen i sync med ADMIN_EMAILS i edge-funktionen.
export const ADMIN_EMAILS = ['os.isberg@gmail.com'];

export function erAdmin(session: Session | null): boolean {
  const email = session?.user?.email?.toLowerCase();
  return !!email && ADMIN_EMAILS.includes(email);
}
