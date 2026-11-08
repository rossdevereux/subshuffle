import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';

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

const STORAGE_CATEGORY_ID = 'subshuffle_persisted_state_v1';
let memoryPrefs: PersistedMobilePrefs = { user: null };
let cachedFirebaseApiKey: string | null =
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY || null;

/**
 * Loads persisted mobile session & preferences from on-device storage.
 * Uses localStorage on web and Expo Notifications persistent SharedPreferences category storage on native.
 */
export async function loadPersistedPrefs(): Promise<PersistedMobilePrefs> {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_CATEGORY_ID);
      if (raw) {
        memoryPrefs = JSON.parse(raw);
        return memoryPrefs;
      }
      return memoryPrefs;
    }

    const categories = await Notifications.getNotificationCategoriesAsync();
    const match = categories.find((c) => c.identifier === STORAGE_CATEGORY_ID);
    const encoded = match?.actions?.[0]?.buttonTitle;
    if (encoded) {
      const parsed = JSON.parse(encoded) as PersistedMobilePrefs;
      memoryPrefs = parsed;
      return parsed;
    }
  } catch {
    // Fallback to in-memory prefs
  }
  return memoryPrefs;
}

/**
 * Saves mobile session & preferences persistently across app restarts.
 */
export async function savePersistedPrefs(
  partial: Partial<PersistedMobilePrefs>
): Promise<PersistedMobilePrefs> {
  memoryPrefs = {
    ...memoryPrefs,
    ...partial,
  };
  try {
    const serialized = JSON.stringify(memoryPrefs);
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_CATEGORY_ID, serialized);
      return memoryPrefs;
    }

    await Notifications.setNotificationCategoryAsync(STORAGE_CATEGORY_ID, [
      {
        identifier: 'state_payload',
        buttonTitle: serialized,
        options: { opensAppToForeground: false },
      },
    ]);
  } catch {
    // Ignore persistence write error
  }
  return memoryPrefs;
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

function formatFirebaseRestError(code?: string): string {
  switch (code) {
    case 'INVALID_LOGIN_CREDENTIALS':
    case 'INVALID_PASSWORD':
    case 'EMAIL_NOT_FOUND':
      return 'Invalid email or password. If you originally signed up with Google, tap "Sign In with Google" or use "Forgot / Set Password" below.';
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
  const data = await res.json();
  if (!res.ok) {
    throw new Error(formatFirebaseRestError(data?.error?.message));
  }

  const user: MobileAuthUser = {
    uid: data.localId,
    email: data.email || email.trim(),
    displayName: data.displayName || undefined,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
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
  const data = await res.json();
  if (!res.ok) {
    throw new Error(formatFirebaseRestError(data?.error?.message));
  }

  let idToken = data.idToken;
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
        const profileData = await profileRes.json();
        if (profileData.idToken) idToken = profileData.idToken;
      }
    } catch {
      // Ignore optional profile update failure
    }
  }

  const user: MobileAuthUser = {
    uid: data.localId,
    email: data.email || email.trim(),
    displayName: displayName?.trim() || undefined,
    idToken,
    refreshToken: data.refreshToken,
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
  const data = await res.json();
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
    const data = await res.json();
    const updated: MobileAuthUser = {
      ...user,
      idToken: data.id_token || user.idToken,
      refreshToken: data.refresh_token || user.refreshToken,
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
 * Parses a deep link URL (`subshuffle://auth?idToken=...&refreshToken=...`) from the browser handoff.
 */
export async function parseAndSaveAuthDeepLink(url: string): Promise<MobileAuthUser | null> {
  if (!url || !url.includes('auth') || !url.includes('idToken=')) {
    return null;
  }
  try {
    const queryIndex = url.indexOf('?');
    if (queryIndex === -1) return null;
    const params = new URLSearchParams(url.slice(queryIndex + 1));
    const idToken = params.get('idToken');
    const refreshToken = params.get('refreshToken') || '';
    const uid = params.get('uid') || 'user';
    const email = params.get('email') || '';
    const displayName = params.get('displayName') || undefined;
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

