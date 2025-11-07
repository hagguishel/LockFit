// app/(tabs)/index.tsx
import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, ActivityIndicator, Alert } from "react-native";
import { MuscleHexagon, Workout } from "../components/MuscleHexagon";
import { loadTokens } from "@/lib/tokenStorage"; // adapte le chemin si besoin

const API_BASE = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export default function HomeScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const tokens = await loadTokens();
        if (!tokens?.access) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/api/v1/workouts`, {
          headers: {
            Authorization: `Bearer ${tokens.access}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          console.log("workouts error", data);
          Alert.alert("Erreur", data?.message || "Impossible de charger les entraînements");
          setLoading(false);
          return;
        }

        // d’après ton controller, ça renvoie { items, total }
        const items = Array.isArray(data.items) ? data.items : [];

        // on mappe au format attendu par le composant
        const mapped: Workout[] = items.map((w: any) => ({
          date: w.createdAt || w.date || new Date().toISOString(),
          completed: !!w.finishedAt,
          exercises: (w.items || []).map((it: any) => ({
            name: it.exercise?.name || "Exercice",
            sets: (it.sets || []).length || 1,
          })),
        }));

        setWorkouts(mapped);
      } catch (e) {
        console.log(e);
        Alert.alert("Erreur réseau", "Impossible de joindre le serveur");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0B0B1A" }}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 90 }}
    >
      <View>
        <Text style={{ color: "white", fontSize: 26, fontWeight: "800" }}>
          Dashboard
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
          Vue d’ensemble de tes séances
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#12E29A" />
      ) : (
        <MuscleHexagon workouts={workouts} />
      )}
    </ScrollView>
  );
}
