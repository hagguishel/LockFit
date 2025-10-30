import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { createWorkout } from "@/lib/workouts";
import { listExercises } from "@/lib/exercises";

// Représente un exercice que l'utilisateur a ajouté au brouillon avant d'envoyer au backend
type TempExercise = {
  id: string;          // id local uniquement pour l'UI/FlatList
  exerciseId: string;  // ID backend réel (Exercise.id en base)
  name: string;        // affichage
  setsCount: number;   // combien de séries prévues
  repsTarget: number;  // combien de reps par série
};

export default function NewWorkoutScreen() {
  const router = useRouter();

  // Titre de la séance
  const [title, setTitle] = useState("");

  // Exercices en brouillon pour cette séance
  const [exercises, setExercises] = useState<TempExercise[]>([]);

  // Loading pour la création (POST /workouts)
  const [saving, setSaving] = useState(false);

  // Loading pour l'ajout d'un exercice (GET /exercises)
  const [fetchingExercise, setFetchingExercise] = useState(false);

  // Ajoute un exercice depuis la base (en prenant le premier dispo pour le moment)
  async function handleAddExerciseFromBackend() {
    try {
      setFetchingExercise(true);

      // 1. Appel API GET /exercises
      const available = await listExercises();
      console.log("[new.tsx] 📚 exercices dispo:", available);

      if (!available || available.length === 0) {
        Alert.alert(
          "Pas d'exercice",
          "Aucun exercice trouvé côté serveur."
        );
        return;
      }

      // 2. MVP : on prend le premier exo renvoyé par le backend
      //    (plus tard tu pourras ouvrir un sélecteur pour choisir)
      const picked = available[0];

      const newExercise: TempExercise = {
        id: Math.random().toString(36).slice(2), // juste pour le rendu local
        exerciseId: picked.id,                  // <-- ID RÉEL du backend
        name: picked.name,
        setsCount: 3,
        repsTarget: 10,
      };

      console.log("[new.tsx] ➕ Ajout exercise temp:", newExercise);

      setExercises((curr) => [...curr, newExercise]);
    } catch (err: any) {
      console.log("[new.tsx] 💥 ERREUR listExercises():", err);
      Alert.alert(
        "Erreur",
        err?.message || "Impossible de récupérer les exercices."
      );
    } finally {
      setFetchingExercise(false);
    }
  }

  // Supprime un exercice du brouillon avant envoi
  function handleRemoveExercise(id: string) {
    console.log("[new.tsx] ❌ Suppression exercise temp id =", id);
    setExercises((curr) => curr.filter((e) => e.id !== id));
  }

  // Envoi final : POST /workouts
  async function handleCreate() {
    const trimmed = title.trim();

    // Validation simple
    if (!trimmed) {
      Alert.alert(
        "Titre requis",
        "Merci d'indiquer un titre pour votre entraînement."
      );
      return;
    }

    if (trimmed.length > 50) {
      Alert.alert("Titre trop long", "50 caractères maximum.");
      return;
    }

    if (exercises.length === 0) {
      Alert.alert(
        "Aucun exercice",
        "Ajoute au moins un exercice avant de créer la séance."
      );
      return;
    }

    try {
      setSaving(true);

      // On construit le payload pour le backend NestJS
      const payload = {
        title: trimmed,
        items: exercises.map((ex, index) => {
          // Génère "setsCount" séries identiques { reps: repsTarget }
          const generatedSets = Array.from(
            { length: ex.setsCount },
            () => ({ reps: ex.repsTarget })
          );

          return {
            order: index + 1,          // 🔥 IMPORTANT : le backend veut 1,2,3... pas 0,1,2
            exerciseId: ex.exerciseId, // 🔥 IMPORTANT : ID réel de Exercise en base
            sets: generatedSets,       // ex: [{ reps:10 }, { reps:10 }, { reps:10 }]
          };
        }),
      };

      console.log("[new.tsx] 🚀 Payload envoyé à createWorkout:", payload);

      // Appel API -> POST /workouts
      const w = await createWorkout(payload);

      console.log("[new.tsx] ✅ Réponse createWorkout:", w);

      if (!w?.id) {
        Alert.alert(
          "Erreur",
          "Réponse inattendue du serveur (création sans id)."
        );
        return;
      }

      // Reset du formulaire local
      setTitle("");
      setExercises([]);

      // Redirection vers l'écran détail du workout créé
      router.replace(`/workouts/${w.id}`);
    } catch (e: any) {
      console.log("[new.tsx] 💥 ERREUR createWorkout:", e);
      Alert.alert(
        "Erreur",
        e?.message || "Impossible de créer la séance."
      );
    } finally {
      setSaving(false);
    }
  }

  // Rendu d'une ligne d'exercice dans la liste locale
  function renderExerciseRow({ item }: { item: TempExercise }) {
    return (
      <View style={s.exerciseRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.exerciseName}>{item.name}</Text>
          <Text style={s.exerciseMeta}>
            {item.setsCount} x {item.repsTarget} reps
          </Text>

          {/* debug : afficher l'ID backend pour vérifier qu'on envoie bien le bon */}
          <Text style={s.exerciseIdDebug}>{item.exerciseId}</Text>
        </View>

        <Pressable
          style={s.removeBtn}
          onPress={() => handleRemoveExercise(item.id)}
          disabled={saving}
        >
          <Text style={s.removeBtnText}>Suppr</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <Stack.Screen
        options={{
          title: "Nouvelle séance",
          headerShown: true,
          headerStyle: {
            backgroundColor: "#0F1420",
          },
          headerTintColor: "#E6F0FF",
          headerTitleStyle: {
            fontWeight: "700",
          },
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <View style={s.card}>
          {/* Titre de la séance */}
          <Text style={s.label}>Nom de la séance</Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ex : Push Day, Pull Day, Legs…"
            placeholderTextColor="#6B7280"
            style={s.input}
            maxLength={50}
            returnKeyType="done"
            editable={!saving}
          />

          {/* Liste des exercices ajoutés */}
          <Text style={s.label}>Exercices ({exercises.length})</Text>

          {exercises.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>
                Aucun exercice pour l'instant.
              </Text>
            </View>
          ) : (
            <View style={s.exerciseListBox}>
              <FlatList
                data={exercises}
                keyExtractor={(item) => item.id}
                renderItem={renderExerciseRow}
              />
            </View>
          )}

          {/* Bouton "Ajouter exercice" */}
          <Pressable
            style={[
              s.addExerciseBtn,
              (saving || fetchingExercise) && { opacity: 0.6 },
            ]}
            onPress={handleAddExerciseFromBackend}
            disabled={saving || fetchingExercise}
          >
            <Text style={s.addExerciseIcon}>
              {fetchingExercise ? "…" : "＋"}
            </Text>
            <Text style={s.addExerciseText}>
              {fetchingExercise ? "Chargement..." : "Ajouter exercice"}
            </Text>
          </Pressable>

          {/* Bouton créer la séance */}
          <Pressable
            style={[s.cta, saving && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#061018" />
            ) : (
              <Text style={s.ctaText}>CRÉER LA SÉANCE</Text>
            )}
          </Pressable>

          {/* Annuler */}
          <Pressable
            style={s.secondary}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={s.secondaryText}>Annuler</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1420",
    paddingHorizontal: 16,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#232A3A",
    backgroundColor: "#121927",
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: "#E6F0FF",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#232A3A",
    backgroundColor: "#0F1420",
    color: "#E6F0FF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: "#232A3A",
    backgroundColor: "#0F1420",
    borderRadius: 12,
    padding: 16,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
  },
  exerciseListBox: {
    borderWidth: 1,
    borderColor: "#232A3A",
    backgroundColor: "#0F1420",
    borderRadius: 12,
    maxHeight: 200,
  },
  exerciseRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#232A3A",
    alignItems: "center",
  },
  exerciseName: {
    color: "#E6F0FF",
    fontSize: 15,
    fontWeight: "600",
  },
  exerciseMeta: {
    color: "#98A2B3",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  exerciseIdDebug: {
    color: "#475569",
    fontSize: 11,
    marginTop: 2,
  },
  removeBtn: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#2A3448",
    borderRadius: 8,
  },
  removeBtnText: {
    color: "#FF6B6B",
    fontWeight: "600",
    fontSize: 12,
  },
  addExerciseBtn: {
    borderWidth: 1,
    borderColor: "#12E29A",
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  addExerciseIcon: {
    color: "#12E29A",
    fontWeight: "700",
    fontSize: 16,
    lineHeight: 16,
    marginRight: 6,
  },
  addExerciseText: {
    color: "#12E29A",
    fontWeight: "600",
    fontSize: 15,
  },
  cta: {
    backgroundColor: "#12E29A",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  ctaText: {
    color: "#061018",
    fontWeight: "700",
    fontSize: 15,
    lineHeight: 18,
  },
  secondary: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryText: {
    color: "#98A2B3",
    fontWeight: "600",
    fontSize: 14,
  },
});
