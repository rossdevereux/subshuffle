import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MobileMatchdayProvider, useMobileMatchday } from '../src/context/MobileMatchdayContext';
import { MobileAuthScreen } from '../src/components/MobileAuthScreen';
import { resetMemoryPrefs } from '../src/services/mobileAuthService';

interface ErrorBoundaryState {
  hasError: boolean;
  errorText: string | null;
}

export class MobileErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorText: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorText: error?.message || String(error),
    };
  }

  componentDidCatch(error: Error) {
    console.error('[SubShuffle Mobile ErrorBoundary]', error);
  }

  handleRecover = () => {
    resetMemoryPrefs();
    this.setState({ hasError: false, errorText: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>⚠️ SubShuffle Recovery Mode</Text>
            <Text style={styles.errorSubtitle}>
              We caught an unexpected display error so your app didn&apos;t close:
            </Text>
            <ScrollView style={styles.errorBox}>
              <Text style={styles.errorCode}>{this.state.errorText || 'Unknown error'}</Text>
            </ScrollView>
            <Pressable style={styles.recoverBtn} onPress={this.handleRecover}>
              <Text style={styles.recoverBtnText}>↻ Reset Session & Reload App</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

function AppRootNavigator() {
  const { authReady, currentUser, isDemoMode } = useMobileMatchday();
  const showAuthOverlay = !authReady || (!currentUser && !isDemoMode);

  return (
    <View style={styles.rootWrapper}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#020617' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        <Stack.Screen
          name="live-match"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>

      {showAuthOverlay && (
        <View style={styles.authOverlay}>
          {!authReady ? (
            <View style={styles.loadingScreen}>
              <ActivityIndicator size="large" color="#10b981" />
            </View>
          ) : (
            <MobileAuthScreen />
          )}
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <MobileErrorBoundary>
      <MobileMatchdayProvider>
        <StatusBar style="light" />
        <AppRootNavigator />
      </MobileMatchdayProvider>
    </MobileErrorBoundary>
  );
}

const styles = StyleSheet.create({
  rootWrapper: {
    flex: 1,
    backgroundColor: '#020617',
  },
  authOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020617',
    zIndex: 999,
    elevation: 20,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorCard: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  errorTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  errorSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 10,
  },
  errorBox: {
    maxHeight: 160,
    backgroundColor: '#020617',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorCode: {
    color: '#fca5a5',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  recoverBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  recoverBtnText: {
    color: '#022c22',
    fontWeight: '900',
    fontSize: 14,
  },
});
