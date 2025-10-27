import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useRouter } from "expo-router";

import theme from "@/theme/colors";
import layout from "@/theme/layout";
import typography from "@/theme/typography";
import { listWorkouts, type Workout } from "@/lib/workouts";

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

export default function WorkoutsTabScreen() {
  const router = useRouter();

  const [items, setItems] = useState<Workout[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // semaine / jour sélectionné
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  // charge les workouts
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const s = styles;

  // rendu liste / vide / erreur
  const listContent = useMemo(() => {
    if (loading)
      return (
        <View style={s.center}>
          <ActivityIndicator />
        </View>
      );

    if (error)
      return (
        <View style={s.emptyCard}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable onPress={load} style={s.cta}>
            <Text style={s.ctaText}>Réessayer</Text>
          </Pressable>
        </View>
      );

    if (items.length === 0)
      return (
        <View style={s.emptyCard}>
          <Text style={s.sectionTitle}>Workouts du jour</Text>
          <Text style={s.emoji}>🏋️‍♂️</Text>
          <Text style={s.emptyTitle}>Aucun workout prévu aujourd&apos;hui</Text>
        </View>
      );

    return (
      <>
        <Text style={s.sectionTitle}>Workouts du jour</Text>

        <FlatList
          data={items}
          keyExtractor={(w) => w.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{
            gap: 12,
            paddingBottom: 160, // espace en bas pour ne pas cacher le dernier item
          }}
          renderItem={({ item }) => (
            <Pressable style={s.card}>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Text style={s.cardSub}>
                {item.finishedAt ? "Terminé" : "Planifié / En cours"}
              </Text>
            </Pressable>
          )}
          ListFooterComponent={
            <Text style={s.totalText}>Total: {total}</Text>
          }
        />
      </>
    );
  }, [loading, error, items, total, refreshing, onRefresh, s]);

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Mes entraînements</Text>

        {/* petit bouton calendrier à droite (optionnel) */}
        <Pressable style={s.iconBtn} onPress={() => console.log("calendar!")}>
          <Ionicons name="calendar-outline" size={20} color="#E6F0FF" />
        </Pressable>
      </View>

      {/* Bandeau semaine */}
      <WeekStrip
        weekStart={weekStart}
        selectedDay={selectedDay}
        onPrevWeek={() => setWeekStart(addDays(weekStart, -7))}
        onNextWeek={() => setWeekStart(addDays(weekStart, +7))}
        onSelectDay={setSelectedDay}
      />

      <View style={{ height: 16 }} />

      {/* Contenu liste / vide / erreur */}
      {listContent}

      {/* FAB flottant -> va vers création */}
      <Pressable
        onPress={() => {
          router.push("/workouts/new"); // 🔗 va à l'écran de création
        }}
        style={s.fab}
      >
        <Ionicons name="add" size={32} color="#061018" />
      </Pressable>
    </SafeAreaView>
  );
}

// === Bandeau semaine ===
// On affiche la semaine (Dim Lun Mar...) + chevrons gauche/droite
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
      {/* flèche gauche */}
      <Pressable style={styles.arrow} onPress={onPrevWeek}>
        <Ionicons name="chevron-back" size={18} color="#98A2B3" />
      </Pressable>

      {/* jours */}
      <View style={styles.weekDays}>
        {days.map((d, i) => {
          const active = isSameDay(d, selectedDay);
          return (
            <Pressable
              key={i}
              style={styles.dayItem}
              onPress={() => onSelectDay(d)}
            >
              <View
                style={[
                  styles.dayDot,
                  active && { backgroundColor: "#12E29A" },
                ]}
              />
              <Text
                style={[
                  styles.dayLabel,
                  active && { color: "#E6F0FF" },
                ]}
              >
                {daysLabels[i]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* flèche droite */}
      <Pressable style={styles.arrow} onPress={onNextWeek}>
        <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
      </Pressable>
    </View>
  );
}

// === styles ===
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1420",
    paddingHorizontal: 16,
    position: "relative",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 16,
    alignItems: "center",
  },

  title: {
    color: "#E6F0FF",
    fontSize: 22,
    fontWeight: "700",
  },

  iconBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  // Bandeau semaine
  weekStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    backgroundColor: "#121927",
    borderColor: "#232A3A",
    borderWidth: 1,
    borderRadius: 16,

    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  arrow: {
    padding: 6,
    borderRadius: 8,
  },

  weekDays: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 8,
  },

  dayItem: {
    alignItems: "center",
    gap: 6,
  },

  dayDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2A303F", // gris neutre tant que pas actif
  },

  dayLabel: {
    color: "#98A2B3",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },

  // Liste / cartes
  sectionTitle: {
    color: "#E6F0FF",
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#121927",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#232A3A",
  },

  cardTitle: {
    color: "#E6F0FF",
    fontSize: 18,
    fontWeight: "700",
  },

  cardSub: {
    color: "#98A2B3",
    marginTop: 4,
  },

  emoji: {
    fontSize: 36,
    marginBottom: 8,
  },

  emptyCard: {
    borderColor: "#232A3A",
    borderWidth: 1,
    backgroundColor: "#121927",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginTop: 24,
  },

  emptyTitle: {
    color: "#98A2B3",
  },

  totalText: {
    color: "#98A2B3",
    marginTop: 8,
  },

  cta: {
    backgroundColor: "#12E29A",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
  },

  ctaText: {
    color: "#061018",
    fontWeight: "700",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  errorText: {
    color: "#FF5C5C",
  },

  // FAB
  fab: {
    position: "absolute",
    right: 24,
    bottom: 100, // on le garde au-dessus de la tab bar
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#12E29A",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 50,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
});
