import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { parseQueryParams } from './mobileDataNormalizer';

export { parseQueryParams };

export interface MobileAuthUser {
  uid: string;
  email: string;
  displayName?: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface PersistedMobilePrefs {
  user: MobileAuthUser | null;
  activeTeamId?: string;
  activeFixtureId?: string;
  sunlightMode?: boolean;
}

const STORAGE_KEY = 'subshuffle_persisted_state_v2';
let memoryPrefs: PersistedMobilePrefs = { user: null };
let cachedFirebaseApiKey: string | null =
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY || null;

/**
 * Loads persisted mobile session & preferences safely without invoking native notification APIs.
 */
export async function loadPersistedPrefs(): Promise<PersistedMobilePrefs> {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        memoryPrefs = JSON.parse(raw);
        return memoryPrefs;
      }
    }
  } catch {
    // Fallback to in-memory prefs
  }
  return memoryPrefs;
}

/**
 * Saves mobile session & preferences safely in memory (and localStorage on web).
 */
export async function savePersistedPrefs(
  partial: Partial<PersistedMobilePrefs>
): Promise<PersistedMobilePrefs> {
  memoryPrefs = {
    ...memoryPrefs,
    ...partial,
  };
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryPrefs));
    }
  } catch {
    // Ignore storage write error
  }
  return memoryPrefs;
}

/**
 * Resets in-memory preferences (useful for testing and sign-out).
 */
export function resetMemoryPrefs(): void {
  memoryPrefs = { user: null };
}

/**
 * Resolves the Firebase Web API Key from env or by inspecting the hosted web client bundle.
 */
export async function resolveFirebaseApiKey(apiBaseUrl: string): Promise<string> {
  if (cachedFirebaseApiKey && cachedFirebaseApiKey.startsWith('AIza')) {
    return cachedFirebaseApiKey;
  }

  try {
    const htmlRes = await fetch(apiBaseUrl);
    const html = await htmlRes.text();
    const directMatch = html.match(/AIzaSy[A-Za-z0-9_-]{33}/);
    if (directMatch) {
      cachedFirebaseApiKey = directMatch[0];
      return cachedFirebaseApiKey;
    }

    const scriptMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (scriptMatch?.[1]) {
      const jsRes = await fetch(`${apiBaseUrl}${scriptMatch[1]}`);
      const jsText = await jsRes.text();
      const keyMatch = jsText.match(/AIzaSy[A-Za-z0-9_-]{33}/);
      if (keyMatch) {
        cachedFirebaseApiKey = keyMatch[0];
        return cachedFirebaseApiKey;
      }
    }
  } catch {
    // Ignore network lookup failure
  }

  throw new Error(
    'Unable to reach SubShuffle authentication service. Check your internet connection or use "Sign In with Google / Browser".'
  );
}

export function setCachedFirebaseApiKeyForTesting(key: string | null): void {
  cachedFirebaseApiKey = key;
}

function formatFirebaseRestError(code?: string): string {
  switch (code) {
    case 'INVALID_LOGIN_CREDENTIALS':
    case 'INVALID_PASSWORD':
    case 'EMAIL_NOT_FOUND':
      return 'Invalid email or password. If you originally signed up with Google, tap "Sign In with Google" or use "Reset Password" below.';
    case 'EMAIL_EXISTS':
      return 'An account with this email already exists. Please sign in instead.';
    case 'WEAK_PASSWORD : Password should be at least 6 characters':
    case 'WEAK_PASSWORD':
      return 'Password should be at least 6 characters.';
    case 'INVALID_EMAIL':
      return 'Please enter a valid email address.';
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
      return 'Too many attempts. Please wait a moment or reset your password.';
    default:
      return code ? `Authentication error: ${code}` : 'Authentication failed. Please try again.';
  }
}

/**
 * Sign in with Email and Password via Firebase Identity Toolkit REST API.
 */
export async function mobileSignInWithEmail(
  apiBaseUrl: string,
  email: string,
  password: string
): Promise<MobileAuthUser> {
  const apiKey = await resolveFirebaseApiKey(apiBaseUrl);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        password,
        returnSecureToken: true,
      }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatFirebaseRestError(data?.error?.message));
  }

  const user: MobileAuthUser = {
    uid: String(data.localId || 'user'),
    email: String(data.email || email.trim()),
    displayName: data.displayName ? String(data.displayName) : undefined,
    idToken: String(data.idToken || ''),
    refreshToken: String(data.refreshToken || ''),
    expiresAt: Date.now() + (Number(data.expiresIn) || 3600) * 1000 - 60_000,
  };
  await savePersistedPrefs({ user });
  return user;
}

/**
 * Register a new coach account with Email, Password, and Display Name.
 */
export async function mobileRegisterWithEmail(
  apiBaseUrl: string,
  email: string,
  password: string,
  displayName?: string
): Promise<MobileAuthUser> {
  const apiKey = await resolveFirebaseApiKey(apiBaseUrl);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        password,
        returnSecureToken: true,
      }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatFirebaseRestError(data?.error?.message));
  }

  let idToken = String(data.idToken || '');
  if (displayName && displayName.trim()) {
    try {
      const profileRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            displayName: displayName.trim(),
            returnSecureToken: true,
          }),
        }
      );
      if (profileRes.ok) {
        const profileData = await profileRes.json().catch(() => ({}));
        if (profileData.idToken) idToken = String(profileData.idToken);
      }
    } catch {
      // Ignore optional profile update failure
    }
  }

  const user: MobileAuthUser = {
    uid: String(data.localId || 'user'),
    email: String(data.email || email.trim()),
    displayName: displayName?.trim() || undefined,
    idToken,
    refreshToken: String(data.refreshToken || ''),
    expiresAt: Date.now() + (Number(data.expiresIn) || 3600) * 1000 - 60_000,
  };
  await savePersistedPrefs({ user });
  return user;
}

/**
 * Send a Firebase password reset / password setup email.
 */
export async function mobileSendPasswordReset(
  apiBaseUrl: string,
  email: string
): Promise<void> {
  const apiKey = await resolveFirebaseApiKey(apiBaseUrl);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email: email.trim(),
      }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(formatFirebaseRestError(data?.error?.message));
  }
}

/**
 * Refreshes an expired Firebase ID token using the stored refresh token.
 */
export async function ensureFreshIdToken(
  apiBaseUrl: string,
  user: MobileAuthUser | null
): Promise<MobileAuthUser | null> {
  if (!user) return null;
  if (user.expiresAt > Date.now() && user.idToken) {
    return user;
  }
  if (!user.refreshToken) {
    return user;
  }

  try {
    const apiKey = await resolveFirebaseApiKey(apiBaseUrl);
    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(user.refreshToken)}`,
    });
    if (!res.ok) return user;
    const data = await res.json().catch(() => ({}));
    const updated: MobileAuthUser = {
      ...user,
      idToken: data.id_token ? String(data.id_token) : user.idToken,
      refreshToken: data.refresh_token ? String(data.refresh_token) : user.refreshToken,
      expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000 - 60_000,
    };
    await savePersistedPrefs({ user: updated });
    return updated;
  } catch {
    return user;
  }
}

/**
 * Opens the SubShuffle Web OAuth flow in the system browser for 1-tap Google Sign-In handoff.
 */
export async function openGoogleBrowserSignIn(apiBaseUrl: string): Promise<void> {
  const targetUrl = `${apiBaseUrl}/?mobileAuth=1`;
  await Linking.openURL(targetUrl);
}

/**
 * Exchanges a Google ID token from the native Android account picker for a SubShuffle (Firebase)
 * session via the Identity Toolkit `signInWithIdp` REST endpoint. Existing Google accounts
 * created on the web app resolve to the same Firebase UID, so all teams & fixtures carry over.
 */
export async function mobileSignInWithGoogleIdToken(
  apiBaseUrl: string,
  googleIdToken: string
): Promise<MobileAuthUser> {
  const apiKey = await resolveFirebaseApiKey(apiBaseUrl);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postBody: `id_token=${encodeURIComponent(googleIdToken)}&providerId=google.com`,
        requestUri: 'http://localhost',
        returnIdpCredential: true,
        returnSecureToken: true,
      }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.idToken) {
    throw new Error(formatFirebaseRestError(data?.error?.message));
  }

  const user: MobileAuthUser = {
    uid: String(data.localId || 'user'),
    email: String(data.email || ''),
    displayName: data.displayName ? String(data.displayName) : undefined,
    idToken: String(data.idToken),
    refreshToken: String(data.refreshToken || ''),
    expiresAt: Date.now() + (Number(data.expiresIn) || 3600) * 1000 - 60_000,
  };
  await savePersistedPrefs({ user });
  return user;
}

/**
 * Parses a deep link URL (`subshuffle://auth?idToken=...&refreshToken=...`) from the browser handoff.
 */
export async function parseAndSaveAuthDeepLink(url: string): Promise<MobileAuthUser | null> {
  if (!url || !url.includes('auth') || !url.includes('idToken=')) {
    return null;
  }
  try {
    const queryIndex = url.indexOf('?');
    if (queryIndex === -1) return null;
    const params = parseQueryParams(url.slice(queryIndex + 1));
    const idToken = params.idToken;
    const refreshToken = params.refreshToken || '';
    const uid = params.uid || 'user';
    const email = params.email || '';
    const displayName = params.displayName || undefined;
    if (!idToken) return null;

    const user: MobileAuthUser = {
      uid,
      email,
      displayName,
      idToken,
      refreshToken,
      expiresAt: Date.now() + 50 * 60 * 1000,
    };
    await savePersistedPrefs({ user });
    return user;
  } catch {
    return null;
  }
}
