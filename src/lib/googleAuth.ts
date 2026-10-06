export type GoogleProfile = {
  email?: string;
  fullName?: string;
};

const GOOGLE_CALLBACK_PATH = '/auth/google/callback';
export const GOOGLE_AUTH_STATE_KEY = 'five_l_google_oauth_state';
export const GOOGLE_PENDING_SIGNUP_KEY = 'five_l_google_pending_signup';

export function createGoogleAuthState() {
  if (window.crypto?.getRandomValues) {
    const randomValues = new Uint32Array(4);
    window.crypto.getRandomValues(randomValues);
    return Array.from(randomValues, (value) => value.toString(36)).join('');
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function getGoogleSafeRedirectHost(hostname: string) {
  const devRedirectHost = (import.meta.env.VITE_GOOGLE_DEV_REDIRECT_HOST || import.meta.env.REACT_APP_GOOGLE_DEV_REDIRECT_HOST)?.trim();
  if (devRedirectHost) {
    return devRedirectHost;
  }

  // Google Cloud Console strictly requires 'localhost' for local development.
  // If the user is on 127.0.0.1, we map it to localhost to match typical console configs.
  if (hostname === '127.0.0.1') {
    return 'localhost';
  }

  return hostname;
}

export function getGoogleRedirectUri() {
  const envRedirectUri = (import.meta.env.VITE_GOOGLE_REDIRECT_URI || import.meta.env.REACT_APP_GOOGLE_REDIRECT_URI)?.trim();
  const generatedRedirectUrl = new URL(GOOGLE_CALLBACK_PATH, window.location.origin);
  generatedRedirectUrl.hostname = getGoogleSafeRedirectHost(generatedRedirectUrl.hostname);
  const generatedUri = generatedRedirectUrl.toString();

  if (envRedirectUri) {
    try {
      const explicitUrl = new URL(envRedirectUri);
      const hasSamePath = explicitUrl.pathname === generatedRedirectUrl.pathname;
      const hasSameOrigin = explicitUrl.origin === generatedRedirectUrl.origin;

      if (!hasSamePath || !hasSameOrigin) {
        console.warn(
          '[GoogleAuth] Environment redirect URI does not match current app origin. Using generated redirect URI instead.',
          { envRedirectUri, generatedUri }
        );
        return generatedUri;
      }

      console.log('[GoogleAuth] Using explicit environment redirect URI:', envRedirectUri);
      return envRedirectUri;
    } catch (error) {
      console.warn('[GoogleAuth] Invalid environment redirect URI format, falling back to generated URI.', envRedirectUri, error);
      return generatedUri;
    }
  }

  console.log('[GoogleAuth] Generated redirect URI:', generatedUri);
  return generatedUri;
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

  try {
    return window.atob(padded);
  } catch {
    return '';
  }
}

export function getGoogleProfileFromHash(hash: string): GoogleProfile {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(fragment);
  const idToken = params.get('id_token');

  if (!idToken) {
    return {};
  }

  const [, payload] = idToken.split('.');
  if (!payload) {
    return {};
  }

  const decoded = base64UrlDecode(payload);
  if (!decoded) {
    return {};
  }

  try {
    const claims = JSON.parse(decoded) as { email?: string; name?: string; given_name?: string };
    return {
      email: claims.email,
      fullName: claims.name || claims.given_name,
    };
  } catch {
    return {};
  }
}
