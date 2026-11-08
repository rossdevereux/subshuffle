import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MobileMatchdayProvider } from '../src/context/MobileMatchdayContext';

export default function RootLayout() {
  return (
    <MobileMatchdayProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#020617' },
          headerTintColor: '#f8fafc',
          contentStyle: { backgroundColor: '#020617' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="live-match"
          options={{
            presentation: 'modal',
            title: 'Live Touchline Match',
            headerStyle: { backgroundColor: '#064e3b' },
            headerTintColor: '#ffffff',
          }}
        />
      </Stack>
    </MobileMatchdayProvider>
  );
}

