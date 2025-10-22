// src/lib/tokenStorage.ts
// ========================
// Gestion centralisée du stockage sécurisé des tokens.
// On utilise expo-secure-store qui chiffre les données côté appareil.
// ========================

import * as SecureStore from "expo-secure-store";
import type { Tokens } from "@/types/auth";

const ACCESS_KEY = "if_tokens_access";
const REFRESH_KEY = "if_tokens_refresh";

// Une clé unique pour retrouver nos tokens dans le coffre sécurisé.
// Astuce: préfixez avec le nom de votre app pour éviter les collisions.
const KEY = "lockfit/tokens";

/** Sauvegarde les deux jetons de façon sécurisée. */
export async function saveTokens(tokens: { access: string; refresh: string }) {
  await SecureStore.setItemAsync(ACCESS_KEY, tokens.access, { keychainService: "lockfit" });
  await SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh, { keychainService: "lockfit" });
}

/** Lit les jetons si présents, sinon null. */
export async function loadTokens(): Promise<{ access: string; refresh: string } | null> {
  const access = await SecureStore.getItemAsync(ACCESS_KEY);
  const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
  if (!access || !refresh) return null;
  return { access, refresh };
}

/** Efface les jetons (déconnexion). */
export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
