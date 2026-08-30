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

  clientId?: string;

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



type ClientIds = {

  webClientId: string;

  iosClientId: string;

  androidClientId: string;

};



let pendingOAuth: PendingOAuth | null = null;

let linkingSubscribed = false;



function resolveClientIds(serverClientId?: string, serverIosClientId?: string, serverAndroidClientId?: string): ClientIds {

  const webClientId = GOOGLE_AUTH_CONFIG.webClientId || serverClientId || '';

  return {

    webClientId,

    iosClientId: GOOGLE_AUTH_CONFIG.iosClientId || serverIosClientId || webClientId,

    androidClientId: GOOGLE_AUTH_CONFIG.androidClientId || serverAndroidClientId || webClientId,

  };

}



/** iOS native OAuth scheme: com.googleusercontent.apps.{clientIdPrefix} */

export function getIosUrlScheme(iosClientId: string): string {

  const clientIdPart = iosClientId.replace('.apps.googleusercontent.com', '');

  return `com.googleusercontent.apps.${clientIdPart}`;

}



function useNativeIosGoogleFlow(iosClientId?: string): boolean {

  return Platform.OS === 'ios' && !!iosClientId && iosClientId.includes('.apps.googleusercontent.com');

}



/**

 * Redirect URI cho Google OAuth.

 * - iOS production: native scheme (ASWebAuthenticationSession quay thẳng vào app)

 * - Android / fallback: HTTPS phhotel.vn → rork-app:// deep link

 */

export function getGoogleRedirectUri(clients?: Pick<ClientIds, 'iosClientId'>): string {

  if (Platform.OS === 'web') {

    return AuthSession.makeRedirectUri({

      scheme: 'rork-app',

      path: 'oauthredirect',

    });

  }



  if (useNativeIosGoogleFlow(clients?.iosClientId)) {

    return `${getIosUrlScheme(clients!.iosClientId)}:/oauthredirect`;

  }



  return GOOGLE_HTTPS_REDIRECT_URI;

}



function resolveOAuthClientId(clients: ClientIds): string {

  if (Platform.OS === 'ios' && clients.iosClientId) return clients.iosClientId;

  if (Platform.OS === 'android' && clients.androidClientId) return clients.androidClientId;

  if (clients.webClientId) return clients.webClientId;

  return '';

}



function readQueryParam(value: string | string[] | undefined): string | undefined {

  if (Array.isArray(value)) return value[0];

  return value;

}



/** Parse code / id_token từ HTTPS redirect, native scheme hoặc rork-app://oauthredirect */

export function parseGoogleOAuthCallbackUrl(url: string): GoogleSignInResult | null {

  if (!url) return null;



  const isCallback =

    url.includes('oauthredirect') ||

    url.includes('/assets/oauth/google-mobile.html') ||

    url.includes('google-mobile.html?') ||

    url.includes('com.googleusercontent.apps.');



  if (!isCallback) return null;



  const parsed = Linking.parse(url);

  const code = readQueryParam(parsed.queryParams?.code as string | string[] | undefined);

  const idToken = readQueryParam(parsed.queryParams?.id_token as string | string[] | undefined);



  const redirectUri = url.includes('com.googleusercontent.apps.')

    ? `${url.split('?')[0].split('#')[0]}`

    : GOOGLE_HTTPS_REDIRECT_URI;



  if (code || idToken) {

    return { code, idToken, redirectUri };

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

  redirectUri: string,

  clientId?: string

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



  if (code) return { code, redirectUri, clientId };

  if (idToken) return { idToken, redirectUri, clientId };

  return null;

}



async function loadGoogleConfig() {

  if (GOOGLE_AUTH_CONFIG.webClientId && GOOGLE_AUTH_CONFIG.iosClientId) {

    return {

      enabled: true,

      clientId: GOOGLE_AUTH_CONFIG.webClientId,

      iosClientId: GOOGLE_AUTH_CONFIG.iosClientId,

      androidClientId: GOOGLE_AUTH_CONFIG.androidClientId,

    };

  }

  return authApi.getGoogleConfig();

}



export async function signInWithGoogle(): Promise<GoogleSignInResult> {

  ensureGoogleOAuthLinkingListener();



  const remote = await loadGoogleConfig();

  const clients = resolveClientIds(remote.clientId, remote.iosClientId, remote.androidClientId);



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

        : 'Thiếu Google Client ID (EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID / WEB)'

    );

  }



  const redirectUri = getGoogleRedirectUri(clients);

  const useAuthCodeFlow = Platform.OS === 'ios' || Platform.OS === 'android';

  const useHttpsBridge = redirectUri.startsWith('https://');



  if (__DEV__) {

    console.info('[GoogleAuth] platform:', Platform.OS);

    console.info('[GoogleAuth] clientId:', clientId);

    console.info('[GoogleAuth] redirectUri:', redirectUri);

    console.info('[GoogleAuth] flow:', useNativeIosGoogleFlow(clients.iosClientId) ? 'ios-native' : useHttpsBridge ? 'https-bridge' : 'web');

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



  const deepLinkWait = useHttpsBridge && useAuthCodeFlow ? waitForOAuthDeepLink(redirectUri) : null;



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

      return { ...promptResult.payload, clientId };

    }



    const result = promptResult.result;



    if (result.type === 'dismiss' || result.type === 'cancel') {

      // iOS đóng browser trước khi deep link kịp về app (đặc biệt build App Store + HTTPS bridge)

      if (useHttpsBridge && useAuthCodeFlow) {

        try {

          return await waitForOAuthDeepLink(redirectUri, 25_000);

        } catch {

          throw new Error('CANCELLED');

        }

      }

      throw new Error('CANCELLED');

    }



    if (result.type !== 'success') {

      throw new Error('Đăng nhập Google thất bại');

    }



    const parsed = resultFromAuthSession(result, redirectUri, clientId);

    if (!parsed?.code && !parsed?.idToken) {

      throw new Error(useAuthCodeFlow ? 'Không nhận được mã Google' : 'Không nhận được token Google');

    }



    return { ...parsed, clientId };

  } finally {

  }

}



export function useGoogleAuthRequest(serverClientId?: string) {

  const clients = resolveClientIds(serverClientId);

  return Google.useIdTokenAuthRequest({

    clientId: clients.webClientId || undefined,

    iosClientId: clients.iosClientId || undefined,

    androidClientId: clients.androidClientId || undefined,

    webClientId: clients.webClientId || undefined,

    redirectUri: getGoogleRedirectUri(clients),

  });

}



ensureGoogleOAuthLinkingListener();


