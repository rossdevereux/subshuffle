import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Fallback catch-all route so any deep link or custom scheme URL redirects
 * cleanly to the Pitch & Bench tabs instead of showing "Unmatched Route".
 */
export default function NotFoundRedirect() {
  return <Redirect href="/(tabs)" />;
}

