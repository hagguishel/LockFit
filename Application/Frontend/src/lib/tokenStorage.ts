// src/lib/tokenStorage.ts
// ========================
// Gestion sécurisée des tokens avec expo-secure-store
// ========================

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_KEY = 'if_tokens_access';
const REFRESH_KEY = 'if_tokens_refresh';

// ⚠️ IMPORTANT : mêmes options en set/get/delete, sinon la lecture échoue
const STORE_OPTS = Platform.OS === 'ios' ? { keychainService: 'lockfit' } : undefined;

export type StoredTokens = { access: string; refresh?: string | null };

/** Sauvegarde les jetons (refresh optionnel) */
export async function saveTokens(tokens: { access: string; refresh?: string | null }) {
  console.log('💾 [STORAGE] Début sauvegarde tokens...', { hasAccess: !!tokens.access, hasRefresh: !!tokens.refresh });

  // Nettoyage préalable (évite un ancien refresh résiduel)
  await SecureStore.deleteItemAsync(ACCESS_KEY, STORE_OPTS);
  await SecureStore.deleteItemAsync(REFRESH_KEY, STORE_OPTS);

  await SecureStore.setItemAsync(ACCESS_KEY, tokens.access, STORE_OPTS);
  if (tokens.refresh) {
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh, STORE_OPTS);
  }

  const verify = await loadTokens();
  console.log('🔎 [STORAGE] Vérif après écriture:', { access: !!verify?.access, refresh: !!verify?.refresh });

  // Ne bloque pas sur l’absence de refresh : l’access suffit pour être “auth”
  if (!verify?.access) throw new Error("Impossible de vérifier l’access token après écriture");
  console.log('✅ [STORAGE] Tokens vérifiés');
}

/** Lecture des jetons */
export async function loadTokens(): Promise<StoredTokens | null> {
  const access  = await SecureStore.getItemAsync(ACCESS_KEY, STORE_OPTS);
  const refresh = await SecureStore.getItemAsync(REFRESH_KEY, STORE_OPTS);
  if (!access && !refresh) {
    console.log('⚠️ [STORAGE] Tokens manquants:', { hasAccess: false, hasRefresh: false });
    return null;
  }
  return { access: access ?? '', refresh: refresh ?? null };
}

/** Suppression (logout) */
export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY, STORE_OPTS);
  await SecureStore.deleteItemAsync(REFRESH_KEY, STORE_OPTS);
}
