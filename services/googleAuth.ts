import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { GOOGLE_AUTH_CONFIG } from '@/services/api/config';
import { authApi } from '@/services/api/auth';

WebBrowser.maybeCompleteAuthSession();

export type GoogleSignInResult = {
  idToken?: string;
  code?: string;
  redirectUri?: string;
};

/** HTTPS redirect — Google Web OAuth client CHỈ chấp nhận http/https (không nhận exp:// hay rork-app://). */
export const GOOGLE_HTTPS_REDIRECT_URI =
  process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI?.trim() ||
  'https://phhotel.vn/assets/oauth/google-mobile.html';

type PendingOAuth = {
  resolve: (result: GoogleSignInResult) => void;
  reject: (error: Error) => void;
  redirectUri: string;
};

let pendingOAuth: PendingOAuth | null = null;
let linkingSubscribed = false;

function resolveClientIds(serverClientId?: string) {
  const webClientId = GOOGLE_AUTH_CONFIG.webClientId || serverClientId || '';
  return {
    webClientId,
    iosClientId: GOOGLE_AUTH_CONFIG.iosClientId || webClientId,
    androidClientId: GOOGLE_AUTH_CONFIG.androidClientId || webClientId,
  };
}

/**
 * Redirect URI cho Google OAuth.
 * - Web: localhost / site origin
 * - Mobile (Expo Go / native): HTTPS trên phhotel.vn (Google không cho custom scheme trên Web client)
 */
export function getGoogleRedirectUri(): string {
  if (Platform.OS === 'web') {
    return AuthSession.makeRedirectUri({
      scheme: 'rork-app',
      path: 'oauthredirect',
    });
  }
  return GOOGLE_HTTPS_REDIRECT_URI;
}

function resolveOAuthClientId(clients: ReturnType<typeof resolveClientIds>): string {
  if (clients.webClientId) return clients.webClientId;
  if (Platform.OS === 'ios' && clients.iosClientId) return clients.iosClientId;
  if (Platform.OS === 'android' && clients.androidClientId) return clients.androidClientId;
  return '';
}

function readQueryParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Parse code / id_token từ HTTPS redirect hoặc rork-app://oauthredirect */
export function parseGoogleOAuthCallbackUrl(url: string): GoogleSignInResult | null {
  if (!url) return null;

  const isCallback =
    url.includes('oauthredirect') ||
    url.includes('/assets/oauth/google-mobile.html') ||
    url.includes('google-mobile.html?');

  if (!isCallback) return null;

  const parsed = Linking.parse(url);
  const code = readQueryParam(parsed.queryParams?.code as string | string[] | undefined);
  const idToken = readQueryParam(parsed.queryParams?.id_token as string | string[] | undefined);

  if (code || idToken) {
    return { code, idToken, redirectUri: GOOGLE_HTTPS_REDIRECT_URI };
  }

  const hashToken = url.match(/[#&]id_token=([^&]+)/)?.[1];
  if (hashToken) {
    return { idToken: decodeURIComponent(hashToken), redirectUri: GOOGLE_HTTPS_REDIRECT_URI };
  }

  return null;
}

export function tryCompletePendingGoogleOAuth(url: string): boolean {
  const parsed = parseGoogleOAuthCallbackUrl(url);
  if (!parsed || !pendingOAuth) return false;

  pendingOAuth.resolve(parsed);
  pendingOAuth = null;
  void WebBrowser.dismissBrowser();
  return true;
}

function ensureGoogleOAuthLinkingListener() {
  if (linkingSubscribed || Platform.OS === 'web') return;
  linkingSubscribed = true;

  Linking.addEventListener('url', ({ url }) => {
    tryCompletePendingGoogleOAuth(url);
  });

  void Linking.getInitialURL().then((url) => {
    if (url) tryCompletePendingGoogleOAuth(url);
  });
}

function waitForOAuthDeepLink(redirectUri: string, timeoutMs = 120_000): Promise<GoogleSignInResult> {
  return new Promise((resolve, reject) => {
    pendingOAuth = { resolve, reject, redirectUri };
    setTimeout(() => {
      if (!pendingOAuth) return;
      pendingOAuth.reject(new Error('CANCELLED'));
      pendingOAuth = null;
    }, timeoutMs);
  });
}

function resultFromAuthSession(
  result: AuthSession.AuthSessionResult,
  redirectUri: string
): GoogleSignInResult | null {
  if (result.type !== 'success') return null;

  if (result.url) {
    const fromUrl = parseGoogleOAuthCallbackUrl(result.url);
    if (fromUrl) return fromUrl;
  }

  const code = readQueryParam((result.params as { code?: string | string[] }).code);
  const idToken =
    readQueryParam((result.params as { id_token?: string | string[] }).id_token) ||
    (result as { authentication?: { idToken?: string } }).authentication?.idToken;

  if (code) return { code, redirectUri };
  if (idToken) return { idToken, redirectUri };
  return null;
}

async function loadGoogleConfig() {
  if (GOOGLE_AUTH_CONFIG.webClientId) {
    return { enabled: true, clientId: GOOGLE_AUTH_CONFIG.webClientId };
  }
  return authApi.getGoogleConfig();
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  ensureGoogleOAuthLinkingListener();

  const remote = await loadGoogleConfig();
  const clients = resolveClientIds(remote.clientId);

  if (!remote.enabled && !clients.webClientId && !clients.iosClientId && !clients.androidClientId) {
    throw new Error(
      Platform.OS === 'web'
        ? 'Google Sign-In is not configured'
        : 'Đăng nhập Google chưa được cấu hình'
    );
  }

  const clientId = resolveOAuthClientId(clients);
  if (!clientId) {
    throw new Error(
      Platform.OS === 'web'
        ? 'Missing Google Web Client ID'
        : 'Thiếu EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (OAuth type Web application)'
    );
  }

  const redirectUri = getGoogleRedirectUri();
  const useAuthCodeFlow = Platform.OS === 'ios' || Platform.OS === 'android';

  if (__DEV__) {
    console.info('[GoogleAuth] redirectUri → thêm vào Google Cloud Web client → Authorized redirect URIs:', redirectUri);
    console.info('[GoogleAuth] clientId:', clientId);
  }

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    responseType: useAuthCodeFlow
      ? AuthSession.ResponseType.Code
      : AuthSession.ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email'],
    usePKCE: false,
    ...(useAuthCodeFlow
      ? {}
      : {
          extraParams: {
            nonce: Math.random().toString(36).slice(2),
          },
        }),
  });

  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  };

  const deepLinkWait = useAuthCodeFlow ? waitForOAuthDeepLink(redirectUri) : null;

  try {
    const promptPromise = request.promptAsync(discovery, {
      showInRecents: true,
      ...(Platform.OS === 'android' ? { createTask: false } : {}),
    });

    const promptResult = deepLinkWait
      ? await Promise.race([
          promptPromise.then((result) => ({ source: 'prompt' as const, result })),
          deepLinkWait.then((payload) => ({ source: 'deeplink' as const, payload })),
        ])
      : { source: 'prompt' as const, result: await promptPromise };

    if (promptResult.source === 'deeplink') {
      return promptResult.payload;
    }

    const result = promptResult.result;

    if (result.type === 'dismiss' || result.type === 'cancel') {
      throw new Error('CANCELLED');
    }

    if (result.type !== 'success') {
      throw new Error('Đăng nhập Google thất bại');
    }

    const parsed = resultFromAuthSession(result, redirectUri);
    if (!parsed?.code && !parsed?.idToken) {
      throw new Error(useAuthCodeFlow ? 'Không nhận được mã Google' : 'Không nhận được token Google');
    }

    return parsed;
  } finally {
    pendingOAuth = null;
  }
}

export function useGoogleAuthRequest(serverClientId?: string) {
  const clients = resolveClientIds(serverClientId);
  return Google.useIdTokenAuthRequest({
    clientId: clients.webClientId || undefined,
    iosClientId: clients.iosClientId || undefined,
    androidClientId: clients.androidClientId || undefined,
    webClientId: clients.webClientId || undefined,
    redirectUri: getGoogleRedirectUri(),
  });
}

ensureGoogleOAuthLinkingListener();
