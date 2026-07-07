import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';
// Clé privée Ed25519 générée par CET appareil pour signer les QR de session
// qu'il ouvre — ne quitte jamais l'appareil (symétrique à la clé privée de
// l'école, qui elle ne quitte jamais le backend). Voir sessionSigning.ts.
const DEVICE_SIGNING_PRIVATE_KEY = 'device.signingPrivateKey';

export async function saveAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearAuthTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function getDeviceSigningPrivateKey(): Promise<string | null> {
  return SecureStore.getItemAsync(DEVICE_SIGNING_PRIVATE_KEY);
}

export async function saveDeviceSigningPrivateKey(privateKeyHex: string): Promise<void> {
  await SecureStore.setItemAsync(DEVICE_SIGNING_PRIVATE_KEY, privateKeyHex);
}

export type AccessTokenPayload = {
  userId: string;
  username: string;
  role: 'ADMIN' | 'DIRECTION' | 'ENSEIGNANT' | 'SURVEILLANT' | 'PARENT' | 'ELEVE';
  schoolId: string | null;
  studentId: string | null;
};

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

// Décodage local du payload, sans vérification de signature : usage
// display-only (Profil), jamais pour une décision d'autorisation (le backend
// reste seul juge de la validité du token sur chaque appel API).
export async function getDecodedAccessToken(): Promise<AccessTokenPayload | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const payloadSegment = token.split('.')[1];
  if (!payloadSegment) return null;

  const payload = JSON.parse(base64UrlDecode(payloadSegment));
  return {
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
    schoolId: payload.schoolId ?? null,
    studentId: payload.studentId ?? null,
  };
}
