// app/(tabs)/workouts/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getWorkout, finishWorkout, type Workout } from "@/lib/workouts";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs"

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabBarHeight = useBottomTabBarHeight();

  // --- fetch
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

  // --- marquer terminé
  const markFinished = useCallback(async () => {
    if (!workout || workout.finishedAt) return;
    try {
      await finishWorkout(workout.id);
      setWorkout({ ...workout, finishedAt: new Date().toISOString() });
    } catch (err) {
      alert("Erreur : impossible de marquer la séance comme terminée");
    }
  }, [workout]);

  const totalExercises = workout?.items?.length ?? 0;
  const totalSets = useMemo(() => {
    if (!workout?.items) return 0;
    return workout.items.reduce((acc, item) => {
      const n = Array.isArray(item?.sets) ? item.sets.length : 0;
      return acc + n;
    }, 0);
  }, [workout]);
  const isDone = Boolean(workout?.finishedAt);

  // --- loading
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator color="#12E29A" />
        </View>
      </SafeAreaView>
    );
  }

  // --- error
  if (error || !workout) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error || "Workout introuvable"}</Text>
          <Pressable style={styles.reloadBtn} onPress={load}>
            <Text style={styles.reloadBtnText}>Réessayer</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // --- render exo
  const renderExercise = ({ item, index }: { item: any; index: number }) => {
    const exerciseName = item.exercise?.name || item.exerciseName || "Exercice";
    const primaryMuscle = item.exercise?.primaryMuscle || "—";
    const sets = Array.isArray(item.sets) ? item.sets : [];

    return (
      <View style={styles.exerciseCard}>
        <View
          style={[
            styles.exerciseIndex,
            index === 0 ? styles.exerciseIndexFirst : null,
          ]}
        >
          <Text style={styles.exerciseIndexText}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.exerciseName}>{exerciseName}</Text>
          <View style={styles.exerciseMetaRow}>
            <Text style={styles.exerciseMeta}>
              {sets.length > 0 ? `${sets.length} séries` : "Aucune série"}
            </Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.exerciseMuscle}>{primaryMuscle}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#7AD3FF" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* HEADER avec gradient */}
      <LinearGradient
        colors={["#1a1a35", "#0f0f23"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {workout.title || "Séance"}
          </Text>
          <Text style={styles.headerSubtitle}>Semaine en cours</Text>
        </View>
        <View style={{ width: 32 }} />
      </LinearGradient>

      {/* CONTENU */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* bloc résumé en glass */}
        <BlurView intensity={25} tint="dark" style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Exercices</Text>
            <View style={styles.summaryRow}>
              <Ionicons name="barbell-outline" size={16} color="#12E29A" />
              <Text style={styles.summaryValue}>{totalExercises}</Text>
            </View>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Séries</Text>
            <View style={styles.summaryRow}>
              <Ionicons name="flash-outline" size={16} color="#12E29A" />
              <Text style={styles.summaryValue}>{totalSets}</Text>
            </View>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Statut</Text>
            <View style={styles.summaryRow}>
              <Ionicons
                name={isDone ? "checkmark-circle" : "time-outline"}
                size={16}
                color={isDone ? "#12E29A" : "#FFD166"}
              />
              <Text
                style={[
                  styles.summaryValue,
                  isDone ? { color: "#12E29A" } : null,
                ]}
              >
                {isDone ? "Terminé" : "En cours"}
              </Text>
            </View>
          </View>
        </BlurView>

        {/* titre section */}
        <Text style={styles.sectionTitle}>Liste des exercices</Text>

        {/* liste d'exos */}
        <FlatList
          data={workout.items ?? []}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderExercise}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 12 }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                Aucun exercice dans cet entraînement
              </Text>
            </View>
          }
        />
      </ScrollView>

      {/* FOOTER flotte comme sur figma */}
      <View style={[styles.footer, { bottom: tabBarHeight + 12  }]}>
        {!isDone ? (
          <>
          {/* Ouvre le Live */}
            <Pressable
             style={styles.primaryBtn}
              onPress={() => router.push(`/workouts/live/${workout.id}`)}
              >
              <Ionicons
                name="play"
                size={18}
                color="#061018"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.primaryBtnText}>Commencer la séance</Text>
            </Pressable>

            {/* Marquer comme terminee */}
            <Pressable
              style={styles.secondaryBtn}
              onPress={markFinished}
            >
              <Text style={styles.secondaryBtnText}>Terminée</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.doneBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#12E29A" />
            <Text style={styles.doneText}>Séance terminée</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // fond général
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },

  /* HEADER */
  header: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#8C9BAD",
    fontSize: 12,
    marginTop: 4,
  },

  /* SUMMARY (glass) */
  summaryCard: {
    marginHorizontal: 16,
    marginTop: -16, // pour remonter sous le header comme sur figma
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(122, 211, 255, 0.12)",
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  summaryItem: {
    flex: 1,
    gap: 6,
  },
  summaryLabel: {
    color: "#C0CBDB",
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  /* SECTION */
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 22,
    marginBottom: 12,
    marginHorizontal: 16,
  },

  /* EXERCISE CARD */
  exerciseCard: {
    backgroundColor: "rgba(14,17,30,0.65)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(124, 211, 255, 0.03)",
    marginHorizontal: 16,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  exerciseIndex: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(138, 153, 187, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseIndexFirst: {
    backgroundColor: "rgba(18, 226, 154, 0.14)",
    borderColor: "rgba(18, 226, 154, 0.4)",
    borderWidth: 1,
  },
  exerciseIndexText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  exerciseName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  exerciseMetaRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginTop: 4,
  },
  exerciseMeta: {
    color: "#B1B9C7",
    fontSize: 12,
  },
  exerciseMuscle: {
    color: "#7AD3FF",
    fontSize: 12,
    fontWeight: "500",
  },
  dot: {
    color: "#B1B9C7",
  },

  /* EMPTY */
  emptyBox: {
    marginHorizontal: 16,
    backgroundColor: "rgba(12,17,27,0.3)",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: "#8C9BAD",
  },

  /* FOOTER flottant */
  footer: {
    position: "absolute",
    left: 16,
    right: 16,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: "#12E29A",
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#061018",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(122, 211, 255, 0.4)",
    borderRadius: 16,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: "#7AD3FF",
    fontWeight: "600",
  },
  doneBadge: {
    backgroundColor: "rgba(18, 226, 154, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(18,226,154,0.4)",
    borderRadius: 16,
    height: 54,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  /* loading / error */
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorCard: {
    backgroundColor: "rgba(14,17,30,0.65)",
    borderRadius: 16,
    padding: 22,
    margin: 20,
    alignItems: "center",
  },
  errorText: {
    color: "#FF6B6B",
    fontWeight: "600",
    marginBottom: 12,
  },
  reloadBtn: {
    backgroundColor: "#12E29A",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  reloadBtnText: {
    color: "#061018",
    fontWeight: "700",
  },
});
