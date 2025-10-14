//Fichier qui montre l'apparence globale de l'application. Après le lancement du router, c'est lui qui prend le relais.

// app/_layout.tsx — layout global de l’app
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Branche avec la tab bar */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Écrans hors tabs (pas de barre en bas) */}
        <Stack.Screen name="auth/creation" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
