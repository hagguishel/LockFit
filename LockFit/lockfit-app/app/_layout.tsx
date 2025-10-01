//Fichier qui montre l'apparence globale de l'application. Après le lancement du router, c'est lui qui prend le relais.

import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <StatusBar style="light" />
            {/* On crée un Stack (pile d'écrans) avec ScreenOptions: style par défaut de tous les écrans de ce layout */}
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: "#0F1420" },
                    headerTintColor: "#E6F0FF",
                    contentStyle: { backgroundColor: "#0F1420" },
                    headerTitle: "LockFit",
                }}
            />
        </SafeAreaProvider>
    );
}