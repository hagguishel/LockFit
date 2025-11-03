// app/(tabs)/workouts/index.tsx
// Écran principal "Mes entraînements" (version Figma-like)

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import {
  listWorkouts,
  deleteWorkout,
  type Workout,
} from "@/lib/workouts";

/* -------------------------------------------------
   Helpers calendrier / semaine
   ------------------------------------------------- */
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

/* -------------------------------------------------
   Helpers métiers
   ------------------------------------------------- */
function computeTotalSets(workout: any): number {
  if (!workout?.items) return 0;
  return workout.items.reduce((acc: number, item: any) => {
    const count = Array.isArray(item?.sets) ? item.sets.length : 0;
    return acc + count;
  }, 0);
}

function computeEstimatedDurationMin(workout: any): number {
  if (!workout?.items) return 0;
  let totalSec = 0;
  for (const item of workout.items) {
    if (!item?.sets) continue;
    for (const set of item.sets) {
      const restSeconds =
        typeof set?.rest === "number" ? set.rest : 60;
      totalSec += restSeconds + 30;
    }
  }
  return Math.ceil(totalSec / 60);
}

function computeProgressRatio(workout: any): number {
  return workout?.finishedAt ? 1 : 0;
}

/* =================================================
   Écran principal
   ================================================= */
export default function WorkoutsTabScreen() {
  const router = useRouter();

  // data
  const [items, setItems] = useState<Workout[]>([]);
  const [total, setTotal] = useState(0);

  // ui
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // semaine / jour
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date())
  );
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  // fetch
  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const res = await listWorkouts();
      setItems(res.items);
      setTotal(res.total ?? res.items.length);
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // suppression
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteWorkout(id);
        setItems((prev) => prev.filter((w) => w.id !== id));
        setTotal((prev) => Math.max(prev - 1, 0));
      } catch (e) {
        // on reste silencieux pour l'instant
      }
    },
    []
  );

  const s = styles;

  // contenu dynamique
  const listContent = useMemo(() => {
    if (loading) {
      return (
        <View style={s.center}>
          <ActivityIndicator color="#12E29A" />
        </View>
      );
    }

    if (error) {
      return (
        <View style={s.emptyCard}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={load}>
            <Text style={s.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      );
    }

    if (items.length === 0) {
      return (
        <View style={s.emptyCard}>
          <Text style={s.emptyEmoji}>🏋️‍♂️</Text>
          <Text style={s.emptyTitle}>Aucun workout aujourd'hui</Text>
          <Text style={s.emptySubtitle}>
            Ajoute ta première séance pour cette semaine.
          </Text>
        </View>
      );
    }

    return (
      <>
        <Text style={s.sectionTitle}>Workouts du jour</Text>
        <FlatList
          data={items}
          keyExtractor={(w) => w.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ gap: 14, paddingBottom: 140 }}
          renderItem={({ item }) => {
            const totalSets = computeTotalSets(item);
            const estimatedDurationMin = computeEstimatedDurationMin(item);
            const progressRatio = computeProgressRatio(item);
            const isDone = progressRatio === 1;

            return (
              <Pressable
                style={s.workoutCard}
                onPress={() => router.push(`/workouts/${item.id}`)}
              >
                <View style={s.cardRowTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.workoutTitle}>
                      {item.title || "Sans nom"}
                    </Text>
                    {isDone ? (
                      <Text style={[s.workoutMeta, { color: "#12E29A" }]}>
                        Terminé ✅
                      </Text>
                    ) : (
                      <Text style={s.workoutMeta}>
                        ~{estimatedDurationMin} min • {totalSets} séries
                      </Text>
                    )}
                  </View>

                  <Pressable
                    onPress={() => handleDelete(item.id)}
                    style={s.deleteBtn}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color="#FF6B6B"
                    />
                  </Pressable>
                </View>

                {/* barre de progression */}
                <View style={s.progressTrack}>
                  <View
                    style={[
                      s.progressFill,
                      { width: `${isDone ? 100 : 0}%` },
                    ]}
                  />
                </View>

                {/* bouton action */}
                <View style={s.cardRowBottom}>
                  <Pressable
                    style={[s.actionBtn, isDone && s.actionBtnDone]}
                    onPress={() => router.push(`/workouts/${item.id}`)}
                  >
                    <Text
                      style={[
                        s.actionBtnText,
                        isDone && s.actionBtnTextDone,
                      ]}
                    >
                      {isDone ? "TERMINÉ" : "COMMENCER"}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
          ListFooterComponent={
            <Text style={s.totalText}>Total : {total}</Text>
          }
        />
      </>
    );
  }, [
    loading,
    error,
    items,
    s,
    refreshing,
    onRefresh,
    handleDelete,
    load,
    router,
    total,
  ]);

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      {/* HEADER gradient */}
      <LinearGradient
        colors={["#1a1a35", "#0f0f23"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={s.header}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Mes entraînements</Text>
          <Text style={s.headerSubtitle}>Vue semaine</Text>
        </View>

        <Pressable style={s.iconBtn}>
          <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
        </Pressable>
      </LinearGradient>

      {/* week strip */}
      <WeekStrip
        weekStart={weekStart}
        selectedDay={selectedDay}
        onPrevWeek={() => setWeekStart(addDays(weekStart, -7))}
        onNextWeek={() => setWeekStart(addDays(weekStart, +7))}
        onSelectDay={(d) => setSelectedDay(d)}
      />

      {/* contenu dynamique */}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>{listContent}</View>

      {/* FAB */}
      <Pressable
        style={s.fab}
        onPress={() => router.push("/workouts/new")}
      >
        <Ionicons name="add" size={34} color="#061018" />
      </Pressable>
    </SafeAreaView>
  );
}

/* -------------------------------------------------
   Composant : WeekStrip
   ------------------------------------------------- */
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

  return (
    <View style={styles.weekStrip}>
      <Pressable style={styles.arrow} onPress={onPrevWeek}>
        <Ionicons name="chevron-back" size={18} color="#98A2B3" />
      </Pressable>

      <View style={styles.weekDays}>
        {days.map((d, i) => {
          const active = isSameDay(d, selectedDay);
          return (
            <Pressable
              key={i}
              style={[styles.dayItem, active && styles.dayItemActive]}
              onPress={() => onSelectDay(d)}
            >
              <Text
                style={[
                  styles.dayLabel,
                  active && styles.dayLabelActive,
                ]}
              >
                {daysLabels[i]}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  active && styles.dayNumberActive,
                ]}
              >
                {d.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.arrow} onPress={onNextWeek}>
        <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
      </Pressable>
    </View>
  );
}

/* -------------------------------------------------
   Styles
   ------------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },

  /* header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#8C9BAD",
    fontSize: 12,
    marginTop: 4,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },

  /* Week strip */
  weekStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    backgroundColor: "rgba(12,17,27,0.35)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(124,211,255,0.03)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 12,
  },
  arrow: {
    padding: 6,
  },
  weekDays: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  dayItem: {
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayItemActive: {
    backgroundColor: "rgba(18, 226, 154, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(18, 226, 154, 0.4)",
  },
  dayLabel: {
    color: "#98A2B3",
    fontSize: 11,
    fontWeight: "500",
  },
  dayLabelActive: {
    color: "#FFFFFF",
  },
  dayNumber: {
    color: "#7AD3FF",
    fontSize: 12,
    fontWeight: "600",
  },
  dayNumberActive: {
    color: "#FFFFFF",
  },

  /* contenu */
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },

  workoutCard: {
    backgroundColor: "rgba(14,17,30,0.65)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(124,211,255,0.03)",
    padding: 14,
    gap: 10,
  },
  cardRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  workoutTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  workoutMeta: {
    color: "#B1B9C7",
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: {
    backgroundColor: "rgba(255,107,107,0.12)",
    borderRadius: 12,
    padding: 6,
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(140,155,173,0.25)",
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: "#12E29A",
  },
  cardRowBottom: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionBtn: {
    backgroundColor: "#12E29A",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  actionBtnDone: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#12E29A",
  },
  actionBtnText: {
    color: "#061018",
    fontWeight: "700",
  },
  actionBtnTextDone: {
    color: "#12E29A",
  },

  emptyCard: {
    backgroundColor: "rgba(14,17,30,0.65)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(124,211,255,0.03)",
    padding: 24,
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  emptySubtitle: {
    color: "#8C9BAD",
    fontSize: 13,
    textAlign: "center",
  },
  errorText: {
    color: "#FF6B6B",
  },
  retryBtn: {
    backgroundColor: "#12E29A",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 10,
  },
  retryText: {
    color: "#061018",
    fontWeight: "700",
  },
  totalText: {
    color: "#8C9BAD",
    marginTop: 10,
    textAlign: "center",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    bottom: 90,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#12E29A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});
