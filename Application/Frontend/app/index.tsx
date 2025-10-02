// Écran d'accueil (premier écran du router)
import { StatusBar } from "expo-status-bar";
import { Text, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() { //export la fonction HomeScreen comme premier écran du router
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <Text style={styles.title}>LockFit</Text>
      <Text style={styles.subtitle}>Front mobile</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>Test!</Text>
      </View>
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
    color: "#E6F0FF",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#98A2B3",
    marginBottom: 16,
    textAlign: "center",
  },
  card: {
    borderWidth: 1,
    borderColor: "#232A3A",
    backgroundColor: "#121927",
    borderRadius: 16,
    padding: 16,
    alignSelf: "center",
    minWidth: "70%",
  },
  cardText: { color: "#E6F0FF", textAlign: "center" },
});
