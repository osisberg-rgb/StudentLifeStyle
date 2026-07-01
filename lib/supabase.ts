import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

export const supabaseUrl = 'https://oqolcifpmdybimspnadc.supabase.co';
export const supabaseAnonKey = 'sb_publishable_SntdXltM0E8APcJBVIs4hw_MAtau6SF';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// `madplaner`-rækker har en FK til `profiles`, så enhver skrivning til
// madplaner skal først sikre at brugerens profil-række findes.
export async function sikrProfilRad(userId: string) {
  await supabase.from('profiles').upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });
}
