// Metro choisit automatiquement ce fichier (suffixe .web.ts) plutôt que
// secureStorage.ts quand il bundle pour la plateforme web. expo-secure-store
// n'a aucune implémentation web (module natif vide), donc son appel y
// plantait silencieusement après un login pourtant réussi.
// localStorage n'est PAS un stockage sécurisé — cette variante ne sert qu'au
// preview/dev sur navigateur ; les vraies cibles (Android/iOS) utilisent le
// Keychain/Keystore natif via secureStorage.ts.
const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';

export async function saveAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getAccessToken(): Promise<string | null> {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function clearAuthTokens(): Promise<void> {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
