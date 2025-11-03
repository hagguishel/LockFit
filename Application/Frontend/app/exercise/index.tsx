// app/exercises/index.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { listExercises } from "@/lib/exercises";

type Exercise = {
  id: string;
  name: string;
  primaryMuscle?: string;
};

export default function ExerciseLibraryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; current?: string }>();

  const [items, setItems] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await listExercises();
      setItems(data || []);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger les exercices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handlePick(ex: Exercise) {
    if (params.mode === "pick") {
      const currentRaw =params.current as string | undefined;
      let currentList: any[] = [];
      if (currentRaw) {
        try {
          currentList = JSON.parse(currentRaw);
        } catch (e) {
          console.log("[exercise] current invalide", e)
        }
      }

      const nextList = [
        ...currentList,
        {
          id: ex.id,
          name: ex.name,
          slug: ex.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
          primaryMuscle: ex.primaryMuscle ?? "",
        },
      ];
      // on revient avec l’exo choisi
      router.push({
        pathname: "/(tabs)/workouts/new",
        params: {
          current: JSON.stringify(nextList),
        },
      });
    } else {
      // plus tard : écran détail exercice
      router.push(`/exercises/${ex.id}`);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* HEADER LockFit */}
      <LinearGradient
        colors={["#1a1a35", "#0f0f23"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={{ color: "#fff", fontSize: 16 }}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Bibliothèque d'exercices</Text>
          <Text style={styles.headerSubtitle}>
            {params.mode === "pick"
              ? "Choisis un exercice pour ta séance"
              : "Tous les exercices"}
          </Text>
        </View>
        <View style={{ width: 30 }} />
      </LinearGradient>

      {/* CONTENU */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#12E29A" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.exerciseCard}
              onPress={() => handlePick(item)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.exerciseName}>{item.name}</Text>
                <Text style={styles.exerciseMuscle}>
                  {item.primaryMuscle || "Muscle inconnu"}
                </Text>
              </View>
              <Text style={styles.chooseText}>
                {params.mode === "pick" ? "Choisir" : "Voir"}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: "#8C9BAD" }}>
                Aucun exercice dans la base.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f23" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#8C9BAD",
    fontSize: 12,
    marginTop: 3,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#FF6B6B",
    marginBottom: 14,
  },
  retryBtn: {
    backgroundColor: "#12E29A",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: {
    color: "#061018",
    fontWeight: "700",
  },
  exerciseCard: {
    backgroundColor: "rgba(14,17,30,0.65)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(124,211,255,0.03)",
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  exerciseName: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  exerciseMuscle: {
    color: "#7AD3FF",
    fontSize: 12,
    marginTop: 3,
  },
  chooseText: {
    color: "#12E29A",
    fontWeight: "600",
  },
});
