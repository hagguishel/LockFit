// Écran détail d'un entraînement
// Fichier : app/(tabs)/workouts/[id].tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

// à ajouter dans ton lib/workouts.ts
// getWorkout(id): GET /workouts/:id -> Workout
// type Workout déjà exporté
import { getWorkout, type Workout } from "@/lib/workouts";

/* -------------------------------------------------
   Helpers affichage / calcul
   ------------------------------------------------- */

function computeTotalSets(workout: Workout | null): number {
  if (!workout?.items) return 0;
  return workout.items.reduce((acc, item) => {
    const n = Array.isArray(item?.sets) ? item.sets.length : 0;
    return acc + n;
  }, 0);
}

function computeProgressRatio(workout: Workout | null): number {
  return workout?.finishedAt ? 1 : 0;
}

/* -------------------------------------------------
   Composant principal : WorkoutDetailScreen
   ------------------------------------------------- */

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // charge l'entraînement par ID
  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      setLoading(true);
      const w = await getWorkout(id);
      setWorkout(w);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger l'entraînement");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const s = styles;

  // Infos calculées
  const totalSets = useMemo(() => computeTotalSets(workout), [workout]);
  const progressRatio = useMemo(
    () => computeProgressRatio(workout),
    [workout]
  );
  const isDone = progressRatio === 1;

  // Rendu de CHAQUE exercice dans la FlatList
  const renderExercise = useCallback(({ item, index }: { item: any; index: number }) => {
    return (
      <View style={s.exerciseCard}>
        {/* nom de l'exercice */}
        <Text style={s.exerciseName}>
          {index + 1}. {item.exerciseName || "Exercice"}
        </Text>

        {/* séries */}
        {Array.isArray(item.sets) && item.sets.length > 0 ? (
          <View style={s.setsContainer}>
            {item.sets.map((set: any, i: number) => (
              <View key={i} style={s.setRow}>
                <Text style={s.setIndex}>S{i + 1}</Text>

                <Text style={s.setDetail}>
                  {set.reps ?? "?"} reps
                  {typeof set.weight === "number"
                    ? ` @ ${set.weight}kg`
                    : ""}
                </Text>

                <Text style={s.setRest}>
                  {typeof set.rest === "number"
                    ? `${set.rest}s repos`
                    : "repos ?"}
                </Text>

                {/* état (si on veut marquer terminé plus tard) */}
                {set.done ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#12E29A"
                  />
                ) : (
                  <Ionicons
                    name="radio-button-off"
                    size={18}
                    color="#98A2B3"
                  />
                )}
              </View>
            ))}
          </View>
        ) : (
          <Text style={s.noSets}>Aucune série définie</Text>
        )}
      </View>
    );
  }, []);

  /* -------------------------------------------------
     Rendu principal de l'écran
     ------------------------------------------------- */

  // 1. état chargement
  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={["top", "bottom"]}>
        <HeaderBar title="Détail entraînement" onBack={() => router.back()} />
        <View style={s.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  // 2. état erreur
  if (error || !workout) {
    return (
      <SafeAreaView style={s.container} edges={["top", "bottom"]}>
        <HeaderBar title="Détail entraînement" onBack={() => router.back()} />

        <View style={s.errorCard}>
          <Text style={s.errorText}>{error || "Workout introuvable"}</Text>

          <Pressable style={s.reloadBtn} onPress={load}>
            <Text style={s.reloadBtnText}>Réessayer</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // 3. état normal
  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      {/* HEADER haut avec retour */}
      <HeaderBar
        title={workout.title || "Sans nom"}
        onBack={() => router.back()}
      />

      {/* petit résumé */}
      <View style={s.summaryCard}>
        <View style={{ flex: 1 }}>
          {isDone ? (
            <Text style={[s.statusText, { color: "#12E29A" }]}>
              Terminé ✅
            </Text>
          ) : (
            <Text style={s.statusText}>Planifié / En cours</Text>
          )}

          <Text style={s.metaText}>
            {totalSets} séries
          </Text>
        </View>

        {/* bouton COMMENCER / TERMINÉ */}
        <Pressable
          style={[s.bigActionBtn, isDone && s.bigActionBtnDone]}
          onPress={() => {
            // plus tard : lancer la session live / marquer terminé
            console.log("start / continue workout", workout.id);
          }}
        >
          <Text
            style={[
              s.bigActionBtnText,
              isDone && s.bigActionBtnTextDone,
            ]}
          >
            {isDone ? "TERMINÉ" : "COMMENCER"}
          </Text>
        </Pressable>
      </View>

      {/* Liste des exos */}
      <Text style={s.sectionTitle}>Exercices</Text>

      <FlatList
        data={workout.items ?? []}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ gap: 12, paddingBottom: 64 }}
        renderItem={renderExercise}
        ListEmptyComponent={
          <View style={s.emptyExercises}>
            <Text style={s.emptyExercisesText}>
              Aucun exercice dans cet entraînement
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

/* -------------------------------------------------
   HeaderBar : barre haut avec bouton retour
   ------------------------------------------------- */
function HeaderBar({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backBtn} onPress={onBack}>
        <Ionicons name="chevron-back" size={20} color="#E6F0FF" />
      </Pressable>

      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>

      {/* placeholder pour aligner visuellement le titre au centre */}
      <View style={{ width: 32 }} />
    </View>
  );
}

/* -------------------------------------------------
   Styles
   ------------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1420",
    paddingHorizontal: 16,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
    justifyContent: "space-between",
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: "#E6F0FF",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 8,
  },

  /* SUMMARY CARD */
  summaryCard: {
    backgroundColor: "#121927",
    borderWidth: 1,
    borderColor: "#232A3A",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,

    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  statusText: {
    color: "#98A2B3",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  metaText: {
    color: "#98A2B3",
    fontSize: 13,
    fontWeight: "500",
  },

  bigActionBtn: {
    backgroundColor: "#12E29A",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 110,
  },
  bigActionBtnDone: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#12E29A",
  },
  bigActionBtnText: {
    color: "#061018",
    fontWeight: "700",
    fontSize: 15,
    lineHeight: 18,
  },
  bigActionBtnTextDone: {
    color: "#12E29A",
  },

  /* SECTION TITLE */
  sectionTitle: {
    color: "#E6F0FF",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    marginBottom: 12,
  },

  /* LISTE D'EXERCICES */
  exerciseCard: {
    backgroundColor: "#121927",
    borderWidth: 1,
    borderColor: "#232A3A",
    borderRadius: 16,
    padding: 16,
    gap: 12,

    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  exerciseName: {
    color: "#E6F0FF",
    fontSize: 16,
    fontWeight: "700",
  },

  setsContainer: {
    gap: 8,
  },

  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "space-between",
    backgroundColor: "#1C1F2A",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  setIndex: {
    color: "#E6F0FF",
    fontWeight: "700",
    fontSize: 14,
    minWidth: 28,
  },

  setDetail: {
    color: "#E6F0FF",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },

  setRest: {
    color: "#98A2B3",
    fontSize: 12,
    fontWeight: "500",
    minWidth: 70,
    textAlign: "right",
  },

  noSets: {
    color: "#98A2B3",
    fontSize: 14,
    fontStyle: "italic",
  },

  /* ÉTATS ERREUR / CHARGEMENT */
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  errorCard: {
    backgroundColor: "#121927",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#232A3A",
    padding: 24,
    marginTop: 48,
    alignItems: "center",
  },

  errorText: {
    color: "#FF6B6B",
    fontWeight: "600",
    marginBottom: 16,
  },

  reloadBtn: {
    backgroundColor: "#12E29A",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  reloadBtnText: {
    color: "#061018",
    fontWeight: "700",
  },

  /* LIST EMPTY */
  emptyExercises: {
    backgroundColor: "#121927",
    borderWidth: 1,
    borderColor: "#232A3A",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  emptyExercisesText: {
    color: "#98A2B3",
    fontSize: 14,
  },
});
