import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useMobileMatchday } from '../context/MobileMatchdayContext';

export function MobileAuthScreen() {
  const {
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
    signInWithGoogleBrowser,
    enterDemoMode,
    loading,
    errorMessage,
    syncMessage,
    clearMessages,
    apiBaseUrl,
  } = useMobileMatchday();

  const [mode, setMode] = useState<'signin' | 'register' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    clearMessages();
    setLocalError(null);
    if (!email.trim()) {
      setLocalError('Please enter your email address.');
      return;
    }

    try {
      if (mode === 'reset') {
        await sendPasswordReset(email);
        setMode('signin');
        return;
      }
      if (!password || password.length < 6) {
        setLocalError('Please enter your password (at least 6 characters).');
        return;
      }
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, displayName);
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Authentication failed');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoEmoji}>⚽</Text>
          </View>
          <Text style={styles.brandTitle}>SubShuffle</Text>
          <Text style={styles.brandSubtitle}>
            Grassroots Football Rotations, Fair Play & Live Matchday Console
          </Text>
        </View>

        <View style={styles.card}>
          {/* 1-Tap Google / Web Browser OAuth Handoff */}
          <Pressable style={styles.googleBtn} onPress={signInWithGoogleBrowser}>
            <Text style={styles.googleBtnText}>🌐 Sign In with Google (Browser Handoff)</Text>
          </Pressable>
          <Text style={styles.googleHint}>
            Opens {apiBaseUrl.replace('https://', '')} in your browser and returns straight to the app
            with your teams & fixtures.
          </Text>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR USE EMAIL & PASSWORD</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.modeTabs}>
            <Pressable
              style={[styles.modeTab, mode === 'signin' && styles.modeTabActive]}
              onPress={() => {
                setMode('signin');
                setLocalError(null);
              }}
            >
              <Text style={[styles.modeTabText, mode === 'signin' && styles.modeTabTextActive]}>
                Sign In
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeTab, mode === 'register' && styles.modeTabActive]}
              onPress={() => {
                setMode('register');
                setLocalError(null);
              }}
            >
              <Text style={[styles.modeTabText, mode === 'register' && styles.modeTabTextActive]}>
                Create Account
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeTab, mode === 'reset' && styles.modeTabActive]}
              onPress={() => {
                setMode('reset');
                setLocalError(null);
              }}
            >
              <Text style={[styles.modeTabText, mode === 'reset' && styles.modeTabTextActive]}>
                Reset Password
              </Text>
            </Pressable>
          </View>

          {(localError || errorMessage) && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{localError || errorMessage}</Text>
            </View>
          )}

          {syncMessage && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{syncMessage}</Text>
            </View>
          )}

          {mode === 'register' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Coach Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Coach Ross"
                placeholderTextColor="#64748b"
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@club.com"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {mode !== 'reset' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          )}

          <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#022c22" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'signin'
                  ? 'Sign In to My Teams'
                  : mode === 'register'
                  ? 'Create Coach Account'
                  : 'Send Password Reset Email'}
              </Text>
            )}
          </Pressable>
        </View>

        <Pressable style={styles.demoBtn} onPress={enterDemoMode}>
          <Text style={styles.demoBtnText}>👀 Explore Offline Demo Team First (The Rovers U10)</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#020617',
  },
  container: {
    padding: 20,
    paddingTop: 54,
    paddingBottom: 40,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#064e3b',
    borderWidth: 2,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoEmoji: {
    fontSize: 32,
  },
  brandTitle: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  googleBtn: {
    backgroundColor: '#f8fafc',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  googleBtnText: {
    color: '#0f172a',
    fontWeight: '900',
    fontSize: 14,
  },
  googleHint: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1e293b',
  },
  dividerText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    marginHorizontal: 10,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: '#1e293b',
  },
  modeTabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  modeTabTextActive: {
    color: '#10b981',
    fontWeight: '900',
  },
  errorBox: {
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  successText: {
    color: '#a7f3d0',
    fontSize: 12,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#f8fafc',
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    color: '#022c22',
    fontWeight: '900',
    fontSize: 14,
  },
  demoBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  demoBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
});

