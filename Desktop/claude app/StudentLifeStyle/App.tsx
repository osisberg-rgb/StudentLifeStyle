import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  useFonts,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './context/AuthContext';
import { Colors } from './constants/theme';
import { supabase } from './lib/supabase';
import { harForvalgteRetter } from './constants/onboardingHandoff';
import { synkroniserTilbud } from './lib/tilbudSync';
import { hentBrugerOpskrifter } from './lib/brugerOpskrifter';
import { hentFavoritter } from './lib/favoritter';
import { hentWatchlist } from './lib/watchlist';
import { harTilladelse, registrérForPush } from './lib/notifikationer';

import LoginScreen from './screens/LoginScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import HomeScreen from './screens/HomeScreen';
import PlanerScreen from './screens/PlanerScreen';
import IndkøbScreen from './screens/IndkøbScreen';
import ProfilScreen from './screens/ProfilScreen';
import ImportOpskriftModal from './components/ImportOpskriftModal';
import RedigerOpskriftModal from './components/RedigerOpskriftModal';
import TilføjOpskriftSheet, { TilføjMetode } from './components/TilføjOpskriftSheet';
import type { Opskrift } from './types/opskrift';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tom skabelon til "skriv selv" (samme som i VælgRetterModal)
const TOM_OPSKRIFT: Opskrift = {
  id: 'ny', navn: '', koed: 'Alt', portioner: 4,
  kategorier: [], ingredienser: [], fremgangsmaade: [], importeret: true,
};

// Stor central "+"-knap i tab-baren — åbner "Tilføj opskrift" (foto/screenshot/
// link/skriv selv). Overlapper baren ovenfra som i ReciMe.
function CenterFab({ onPress }: { onPress: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start' }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={{
          position: 'absolute', top: -18,
          width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.green,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// Pladsholder-skærm for "+"-fanen — vises aldrig (knappen åbner et ark i stedet).
function TilføjPlaceholder() { return null; }

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  // [inaktiv (outline), aktiv (udfyldt)] — rigtige ikoner tegnes ens på
  // iOS og Android, modsat de gamle teksttegn
  const ikoner: Record<string, [string, string]> = {
    Hjem:    ['home-outline', 'home'],
    Planer:  ['calendar-outline', 'calendar'],
    Indkøb:  ['cart-outline', 'cart'],
    Profil:  ['person-outline', 'person'],
  };
  const ikon = ikoner[name] ?? ['ellipse-outline', 'ellipse'];
  return (
    <Ionicons
      name={(focused ? ikon[1] : ikon[0]) as keyof typeof Ionicons.glyphMap}
      size={22}
      color={focused ? Colors.green : Colors.inkSoft}
    />
  );
}

function MainTabs() {
  const [sheetÅben, setSheetÅben] = useState(false);
  const [importÅben, setImportÅben] = useState(false);
  const [metode, setMetode] = useState<'kamera' | 'galleri' | 'link' | null>(null);
  const [redigerOpskrift, setRedigerOpskrift] = useState<Opskrift | null>(null);
  const [erNy, setErNy] = useState(false);

  // Et kort er valgt i "+"-arket → åbn det rette flow direkte
  function vælgMetode(m: TilføjMetode) {
    setSheetÅben(false);
    if (m === 'skriv') {
      setTimeout(() => { setErNy(true); setRedigerOpskrift(TOM_OPSKRIFT); }, 280);
      return;
    }
    setMetode(m);            // 'kamera' | 'galleri' | 'link'
    // Vent til arket er HELT lukket, før import-modalen åbnes — to modaler i
    // transition samtidig forhindrer billedvælgeren i at præsentere (iOS/Android).
    setTimeout(() => setImportÅben(true), 280);
  }

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        // Efter onboardingen lander man direkte i Planer, hvor vælgeren åbner
        // med de anbefalede retter fra aha-skærmen præ-valgt
        initialRouteName={harForvalgteRetter() ? 'Planer' : 'Hjem'}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
          tabBarLabel: ({ focused, children }) => (
            <Text style={{
              fontSize: 11,
              fontFamily: 'Inter_600SemiBold',
              color: focused ? Colors.green : Colors.inkSoft,
              marginBottom: 2,
            }}>
              {children}
            </Text>
          ),
          tabBarStyle: {
            backgroundColor: Colors.card,
            borderTopWidth: 1,
            borderTopColor: Colors.line,
            height: 64,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: Colors.green,
          tabBarInactiveTintColor: Colors.inkSoft,
        })}
      >
        <Tab.Screen name="Hjem" component={HomeScreen} />
        <Tab.Screen name="Planer" component={PlanerScreen} options={{ title: 'Uge plan' }} />
        <Tab.Screen
          name="Tilføj"
          component={TilføjPlaceholder}
          options={{
            tabBarLabel: () => null,
            tabBarButton: () => <CenterFab onPress={() => setSheetÅben(true)} />,
          }}
        />
        <Tab.Screen name="Indkøb" component={IndkøbScreen} />
        <Tab.Screen name="Profil" component={ProfilScreen} />
      </Tab.Navigator>

      {/* Halvskærms-ark fra "+"-knappen — vælg metode */}
      <TilføjOpskriftSheet
        synlig={sheetÅben}
        onVælg={vælgMetode}
        onLuk={() => setSheetÅben(false)}
      />

      {/* Tilføj opskrift — foto / screenshot / link / skriv selv */}
      <ImportOpskriftModal
        synlig={importÅben}
        metode={metode}
        onLuk={() => { setImportÅben(false); setMetode(null); }}
        onGemt={() => { setImportÅben(false); setMetode(null); }}
        onSkrivSelv={() => { setImportÅben(false); setMetode(null); setErNy(true); setRedigerOpskrift(TOM_OPSKRIFT); }}
      />
      <RedigerOpskriftModal
        opskrift={redigerOpskrift}
        erNy={erNy}
        onLuk={() => { setRedigerOpskrift(null); setErNy(false); }}
        onGemt={() => { setRedigerOpskrift(null); setErNy(false); }}
      />
    </View>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profilTjekket, setProfilTjekket] = useState(false);

  // Gate på profil-data, ikke kun in-memory state: en bruger der lukker
  // appen midt i onboardingen skal se den igen ved næste start.
  // household_size er altid sat når onboardingen er gennemført.
  useEffect(() => {
    if (!session) {
      setProfilTjekket(false);
      setShowOnboarding(false);
      return;
    }
    let aktiv = true;
    supabase.from('profiles').select('household_size').maybeSingle().then(({ data }) => {
      if (!aktiv) return;
      if (!data || data.household_size == null) setShowOnboarding(true);
      setProfilTjekket(true);
    });
    // Hent brugerens importerede opskrifter + favoritter + overvågede varer ind
    // i storen (fire-and-forget) — fejler det, virker appen videre uden dem
    hentBrugerOpskrifter();
    hentFavoritter();
    hentWatchlist();
    // Opdatér push-token hvis tilladelse allerede er givet (ingen prompt her)
    harTilladelse().then(ok => { if (ok) registrérForPush(); });
    return () => { aktiv = false; };
  }, [session]);

  if (loading || (session && !profilTjekket)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.paper }}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  if (!session) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login">
          {() => <LoginScreen onNewUser={() => setShowOnboarding(true)} />}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  if (showOnboarding) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding">
          {() => <OnboardingScreen onDone={() => setShowOnboarding(false)} />}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Hent ugens tilbud fra Supabase ved opstart (fire-and-forget). Indtil den
  // er færdig — eller hvis tabellen er tom — bruger motoren fallback-filerne.
  useEffect(() => { synkroniserTilbud(true); }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.paper }}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
