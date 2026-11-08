import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MobileMatchdayProvider, useMobileMatchday } from '../src/context/MobileMatchdayContext';
import { MobileAuthScreen } from '../src/components/MobileAuthScreen';
import { requestMatchNotificationPermissions } from '../src/services/matchNotificationService';

function AppRootNavigator() {
  const { authReady, currentUser, isDemoMode } = useMobileMatchday();

  if (!authReady) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!currentUser && !isDemoMode) {
    return <MobileAuthScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#020617' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="live-match"
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    requestMatchNotificationPermissions();
  }, []);

  return (
    <MobileMatchdayProvider>
      <StatusBar style="light" />
      <AppRootNavigator />
    </MobileMatchdayProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
