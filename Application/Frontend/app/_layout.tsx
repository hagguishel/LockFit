// app/_layout.tsx - VERSION AMÉLIORÉE
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Slot, usePathname, useRouter, useSegments } from "expo-router";
import { loadTokens } from "@/lib/tokenStorage";

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  // Vérifie les tokens à chaque changement de route
  useEffect(() => {
    checkAuth();
  }, [segments]); // segments change à chaque navigation

  async function checkAuth() {
    try {
      const t = await loadTokens();
      const hasAuth = !!t?.access && !!t?.refresh;
      console.log("🔐 [AUTH] Check auth:", { hasAuth, segments: segments.join("/") });
      setIsAuthed(hasAuth);
    } catch (e) {
      console.error("❌ [AUTH] Erreur chargement tokens:", e);
      setIsAuthed(false);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (checking) return; // Attend la fin du check initial

    const inAuthGroup = segments[0] === "auth";

    if (!isAuthed && !inAuthGroup) {
      // Pas authentifié et pas dans /auth -> redirige vers login
      console.log("🔐 [AUTH] Non authentifié, redirection vers login");
      router.replace("/auth/login");
    } else if (isAuthed && inAuthGroup) {
      // Authentifié mais encore dans /auth -> redirige vers l'app
      console.log("🔐 [AUTH] Authentifié, redirection vers (tabs)");
      router.replace("/(tabs)");
    }
  }, [isAuthed, checking, segments]);

  // Petit écran d'attente au boot
  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0b0b1a" }}>
        <ActivityIndicator size="large" color="#00ff88" />
      </View>
    );
  }

  return <Slot />;
}