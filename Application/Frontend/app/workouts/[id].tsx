import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { getWorkout, finishWorkout, type Workout } from "../../src/lib/workouts";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await getWorkout(String(id));
      setData(res);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function onFinish() {
    try {
      await finishWorkout(String(id));
      Alert.alert("Séance terminée ✅");
      await load();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de terminer");
    }
  }

  if (loading || !data) {
    return (
      <View style={s.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: data.title || "Séance" }} />
      {data.note ? <Text style={s.note}>{data.note}</Text> : null}
      <Text style={s.status}>
        Statut : {data.finishedAt ? "✅ Terminée" : "🕓 En cours"}
      </Text>
      {!data.finishedAt && <Button title="Marquer terminé" onPress={onFinish} />}
      <View style={{ height: 12 }} />
      <Button title="Retour" onPress={() => router.back()} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1420", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0F1420" },
  note: { color: "#98A2B3", marginBottom: 10 },
  status: { color: "#E6F0FF", marginBottom: 16 },
});
