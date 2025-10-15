// src/ecrans/ListeEntrainements.tsx
import React, { useEffect, useState, useCallback, useLayoutEffect } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Button } from "react-native";
import { http } from "@/api/http";
import { listWorkouts, getWorkout } from "@/api/workouts";
import type { Workout } from "@/types/workout";

export default function ListeEntrainements({ navigation }: any) {
  const [data, setData] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // bouton "Debug" en haut à droite
  useLayoutEffect(() => {
    navigation?.setOptions?.({
      headerRight: () => <Button title="Debug" onPress={onDebug} />,
    });
  }, [navigation, data]);

  // charge la liste
  const load = async () => {
    setLoading(true);
    try {
      const res = await listWorkouts();
      setData(res?.items ?? []); // protège si TS croit que res peut être null
    } catch (e) {
      Alert.alert("Erreur", "Impossible de charger les entraînements.");
    } finally {
      setLoading(false);
    }
  };

  // 1er chargement
  useEffect(() => {
    load();
  }, []);

  // pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  // bouton debug → vérifie /health + liste + détail du 1er
  async function onDebug() {
    try {
      const health = await http<{ ok: boolean; service: string }>("/health");
      if (!health) throw new Error("Réponse /health vide"); // évite 'health peut être null'

      const liste = await listWorkouts();
      let detail: any = null;
      if (liste?.items?.length) {
        detail = await getWorkout(liste.items[0].id);
      }
      Alert.alert(
        "Debug API",
        [
          `Health: ${health.ok ? "OK" : "KO"} (${health.service})`,
          `Workouts: ${liste?.items?.length ?? 0}`,
          detail ? `#1: ${detail.title} (${detail.id.slice(0, 6)}…)` : "Pas de détail (liste vide)",
        ].join("\n")
      );
    } catch (e: any) {
      Alert.alert("Erreur API", e?.message ?? String(e));
    }
  }

  // UI
  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  if (!data.length) {
    return (
      <View style={{ padding: 16 }}>
        <Text>Aucun entraînement.</Text>
        <Button title="Recharger" onPress={load} />
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(w) => w.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => navigation.navigate("Détails", { id: item.id })}
          style={{ padding: 16, borderBottomWidth: 1, borderColor: "#333" }}
        >
          <Text style={{ fontWeight: "600" }}>{item.title}</Text>
          <Text style={{ opacity: 0.7 }}>
            {new Date(item.createdAt).toLocaleDateString()} {item.finishedAt ? " • ✅ Terminé" : " • 🕒 En cours"}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}
