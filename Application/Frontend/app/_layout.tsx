// app/_layout.tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Slot, usePathname, Redirect } from "expo-router";
import { loadTokens } from "@/lib/tokenStorage";

export default function RootLayout() {
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await loadTokens();
      setIsAuthed(!!t?.access && !!t?.refresh);
      setChecking(false);
    })();
  }, [pathname]); // re-check simple quand on navigue

  // Laisse toujours passer la zone d'auth
  if (pathname?.startsWith("/auth")) {
    return <Slot />;
  }

  // Petit écran d'attente au boot
  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  // Pas de session -> on pousse vers /auth/login
  if (!isAuthed) {
    return <Redirect href="/auth/login" />;
  }

  // Session présente -> on rend l'app
  return <Slot />;
}
