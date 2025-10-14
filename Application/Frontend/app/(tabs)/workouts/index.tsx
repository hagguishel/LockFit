// app/workouts/index.tsx — Liste des entraînements (branchée à l’API)

import { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, Stack, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { listWorkouts, type Workout } from "../../../src/lib/workouts";

export default function WorkoutsScreen() {
  const [items, setItems] = useState<Workout[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Va chercher la liste
  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await listWorkouts();
      setItems(res.items);
      setTotal(res.total);
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  // Charge au montage
  useEffect(() => {
    load();
  }, [load]);

  // Recharge quand on revient sur l’écran
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Entraînements" }} />

      {/* En-tête avec bouton "+ Nouveau" */}
      <View style={styles.header}>
        <Text style={styles.title}>Entraînements</Text>
        <Link href="/workouts/new" asChild>
          <Pressable style={styles.newBtn}>
            <Text style={styles.ctaText}>+ Nouveau</Text>
          </Pressable>
        </Link>
      </View>

      {loading ? (
        // 1) Loading
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        // 2) Erreur
        <View style={styles.emptyCard}>
          <Text style={{ color: "tomato", marginBottom: 10 }}>{error}</Text>
          <Pressable onPress={load} style={styles.cta}>
            <Text style={styles.ctaText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        // 3) Vide
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Aucun entraînement</Text>
          <Text style={styles.emptySub}>Créez votre premier entraînement pour commencer !</Text>
          <Link href="/workouts/new" asChild>
            <Pressable style={styles.cta}>
              <Text style={styles.ctaText}>Créer un entraînement</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        // 4) Liste OK
        <FlatList
          data={items}
          keyExtractor={(w) => w.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Link href={`/workouts/${item.id}`} asChild>
              <Pressable style={styles.card}>
                <Text style={{ color: "#E6F0FF", fontWeight: "700" }}>{item.title}</Text>
                <Text style={{ color: "#98A2B3", marginTop: 4 }}>
                  {item.finishedAt ? "Terminée" : "En cours"}
                </Text>
              </Pressable>
            </Link>
          )}
          ListFooterComponent={
            <Text style={{ color: "#98A2B3", marginTop: 8 }}>Total: {total}</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1420", padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { color: "#E6F0FF", fontSize: 20, fontWeight: "700" },
  newBtn: { backgroundColor: "#12E29A", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  ctaText: { color: "#061018", fontWeight: "700" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  card: {
    borderWidth: 1,
    borderColor: "#232A3A",
    backgroundColor: "#121927",
    borderRadius: 16,
    padding: 16,
  },

  emptyCard: {
    borderWidth: 1,
    borderColor: "#232A3A",
    backgroundColor: "#121927",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  emptyTitle: { color: "#E6F0FF", fontWeight: "700", marginBottom: 6 },
  emptySub: { color: "#98A2B3", marginBottom: 16, textAlign: "center" },
  cta: { backgroundColor: "#12E29A", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
});
