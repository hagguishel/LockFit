//Fichier qui sert à la création de l'entrainement


import { useState } from "react"; // Hooks React pour gérer l'état (title, saving)
import { Alert, StyleSheet, Text, View, TextInput, Pressable } from "react-native"; // Composant de l'UI
import { SafeAreaView } from "react-native-safe-area-context"; // Gère seul les zones "safe"
import { Stack, useRouter } from "expo-router"; // Header + navigation
import { createWorkout } from "../../src/lib/workouts";    // Client API: POST /workouts

export default function NewWorkoutScreen() {
  const router = useRouter();  //Hook navigation (Expo Router)
  const [title, setTitle] = useState(""); // Champ nom de la séance
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => { // Fonction appelée au clic de "Créer"
    const trimmed = title.trim(); // Enlève espaces inutiles

    if (!trimmed) {
      Alert.alert("Titre requis", "Merci d'indiquer un titre pour votre entraînement.");
      return;
    }
    if (trimmed.length > 50) {
      Alert.alert("50 caractères maximum.");
      return;
    }

    try {
      setSaving(true); //Désactive l'UI, en évitant les double clics
      // ⬇️ On récupère l'objet créé (avec son id)
      const w = await createWorkout({ title: trimmed });
      if (!w || !w.id) {
        Alert.alert("Erreur",  "Réponse inattenduedu serveur (création sans id)");
        return;
      }
      setTitle(""); // Option: vider le champ
      Alert.alert("Entraînement créé ✅", `Nom : "${trimmed}"`, [ //Feedback utilisateur (succès)
        { text: "OK", onPress: () => router.replace(`/workouts/${w.id}`) }, //Puis on redirige ver l'autre écran
      ]);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de créer la séance."); //Gére erreur si jamais problèeme lors du back
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Créer un entraînement" }} />

      <View style={styles.card}>
        <Text style={styles.label}>Nom de la séance</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ex : Push Day, Pull Day, Legs…"
          placeholderTextColor="#6B7280"
          style={styles.input}
          maxLength={50}
          returnKeyType="done"
          onSubmitEditing={handleCreate}
        />

        <Pressable style={[styles.cta, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
          <Text style={styles.ctaText}>{saving ? "Enregistrement…" : "Créer"}</Text>
        </Pressable>

        <Pressable style={styles.secondary} onPress={() => router.back()} disabled={saving}>
          <Text style={styles.secondaryText}>Annuler</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1420", padding: 16 },
  card: {
    borderWidth: 1, borderColor: "#232A3A", backgroundColor: "#121927",
    borderRadius: 16, padding: 16, gap: 12,
  },
  label: { color: "#12E29A", fontWeight: "600", marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: "#232A3A", backgroundColor: "#0F1420",
    color: "#E6F0FF", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  cta: { backgroundColor: "#12E29A", paddingVertical: 12, borderRadius: 12, alignItems: "center", marginTop: 8 },
  ctaText: { color: "#061018", fontWeight: "700" },
  secondary: { paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  secondaryText: { color: "#98A2B3", fontWeight: "600" },
});
