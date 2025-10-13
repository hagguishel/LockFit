// Écran d'accueil (premier écran du router)
import { StatusBar } from "expo-status-bar";
import { Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";

export default function HomeScreen() { //export la fonction HomeScreen comme premier écran du router
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <Text style={styles.title}>LockFit</Text>
      <Text style={styles.subtitle}>Ta clé pour la performance</Text>

      {/*Bouton vers la création de compte*/}
      <Link href ="/auth/creation" asChild>
        <Pressable style={[styles.cta, { marginBottom: 12}]}>
          <Text style={styles.ctaText}>Créer un compte</Text>
        </Pressable>
      </Link>
      
      {/* Bouton → /workouts (ouvre app/workouts/index.tsx) */}
      <Link href="/workouts" asChild>
        <Pressable style={styles.cta}>
          <Text style={styles.ctaText}>→ Voir mes entraînements</Text>
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    backgroundColor: "#0F1420",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#12E29A",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 17,
    color: "#98A2B3",
    marginBottom: 16,
    textAlign: "center",
  
  },
  cardText: { color: "#E6F0FF", textAlign: "center" },

  // Bouton vers /workouts
  cta: {
    backgroundColor: "#12E29A", paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 12, alignSelf: "center",
  },
  ctaText: { color: "#061018", fontWeight: "700" },
});
