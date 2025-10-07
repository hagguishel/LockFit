import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import { getWorkout, finishWorkout, type Workout } from "../../src/lib/workouts";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getWorkout(String(id));
      setData(res);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Chargement initial
  useEffect(() => { load(); }, [load]);

  // Recharge quand on revient sur l’écran
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onFinish = useCallback(async () => {
    if (!data || data.finishedAt) return;

    // Optimiste: on marque terminé localement
    setFinishing(true);
    const previous = data;
    setData({ ...data, finishedAt: new Date().toISOString() });

    try {
      await finishWorkout(String(id));
      Alert.alert("Séance terminée ✅");
    } catch (e: any) {
      // Rollback si échec
      setData(previous);
      Alert.alert("Erreur", e?.message || "Impossible de terminer");
    } finally {
      setFinishing(false);
    }
  }, [data, id]);

  const title = data?.title || "Séance";
  const finishedAtText = useMemo(() => {
    if (!data?.finishedAt) return "🕓 En cours";
    const d = new Date(data.finishedAt);
    return `✅ Terminée le ${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  }, [data?.finishedAt]);

  if (loading && !data) {
    return (
      <SafeAreaView style={s.center} edges={["top", "bottom"]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title }} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Carte d’info */}
        <View style={s.card}>
          {data?.note ? <Text style={s.note}>{data.note}</Text> : null}
          <Text style={s.status}>{finishedAtText}</Text>
        </View>

        {/* Actions */}
        {!data?.finishedAt && (
          <Pressable style={[s.cta, finishing && { opacity: 0.6 }]} onPress={onFinish} disabled={finishing}>
            <Text style={s.ctaText}>{finishing ? "Validation…" : "Marquer terminé"}</Text>
          </Pressable>
        )}

        <Pressable style={s.secondary} onPress={() => router.back()}>
          <Text style={s.secondaryText}>Retour</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1420", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0F1420" },

  card: {
    borderWidth: 1, borderColor: "#232A3A", backgroundColor: "#121927",
    borderRadius: 16, padding: 16, marginBottom: 16,
  },
  note: { color: "#98A2B3", marginBottom: 8 },
  status: { color: "#E6F0FF", fontWeight: "600" },

  cta: { backgroundColor: "#12E29A", paddingVertical: 12, borderRadius: 12, alignItems: "center", marginBottom: 8 },
  ctaText: { color: "#061018", fontWeight: "700" },

  secondary: { paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  secondaryText: { color: "#98A2B3", fontWeight: "600" },
});
