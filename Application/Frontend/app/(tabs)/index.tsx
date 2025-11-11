// app/(tabs)/index.tsx
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MuscleHexagon, Workout } from "../../src/components/MuscleHexagon";
import { loadTokens } from "@/lib/tokenStorage";

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
          Alert.alert(
            "Erreur",
            data?.message || "Impossible de charger les entraînements"
          );
          setLoading(false);
          return;
        }

        const items = Array.isArray(data.items) ? data.items : [];

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
      style={{ flex: 1, backgroundColor: "#0f0f23" }}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* header */}
      <View>
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 26,
            fontWeight: "800",
            marginTop: 40,
          }}
        >
          Dashboard
        </Text>
        <Text style={{ color: "#8C9BAD", marginTop: 4 }}>
          Vue d’ensemble de tes séances
        </Text>
      </View>

      {/* graphe inchangé */}
      {loading ? (
        <ActivityIndicator color="#12E29A" />
      ) : (
        <MuscleHexagon workouts={workouts} />
      )}

      {/* 👇 bloc factice pour remplir l'UI */}
      <View style={{ gap: 12 }}>
        {/* carte prochain entraînement */}
        <View
          style={{
            backgroundColor: "rgba(14,17,30,0.65)",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(124,211,255,0.03)",
            padding: 16,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>
            Prochain entraînement
          </Text>
          <Text style={{ color: "#8C9BAD", marginTop: 4 }}>
            Push Day • demain 18h30
          </Text>
          <Text style={{ color: "#FFFFFF", marginTop: 6, fontSize: 13 }}>
            6 exercices • ~ 70 min
          </Text>
        </View>

        {/* carte objectif semaine */}
        <View
          style={{
            backgroundColor: "rgba(14,17,30,0.65)",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(124,211,255,0.03)",
            padding: 16,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>
            Objectif de la semaine
          </Text>
          <Text style={{ color: "#8C9BAD", marginTop: 4 }}>
            3 séances sur 4 complétées
          </Text>

          {/* barre de progression */}
          <View
            style={{
              height: 6,
              backgroundColor: "rgba(140,155,173,0.25)",
              borderRadius: 999,
              marginTop: 10,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 6,
                width: "75%",
                backgroundColor: "#12E29A",
              }}
            />
          </View>

          <Text style={{ color: "#8C9BAD", marginTop: 6, fontSize: 12 }}>
            Continue comme ça 💪
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
