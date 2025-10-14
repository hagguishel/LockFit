import { StatusBar } from "expo-status-bar";
import { Text, StyleSheet, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <Text style={styles.title}>LockFit</Text>
      <Text style={styles.subtitle}>Ta clé pour la performance</Text>

      <View style={styles.buttons}>
        {/* Link 1 */}
        <Link href="/auth/creation" asChild>
          <Pressable style={styles.cta} accessibilityRole="button">
            <Text style={styles.ctaText}>Créer un compte</Text>
          </Pressable>
        </Link>

        {/* Link 2 */}
        <Link href="/workouts" asChild>
          <Pressable style={styles.cta} accessibilityRole="button">
            <Text style={styles.ctaText}>→ Voir mes entraînements</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, padding: 16, justifyContent: "center", backgroundColor: "#0F1420",
  },
  title: {
    fontSize: 28, fontWeight: "700", color: "#12E29A", marginBottom: 6, textAlign: "center",
  },
  subtitle: {
    fontSize: 17, color: "#98A2B3", marginBottom: 20, textAlign: "center",
  },
  buttons: {
    alignSelf: "stretch",
    paddingHorizontal: 16,
    gap: 12,                // espace vertical entre les boutons
  },
  cta: {
    backgroundColor: "#12E29A",
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",   // centre le texte dans le bouton
  },
  ctaText: { color: "#061018", fontWeight: "700" },
});