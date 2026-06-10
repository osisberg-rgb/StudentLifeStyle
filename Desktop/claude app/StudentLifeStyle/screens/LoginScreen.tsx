import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Colors, Radii } from '../constants/theme';
import { supabase } from '../lib/supabase';

type Props = { onNewUser: () => void };

export default function LoginScreen({ onNewUser }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const isValid = /\S+@\S+\.\S+/.test(email) && password.length > 0;

  async function handleAuth() {
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        onNewUser();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      setError('Forkert e-mail eller adgangskode. Prøv igen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoRow}>
          <Text style={styles.logo}>Mæt</Text>
          <View style={styles.logoDot} />
        </View>

        <Text style={styles.headline}>Spis godt for{'\n'}små penge</Text>
        <Text style={styles.sub}>
          Få en madplan ud fra ugens tilbud – og se hvor meget du sparer.
        </Text>

        {/* Fields */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldIcon}>✉</Text>
          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor={Colors.inkSoft}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldIcon}>🔒</Text>
          <TextInput
            style={styles.input}
            placeholder="Adgangskode"
            placeholderTextColor={Colors.inkSoft}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.forgotWrap}>
          <Text style={styles.forgot}>Glemt kode?</Text>
        </TouchableOpacity>

        {/* Primary button */}
        <TouchableOpacity
          style={[styles.btnPrimary, !isValid && styles.btnDisabled]}
          onPress={handleAuth}
          disabled={!isValid || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnPrimaryText}>{mode === 'login' ? 'Log ind' : 'Opret konto'}</Text>
          }
        </TouchableOpacity>

        {/* Footer toggle */}
        <TouchableOpacity style={styles.footer} onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          <Text style={styles.footerText}>
            {mode === 'login' ? 'Ny her? ' : 'Har du en konto? '}
            <Text style={styles.footerLink}>
              {mode === 'login' ? 'Opret konto' : 'Log ind'}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  scroll: { padding: 24, paddingTop: 80, paddingBottom: 40 },
  logoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 28 },
  logo: {
    fontSize: 46,
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    color: Colors.ink,
    letterSpacing: -0.92,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.red,
    marginLeft: 4,
    marginTop: 10,
  },
  headline: {
    fontSize: 32,
    fontFamily: 'BricolageGrotesque_700Bold',
    color: Colors.ink,
    letterSpacing: -0.64,
    marginBottom: 10,
  },
  sub: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.inkSoft,
    lineHeight: 22,
    marginBottom: 32,
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: Radii.btn,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  fieldIcon: { fontSize: 16, marginRight: 10 },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.ink,
  },
  error: {
    color: Colors.red,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 20 },
  forgot: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.inkSoft },
  btnPrimary: {
    backgroundColor: Colors.green,
    borderRadius: Radii.btn,
    padding: 15,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.line },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.inkSoft,
  },
  btnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: Radii.btn,
    padding: 15,
  },
  mitidDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E40AF',
    marginRight: 8,
  },
  btnGhostText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.ink },
  footer: { marginTop: 32, alignItems: 'center' },
  footerText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.inkSoft },
  footerLink: { fontFamily: 'Inter_700Bold', color: Colors.green },
});
