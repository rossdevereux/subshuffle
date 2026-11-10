import { Platform } from 'react-native';

/**
 * Native Android Google Sign-In (Credential Manager account picker).
 *
 * Shows the device's own Google account chooser and returns a Google ID token, which is then
 * exchanged for a SubShuffle (Firebase) session via `mobileSignInWithGoogleIdToken`.
 *
 * The OAuth *Web* client ID below is a public identifier (not a secret). It belongs to the
 * `team-organiser-prod` Firebase project, which also has an Android OAuth client registered for
 * `com.subshuffle.app` with the release-signing SHA-1, so tokens are only issued to genuine
 * SubShuffle release APKs.
 *
 * The native module is loaded lazily so Expo Go / web builds (which don't include it) never
 * crash on import — they simply report native sign-in as unavailable.
 */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '942396117037-av6m9vth2g070m4fa29nhli0eflgnfrl.apps.googleusercontent.com';

export type NativeGoogleSignInResult =
  | { status: 'success'; idToken: string; email?: string; displayName?: string }
  | { status: 'cancelled' }
  | { status: 'unavailable'; reason: string };

let configured = false;

function loadGoogleSigninModule(): any | null {
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-google-signin/google-signin');
  } catch {
    return null;
  }
}

export function isNativeGoogleSignInAvailable(): boolean {
  const mod = loadGoogleSigninModule();
  return Boolean(mod?.GoogleSignin);
}

/**
 * Opens the native Google account picker and returns the selected account's ID token.
 */
export async function signInWithNativeGoogle(): Promise<NativeGoogleSignInResult> {
  const mod = loadGoogleSigninModule();
  if (!mod?.GoogleSignin) {
    return { status: 'unavailable', reason: 'Native Google Sign-In is not available in this build.' };
  }
  const { GoogleSignin, statusCodes, isErrorWithCode } = mod;

  try {
    if (!configured) {
      GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
      configured = true;
    }
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();
    // v13+: { type: 'success' | 'cancelled', data }
    if (response?.type === 'cancelled') {
      return { status: 'cancelled' };
    }
    const data = response?.data ?? response;
    const idToken: string | undefined = data?.idToken;
    if (!idToken) {
      return {
        status: 'unavailable',
        reason: 'Google did not return an ID token. Please try the browser sign-in instead.',
      };
    }
    return {
      status: 'success',
      idToken,
      email: data?.user?.email ?? undefined,
      displayName: data?.user?.name ?? undefined,
    };
  } catch (err: any) {
    if (typeof isErrorWithCode === 'function' && isErrorWithCode(err)) {
      if (err.code === statusCodes?.SIGN_IN_CANCELLED) return { status: 'cancelled' };
      if (err.code === statusCodes?.IN_PROGRESS) return { status: 'cancelled' };
      if (err.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          status: 'unavailable',
          reason: 'Google Play Services is unavailable on this device. Use browser sign-in instead.',
        };
      }
    }
    throw new Error(err?.message || 'Google sign-in failed');
  }
}

/**
 * Clears the cached Google account so the account picker is shown again on next sign-in.
 */
export async function signOutNativeGoogle(): Promise<void> {
  const mod = loadGoogleSigninModule();
  if (!mod?.GoogleSignin || !configured) return;
  try {
    await mod.GoogleSignin.signOut();
  } catch {
    // Ignore — the SubShuffle session is already cleared.
  }
}

