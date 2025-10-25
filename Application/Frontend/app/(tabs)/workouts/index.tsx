// app/workouts/index.tsx
// 🏋️ Onglet "Mes entraînements"
// Étape 1 : UI fidèle au Figma + palette & layout LockFit
// Étape 2 : filtre semaine via /workouts?from=YYYY-MM-DD&to=YYYY-MM-DD

import { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, Stack, useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import theme from "@/theme/colors";
import layout from "@/theme/layout";
import typography from "@/theme/typography";
import { listWorkouts, type Workout } from "@/lib/workouts"; // ✅ alias @
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { HttpError } from "@/api/http"; // ✅ message/status propres
import { clearTokens } from "@/lib/tokenStorage"; // ✅ logout

// === Helpers semaine ===
const daysLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 7) % 7;
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
// YYYY-MM-DD sans timezone
function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function WorkoutsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();

  const [items, setItems] = useState<Workout[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // fenêtre de la semaine [weekStart .. weekStart+6]
      const from = fmtDate(weekStart);
      const to = fmtDate(addDays(weekStart, 6));

      const res = await listWorkouts({ from, to });
      setItems(res.items ?? []);
      setTotal(res.total ?? (res.items?.length ?? 0));
    } catch (e: any) {
      if (e instanceof HttpError) setError(`${e.status} — ${e.message}`);
      else setError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  // recharge sur focus
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // recharge quand la semaine change via les flèches
  useEffect(() => {
    load();
  }, [load, weekStart]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // Logout
  const onLogout = useCallback(async () => {
    try {
      await clearTokens();
    } finally {
      router.replace("/auth/login");
    }
  }, [router]);

  const s = styles;

  const listContent = useMemo(() => {
    if (loading) {
      return (
        <View style={s.center}>
          <ActivityIndicator />
        </View>
      );
    }
    if (error) {
      return (
        <View style={s.emptyCard}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable onPress={load} style={s.cta}>
            <Text style={s.ctaText}>Réessayer</Text>
          </Pressable>
        </View>
      );
    }
    if (items.length === 0) {
      return (
        <View style={s.emptyCard}>
          <Text style={s.sectionTitle}>Workouts du jour</Text>

          <View style={{ height: layout.gap.lg }} />

          <Text style={s.emoji}>🏋️‍♂️</Text>
          <Text style={s.emptyTitle}>Aucun workout prévu aujourd&apos;hui</Text>

          <View style={{ height: layout.gap.lg }} />

          <Link href="/workouts/new" asChild>
            <Pressable style={s.ctaLarge}>
              <Ionicons name="add" size={18} color={theme.colors.onPrimary} />
              <Text style={[s.ctaText, { marginLeft: 6 }]}>CREER UN WORKOUT</Text>
            </Pressable>
          </Link>
        </View>
      );
    }
    return (
      <>
        <Text style={s.sectionTitle}>Workouts du jour</Text>
        <FlatList
          data={items}
          keyExtractor={(w) => String(w.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{
            gap: layout.gap.md,
            paddingBottom: 128, // évite que le FAB masque le dernier item
          }}
          renderItem={({ item }) => (
            <Link href={`/workouts/${item.id}`} asChild>
              <Pressable style={s.card}>
                <Text style={s.cardTitle}>{item.title}</Text>
                <Text style={s.cardSub}>
                  {item.finishedAt ? "Terminé" : "Planifié / En cours"}
                </Text>
              </Pressable>
            </Link>
          )}
          ListFooterComponent={<Text style={s.totalText}>Total: {total}</Text>}
        />
      </>
    );
  }, [loading, error, items, total, refreshing, onRefresh, s, load]);

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Mes entraînements</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Link href="/calendar" asChild>
            <Pressable style={s.iconBtn}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.text} />
            </Pressable>
          </Link>
          {/* Logout */}
          <Pressable style={s.iconBtn} onPress={onLogout} accessibilityLabel="Se déconnecter">
            <Ionicons name="power-outline" size={20} color={theme.colors.danger ?? "#ef4444"} />
          </Pressable>
        </View>
      </View>

      {/* Bandeau semaine */}
      <WeekStrip
        weekStart={weekStart}
        selectedDay={selectedDay}
        onPrevWeek={() => setWeekStart(addDays(weekStart, -7))}
        onNextWeek={() => setWeekStart(addDays(weekStart, +7))}
        onSelectDay={setSelectedDay}
      />

      <View style={{ height: layout.gap.md }} />

      {/* Contenu */}
      {listContent}

      {/* Bouton flottant toujours visible */}
      <Link href="/workouts/new" asChild>
        <Pressable style={s.fab} accessibilityRole="button" accessibilityLabel="Créer un workout">
          <Ionicons name="add" size={28} color={theme.colors.onPrimary} />
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}

// === Bandeau semaine ===
function WeekStrip({
  weekStart,
  selectedDay,
  onPrevWeek,
  onNextWeek,
  onSelectDay,
}: {
  weekStart: Date;
  selectedDay: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onSelectDay: (d: Date) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const s = styles;

  return (
    <View style={s.weekStrip}>
      <Pressable style={s.arrow} onPress={onPrevWeek}>
        <Ionicons name="chevron-back" size={18} color={theme.colors.muted} />
      </Pressable>

      <View style={s.weekDays}>
        {days.map((d, i) => {
          const active = isSameDay(d, selectedDay);
          return (
            <Pressable key={i} style={s.dayItem} onPress={() => onSelectDay(d)}>
              <View
                style={[
                  s.dayDot,
                  active && { backgroundColor: theme.colors.primary },
                ]}
              />
              <Text style={[s.dayLabel, active && { color: theme.colors.text }]}>
                {daysLabels[i]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={s.arrow} onPress={onNextWeek}>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
      </Pressable>
    </View>
  );
}

// === Styles ===
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: layout.inset.x,
    paddingTop: layout.inset.y,
    position: "relative", // pour que le FAB en position:absolute se réfère à cet écran
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: layout.section.headerGap,
  },
  title: { ...typography.h1 },
  iconBtn: {
    padding: 8,
    borderRadius: layout.radius.md,
    backgroundColor: "rgba(255,255,255,0.04)",
  },

  weekStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: layout.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: layout.gap.sm,
    paddingVertical: layout.gap.sm + 2,
  },
  arrow: { padding: 6, borderRadius: layout.radius.sm },
  weekDays: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: layout.gap.xs,
  },
  dayItem: { alignItems: "center", gap: layout.gap.xs },
  dayDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.dot,
  },
  dayLabel: { ...typography.mute, fontSize: 12, lineHeight: 16, fontWeight: "600" },

  sectionTitle: { ...typography.h2, marginBottom: layout.gap.sm },

  card: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: layout.radius.lg,
    padding: layout.gap.lg,
    ...theme.shadow.card,
  },
  cardTitle: { ...typography.h2 },
  cardSub: { ...typography.mute, marginTop: layout.gap.xs },

  emptyCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: layout.radius.lg,
    padding: layout.gap.xl,
    alignItems: "center",
  },
  emoji: { fontSize: 36, marginBottom: layout.gap.sm },
  emptyTitle: { ...typography.mute },

  cta: {
    backgroundColor: theme.colors.primary,
    paddingVertical: layout.gap.sm,
    paddingHorizontal: layout.gap.lg,
    borderRadius: layout.radius.md,
  },
  ctaLarge: {
    backgroundColor: theme.colors.primary,
    paddingVertical: layout.gap.sm + 4,
    paddingHorizontal: layout.gap.lg,
    borderRadius: layout.radius.md,
    flexDirection: "row",
    alignItems: "center",
  },
  ctaText: { ...typography.cta },

  totalText: { color: theme.colors.muted, marginTop: layout.gap.sm },

  fab: {
    position: "absolute",
    right: layout.inset.x,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    zIndex: 10, // passe au-dessus
    ...theme.shadow.card,
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: theme.colors.danger, marginBottom: 10 },
});
