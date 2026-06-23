// Brugerens "Mine varer"-watchlist (labels fra constants/mineVarer.ts), gemt i
// profiles.watch_items. Bruges af forsidens "Tilbud til dig".
import { supabase } from './supabase';

export async function hentMineVarer(): Promise<string[]> {
  try {
    const { data } = await supabase.from('profiles').select('watch_items').maybeSingle();
    return (data?.watch_items as string[] | null) ?? [];
  } catch {
    return [];
  }
}

export async function sætMineVarer(labels: string[]): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from('profiles').upsert({ id: user.id, watch_items: labels });
  return !error;
}
