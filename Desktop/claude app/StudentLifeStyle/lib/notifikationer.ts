// Notifikations-tilladelse + Expo push-token. Kræver et dev build (expo-notifications
// virker ikke i Expo Go på SDK 53+). I Expo Go fejler den blødt (returnerer false),
// så resten af appen virker uændret.
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Lazy require: undgå hård import-fejl i Expo Go hvor pakken ikke er linket.
function modul(): any | null {
  try { return require('expo-notifications'); } catch { return null; }
}

export async function harTilladelse(): Promise<boolean> {
  const N = modul(); if (!N) return false;
  try {
    const { status } = await N.getPermissionsAsync();
    return status === 'granted';
  } catch { return false; }
}

// Bed om tilladelse (hvis ikke givet) og gem token. Returnerer true ved succes.
export async function registrérForPush(): Promise<boolean> {
  const N = modul(); if (!N) return false;
  try {
    let { status } = await N.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await N.requestPermissionsAsync());
    if (status !== 'granted') return false;

    const projectId = (Constants as any)?.expoConfig?.extra?.eas?.projectId
      ?? (Constants as any)?.easConfig?.projectId;
    if (!projectId) return false;

    const token = (await N.getExpoPushTokenAsync({ projectId })).data;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !token) return false;

    const platform = (require('react-native').Platform.OS) as string;
    await supabase.from('push_tokens').upsert(
      { user_id: user.id, token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' },
    );
    return true;
  } catch { return false; }
}

// Slå fra: fjern denne brugers tokens.
export async function afmeldPush(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('push_tokens').delete().eq('user_id', user.id);
  } catch { /* ignorér */ }
}
