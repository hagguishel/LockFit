// app/planning/index.tsx
import { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, Stack } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import theme from "@/theme/colors";
import layout from "@/theme/layout";
import typography from "@/theme/typography";

import { listPlannings } from "@/api/planning"; // <-- ton client API existant
import type { Planning } from "@/api/planning";

export default function PlanningListScreen() {
  const [items, setItems] = useState<Planning[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await listPlannings();
      setItems(res.items ?? []);
      setTotal(res.total ?? (res.items?.length ?? 0));
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const s = styles;

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Mes plannings" }} />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={s.emptyCard}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable onPress={load} style={s.cta}>
            <Text style={s.ctaText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emoji}>📅</Text>
          <Text style={s.emptyText}>Aucun planning</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => String(p.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ gap: layout.gap.md, paddingBottom: layout.gap.xl }}
          renderItem={({ item }) => {
            return (
              <Link href={`/planning/${item.id}`} asChild>
                <Pressable style={s.card}>
                  <Text style={s.cardTitle}>{item.nom}</Text>
                  <Text style={s.cardSub}>
                    du {new Date(item.debut).toLocaleDateString()} au {new Date(item.fin).toLocaleDateString()}
                  </Text>
                </Pressable>
              </Link>
            );
          }}
          ListFooterComponent={<Text style={s.totalText}>Total: {total}</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: layout.inset.x,
    paddingTop: layout.inset.y,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  card: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: layout.radius.lg,
    padding: layout.gap.lg,
    ...theme.shadow.card,
  },
  cardTitle: { ...typography.h2 },
  cardSub: { ...typography.mute, marginTop: 4 },

  emptyCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: layout.radius.lg,
    padding: layout.gap.xl,
    alignItems: "center",
  },
  emoji: { fontSize: 32, marginBottom: layout.gap.sm },
  emptyText: { ...typography.mute },

  cta: {
    backgroundColor: theme.colors.primary,
    paddingVertical: layout.gap.sm,
    paddingHorizontal: layout.gap.lg,
    borderRadius: layout.radius.md,
    marginTop: layout.gap.sm,
  },
  ctaText: { ...typography.cta },

  totalText: { color: theme.colors.muted, marginTop: layout.gap.sm },
  errorText: { color: theme.colors.danger },
});
