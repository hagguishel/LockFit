// Écran principal "Mes entraînements"
// Fichier : app/(tabs)/workouts/index.tsx

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

// (Pas encore utilisé partout mais on les garde pour la suite du design thème)
import theme from "@/theme/colors";
import layout from "@/theme/layout";
import typography from "@/theme/typography";

// IMPORTANT : on utilise ton client métier
// - listWorkouts() -> GET /workouts
// - deleteWorkout() -> DELETE /workouts/:id
// - Workout -> type partagé
import {
  listWorkouts,
  deleteWorkout,
  type Workout,
} from "@/lib/workouts";

/* -------------------------------------------------
   Helpers calendrier / semaine
   ------------------------------------------------- */

// Labels des jours pour la barre semaine
const daysLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

// Début de semaine pour une date donnée
function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 7) % 7; // 0=dimanche etc.
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

// d + n jours
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Compare juste la date (AAAA-MM-JJ), pas l'heure
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/* -------------------------------------------------
   Helpers produit (calculs d'affichage)
   -------------------------------------------------
   NOTE :
   On tape dans `any` exprès pour être tolérant avec TS,
   car ton type Workout côté front peut ne pas forcément
   refléter 1:1 ce que Prisma renvoie, surtout sur les sous-objets.
   Le runtime reste bon parce que ça vient direct du back.
---------------------------------------------------*/

/**
 * computeTotalSets(workout)
 * -> nombre total de séries prévues dans ce workout
 * On additionne la longueur des `sets` de chaque item.
 */
function computeTotalSets(workout: any): number {
  if (!workout?.items) return 0;

  return workout.items.reduce((acc: number, item: any) => {
    const safeLen = Array.isArray(item?.sets) ? item.sets.length : 0;
    return acc + safeLen;
  }, 0);
}

/**
 * computeEstimatedDurationMin(workout)
 * -> estimation de la durée d'une séance en minutes
 * On parcourt toutes les séries :
 *   - 30s d'exécution par série
 *   - + repos (rest) si défini, sinon 60s par défaut
 * puis on convertit en minutes arrondies.
 */
function computeEstimatedDurationMin(workout: any): number {
  if (!workout?.items) return 0;

  let totalSec = 0;

  for (const item of workout.items) {
    if (!item?.sets) continue;

    for (const set of item.sets) {
      const restSeconds =
        typeof set?.rest === "number" ? set.rest : 60; // fallback 60s
      totalSec += restSeconds + 30; // 30s = temps d'exécution estimé
    }
  }

  return Math.ceil(totalSec / 60);
}

/**
 * computeProgressRatio(workout)
 * -> 1 si le workout est terminé
 * -> 0 sinon
 * Pour l'instant on se base juste sur finishedAt.
 * Plus tard on pourra faire "nb sets faits / nb sets total".
 */
function computeProgressRatio(workout: any): number {
  return workout?.finishedAt ? 1 : 0;
}

/* -------------------------------------------------
   Composant principal : l'onglet "Workouts"
   ------------------------------------------------- */

export default function WorkoutsTabScreen() {
  const router = useRouter();

  // === Données venant du backend ===
  const [items, setItems] = useState<Workout[]>([]);
  const [total, setTotal] = useState(0);

  // === États UI / réseau ===
  const [loading, setLoading] = useState(true); // chargement initial
  const [refreshing, setRefreshing] = useState(false); // pull-to-refresh
  const [error, setError] = useState<string | null>(null); // erreur backend / réseau

  // === États pour le bandeau semaine ===
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date())
  );
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  // =====================================================
  // load()
  // Appelle GET /workouts via listWorkouts()
  // Remplit items[] et total dans le state
  // =====================================================
  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // listWorkouts() parle déjà à ton back via http()
      // et renvoie { items, total }
      const res = await listWorkouts();

      setItems(res.items);
      setTotal(res.total ?? res.items.length);
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  // Appel initial au montage de l'écran
  useEffect(() => {
    load();
  }, [load]);

  // Pull-to-refresh de la FlatList
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // =====================================================
  // handleDelete(id)
  // - Supprime côté backend (DELETE /workouts/:id)
  // - Met à jour la liste locale sans recharger tout
  // =====================================================
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteWorkout(id); // backend OK
        // On retire le workout supprimé du state local
        setItems((prev) => prev.filter((w) => w.id !== id));
        setTotal((prev) => Math.max(prev - 1, 0));
      } catch (e: any) {
        console.error("Erreur suppression", e?.message || e);
        // plus tard: toast / Alert
      }
    },
    [setItems, setTotal]
  );

  const s = styles;

  // =====================================================
  // listContent
  // Rendu dynamique:
  // - spinner
  // - message d'erreur
  // - "aucun workout"
  // - la FlatList de workouts
  // =====================================================
  const listContent = useMemo(() => {
    // 1. état "chargement"
    if (loading)
      return (
        <View style={s.center}>
          <ActivityIndicator />
        </View>
      );

    // 2. état "erreur API"
    if (error)
      return (
        <View style={s.emptyCard}>
          <Text style={s.errorText}>{error}</Text>

          <Pressable onPress={load} style={s.cta}>
            <Text style={s.ctaText}>Réessayer</Text>
          </Pressable>
        </View>
      );

    // 3. état "pas de séances"
    if (items.length === 0)
      return (
        <View style={s.emptyCard}>
          <Text style={s.sectionTitle}>Workouts du jour</Text>
          <Text style={s.emoji}>🏋️‍♂️</Text>
          <Text style={s.emptyTitle}>
            Aucun workout prévu aujourd&apos;hui
          </Text>
        </View>
      );

    // 4. état normal -> liste des workouts
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
            paddingBottom: 160, // espace bas pour pas cacher le dernier sous le FAB
          }}
          renderItem={({ item }) => {
            // item = un workout venant du backend
            // On calcule les infos affichées
            const totalSets = computeTotalSets(item);
            const estimatedDurationMin = computeEstimatedDurationMin(item);
            const progressRatio = computeProgressRatio(item);
            const isDone = progressRatio === 1;

            return (
              <View style={s.workoutCard}>
                {/* Ligne du haut : titre à gauche / poubelle à droite */}
                <View style={s.cardHeaderRow}>
                  {/* Titre cliquable -> ouvre le détail */}
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => {
                      // Besoin d'un écran /workouts/[id].tsx (Étape 2)
                      router.push(`/workouts/${item.id}`);
                    }}
                  >
                    <Text style={s.workoutTitle}>
                      {item.title || "Sans nom"}
                    </Text>
                  </Pressable>

                  {/* Bouton supprimer -> appelle handleDelete */}
                  <Pressable
                    onPress={() => {
                      handleDelete(item.id);
                    }}
                    style={s.deleteBtn}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color="#FF5C5C"
                    />
                  </Pressable>
                </View>

                {/* "~9 min  •  4 séries" */}
                <Text style={s.workoutMeta}>
                  ~{estimatedDurationMin} min  •  {totalSets} séries
                </Text>

                {/* Barre de progression */}
                <View style={s.progressBarTrack}>
                  <View
                    style={[
                      s.progressBarFill,
                      { width: `${Math.min(progressRatio * 100, 100)}%` },
                    ]}
                  />
                </View>

                {/* Bouton COMMENCER / TERMINÉ */}
                <Pressable
                  onPress={() => {
                    router.push(`/workouts/${item.id}`);
                  }}
                  style={[s.startButton, isDone && s.startButtonDone]}
                >
                  <Text
                    style={[
                      s.startButtonText,
                      isDone && s.startButtonTextDone,
                    ]}
                  >
                    {isDone ? "TERMINÉ" : "COMMENCER"}
                  </Text>
                </Pressable>
              </View>
            );
          }}
          ListFooterComponent={
            <Text style={s.totalText}>Total: {total}</Text>
          }
        />
      </>
    );
  }, [
    loading,
    error,
    items,
    total,
    refreshing,
    onRefresh,
    s,
    router,
    load,
    handleDelete,
  ]);

  // =====================================================
  // Rendu global de l'écran
  // =====================================================
  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      {/* Header haut */}
      <View style={s.header}>
        <Text style={s.title}>Mes entraînements</Text>

        {/* petit bouton calendrier à droite */}
        <Pressable
          style={s.iconBtn}
          onPress={() => {
            console.log("calendar!");
            // plus tard -> router.push('/calendar')
          }}
        >
          <Ionicons name="calendar-outline" size={20} color="#E6F0FF" />
        </Pressable>
      </View>

      {/* Bandeau semaine (scroll dans le temps visuellement) */}
      <WeekStrip
        weekStart={weekStart}
        selectedDay={selectedDay}
        onPrevWeek={() => setWeekStart(addDays(weekStart, -7))}
        onNextWeek={() => setWeekStart(addDays(weekStart, +7))}
        onSelectDay={setSelectedDay}
      />

      <View style={{ height: 16 }} />

      {/* Liste / vide / erreur / spinner */}
      {listContent}

      {/* FAB flottant pour créer une nouvelle séance */}
      <Pressable
        onPress={() => {
          router.push("/workouts/new"); // Étape 3
        }}
        style={s.fab}
      >
        <Ionicons name="add" size={32} color="#061018" />
      </Pressable>
    </SafeAreaView>
  );
}

/* -------------------------------------------------
   Bandeau semaine
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
  // Génére les 7 jours: [dim, lun, mar, ...]
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

/* -------------------------------------------------
   Styles
   ------------------------------------------------- */
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
    backgroundColor: "#2A303F",
  },

  dayLabel: {
    color: "#98A2B3",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },

  // Titre section "Workouts du jour"
  sectionTitle: {
    color: "#E6F0FF",
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 10,
  },

  // Carte workout principale
  workoutCard: {
    backgroundColor: "#121927",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#232A3A",
    gap: 8,
  },

  // Ligne du haut dans la carte: titre + poubelle
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Bouton supprimer
  deleteBtn: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,0,0,0.07)", // léger fond rouge transparent
  },

  workoutTitle: {
    color: "#E6F0FF",
    fontSize: 16,
    fontWeight: "700",
  },

  workoutMeta: {
    color: "#98A2B3",
    fontSize: 14,
    fontWeight: "500",
  },

  progressBarTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "#2A303F",
    overflow: "hidden",
  },

  progressBarFill: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "#12E29A",
  },

  startButton: {
    backgroundColor: "#12E29A",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  startButtonText: {
    color: "#061018",
    fontWeight: "700",
    fontSize: 15,
  },

  startButtonDone: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#12E29A",
  },

  startButtonTextDone: {
    color: "#12E29A",
  },

  // États "vide", "erreur", etc.
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

  // FAB flottant en bas à droite
  fab: {
    position: "absolute",
    right: 24,
    bottom: 100, // reste au-dessus de la tab bar
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
