// app/index.tsx
// ========================
// Point d'entrée principal de l'application LockFit.
// Décide automatiquement si l'utilisateur doit voir l'écran de connexion
// ou être redirigé directement vers l'app connectée (/(tabs)).
// ========================
import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator, Text } from "react-native";
import { loadTokens } from "@/lib/tokenStorage";

export default function Index() {
  // --- 1️⃣ États internes ---

  // "ready" = a-t-on fini de vérifier les tokens ?

  const [ready, setReady] = useState(false);
  // "hasTokens" = résultat de la vérification :
  //   - true  → tokens présents → utilisateur déjà connecté
  //   - false → pas de tokens → aller sur /auth/login

  const [hasTokens, setHasTokens] = useState<boolean | null>(null);

  // --- 2️⃣ Chargement automatique des tokens au démarrage ---
  useEffect(() =>  {
    // On crée une fonction async immédiatement invoquée (IIFE)
    (async () => {
      const tokens = await loadTokens(); // lecture sécurisée dans SecureStore

      // Si access + refresh sont présents → l'utilisateur est "connecté"
      const isConnected = !!tokens?.access && !!tokens?.refresh;
      setHasTokens(isConnected);

      // Marque la vérification comme terminée
      setReady(true);
    })();
  }, []); // tableau vide = ne s'exécute qu'une seule fois, au montage

  // --- 3️⃣ Pendant la vérification, on affiche un loader ---
  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 8}}>
        <ActivityIndicator size="large" color="#00ff88" />
        <Text style={{ color: "#aaa"}}>Chargement de LockFit...</Text>
      </View>
    );
  }

  // --- 4️⃣ Une fois prêt, on redirige ---
  // Redirect agit comme une navigation instantanée vers la route cible.
  // hasTokens ? "/(tabs)" : "/auth/login"
  return <Redirect href="/auth/login" />;
}
