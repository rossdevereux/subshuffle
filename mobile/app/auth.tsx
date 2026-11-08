import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Redirect, useGlobalSearchParams } from 'expo-router';
import { useMobileMatchday } from '../src/context/MobileMatchdayContext';

/**
 * Handles the `subshuffle://auth?idToken=...` OAuth handoff route in Expo Router
 * so the user is seamlessly signed in and redirected to the main tabs without
 * ever hitting Expo Router's "Unmatched Route" screen.
 */
export default function AuthCallbackRoute() {
  const params = useGlobalSearchParams<{
    idToken?: string;
    refreshToken?: string;
    uid?: string;
    email?: string;
    displayName?: string;
  }>();
  const { completeDeepLinkSignIn } = useMobileMatchday();

  useEffect(() => {
    if (params?.idToken && typeof params.idToken === 'string') {
      completeDeepLinkSignIn({
        idToken: params.idToken,
        refreshToken: typeof params.refreshToken === 'string' ? params.refreshToken : '',
        uid: typeof params.uid === 'string' ? params.uid : 'user',
        email: typeof params.email === 'string' ? params.email : '',
        displayName: typeof params.displayName === 'string' ? params.displayName : undefined,
      });
    }
  }, [params?.idToken, params?.refreshToken, params?.uid, params?.email, params?.displayName, completeDeepLinkSignIn]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#10b981" />
      <Text style={styles.text}>Signing you in to SubShuffle...</Text>
      <Redirect href="/(tabs)" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  text: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '800',
  },
});

