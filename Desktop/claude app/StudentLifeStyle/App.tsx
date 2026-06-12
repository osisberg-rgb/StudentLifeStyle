import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
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

import LoginScreen from './screens/LoginScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import HomeScreen from './screens/HomeScreen';
import PlanerScreen from './screens/PlanerScreen';
import IndkøbScreen from './screens/IndkøbScreen';
import ProfilScreen from './screens/ProfilScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
  return (
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
      <Tab.Screen name="Planer" component={PlanerScreen} />
      <Tab.Screen name="Indkøb" component={IndkøbScreen} />
      <Tab.Screen name="Profil" component={ProfilScreen} />
    </Tab.Navigator>
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
