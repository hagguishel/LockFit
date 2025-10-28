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

// API client vers ton backend NestJS
// - listWorkouts() -> GET /workouts
// - deleteWorkout() -> DELETE /workouts/:id
// - Workout -> type aligné backend
import {
  listWorkouts,
  deleteWorkout,
  type Workout,
} from "@/lib/workouts";

/* -------------------------------------------------
   Helpers calendrier / semaine
   ------------------------------------------------- */

// Labels des jours dans la barre semaine
const daysLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

/**
 * startOfWeek(d)
 * Retourne le début de semaine pour la date d.
 */
function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 7) % 7; // 0 = dimanche
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

/**
 * addDays(d, n)
 * Retourne une nouvelle date: d + n jours.
 */
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * isSameDay(a,b)
 * Compare juste AAAA-MM-JJ (pas l'heure).
 */
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/* -------------------------------------------------
   Helpers produit (calcul affichage)
   ------------------------------------------------- */

/**
 * computeTotalSets(workout)
 * Compte le nombre total de séries (= sets)
 * en additionnant pour chaque exercice.
 */
function computeTotalSets(workout: any): number {
  if (!workout?.items) return 0;

  return workout.items.reduce((acc: number, item: any) => {
    const count = Array.isArray(item?.sets) ? item.sets.length : 0;
    return acc + count;
  }, 0);
}

/**
 * computeEstimatedDurationMin(workout)
 * Estimation rapide de la durée :
 * - chaque série = ~30s de travail
 * - repos entre séries = set.rest si dispo sinon 60s
 */
function computeEstimatedDurationMin(workout: any): number {
  if (!workout?.items) return 0;

  let totalSec = 0;

  for (const item of workout.items) {
    if (!item?.sets) continue;

    for (const set of item.sets) {
      const restSeconds =
        typeof set?.rest === "number" ? set.rest : 60; // fallback 60s
      totalSec += restSeconds + 30; // 30s exécution de la série
    }
  }

  return Math.ceil(totalSec / 60);
}

/**
 * computeProgressRatio(workout)
 * Retourne un ratio entre 0 et 1.
 * Ici : 1 = terminé (finishedAt existe), sinon 0.
 */
function computeProgressRatio(workout: any): number {
  return workout?.finishedAt ? 1 : 0;
}

/* -------------------------------------------------
   Composant principal : l'onglet Workouts
   ------------------------------------------------- */

export default function WorkoutsTabScreen() {
  const router = useRouter();

  // Données venant du backend
  const [items, setItems] = useState<Workout[]>([]);
  const [total, setTotal] = useState(0);

  // États UI / réseau
  const [loading, setLoading] = useState(true); // premier chargement
  const [refreshing, setRefreshing] = useState(false); // pull-to-refresh
  const [error, setError] = useState<string | null>(null); // message erreur API

  // Semaine / jour sélectionné pour la barre en haut
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date())
  );
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  /**
   * load()
   * Va chercher les workouts via GET /workouts
   * et remplit items[] + total
   */
  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const res = await listWorkouts(); // { items, total }
      setItems(res.items);
      setTotal(res.total ?? res.items.length);
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  // Chargement initial de l'écran
  useEffect(() => {
    load();
  }, [load]);

  /**
   * onRefresh()
   * Utilisé par le pull-to-refresh (glisser vers le bas).
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  /**
   * handleDelete(id)
   * Supprime un workout :
   * 1. appelle DELETE /workouts/:id
   * 2. enlève ce workout du state local
   */
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteWorkout(id);
        setItems((prev) => prev.filter((w) => w.id !== id));
        setTotal((prev) => Math.max(prev - 1, 0));
      } catch (e: any) {
        console.error("Erreur suppression", e?.message || e);
      }
    },
    [setItems, setTotal]
  );

  const s = styles;

  /**
   * listContent
   * Rendu principal selon l'état:
   * - chargement
   * - erreur
   * - vide
   * - liste réelle
   */
  const listContent = useMemo(() => {
    // 1. état "loading"
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

    // 3. état "aucun entraînement"
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

    // 4. état normal -> liste
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
            paddingBottom: 160, // espace pour ne pas masquer par le FAB
          }}
          renderItem={({ item }) => {
            // On calcule les infos affichées pour cette carte
            const totalSets = computeTotalSets(item);
            const estimatedDurationMin = computeEstimatedDurationMin(item);
            const progressRatio = computeProgressRatio(item);
            const isDone = progressRatio === 1;

            return (
              <View style={s.workoutCard}>
                {/* Ligne du haut : titre + bouton poubelle */}
                <View style={s.cardHeaderRow}>
                  {/* Titre cliquable -> ouvrira le détail (étape 2) */}
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => {
                      // On pousse vers /workouts/[id]
                      // L'écran sera fait à l'étape 2
                      router.push(`/workouts/${item.id}`);
                    }}
                  >
                    <Text style={s.workoutTitle}>
                      {item.title || "Sans nom"}
                    </Text>
                  </Pressable>

                  {/* Bouton suppression -> handleDelete */}
                  <Pressable
                    onPress={() => {
                      handleDelete(item.id);
                    }}
                    style={s.deleteBtn}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color="#FF6B6B"
                    />
                  </Pressable>
                </View>

                {/* Ligne méta sous le titre */}
                {isDone ? (
                  // Séance terminée
                  <Text
                    style={[
                      s.workoutMeta,
                      { color: "#12E29A" }, // vert "succès"
                    ]}
                  >
                    Terminé ✅
                  </Text>
                ) : (
                  // Séance pas terminée
                  <Text style={s.workoutMeta}>
                    ~{estimatedDurationMin} min  •  {totalSets} séries
                  </Text>
                )}

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

  // Rendu global de l'écran
  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      {/* HEADER haut */}
      <View style={s.header}>
        <Text style={s.title}>Mes entraînements</Text>

        {/* Bouton calendrier (placeholder) */}
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

      {/* Barre semaine */}
      <WeekStrip
        weekStart={weekStart}
        selectedDay={selectedDay}
        onPrevWeek={() => setWeekStart(addDays(weekStart, -7))}
        onNextWeek={() => setWeekStart(addDays(weekStart, +7))}
        onSelectDay={setSelectedDay}
      />

      {/* espace visuel */}
      <View style={{ height: 16 }} />

      {/* Contenu dynamique (liste / vide / erreur / loader) */}
      {listContent}

      {/* FAB flottant "+" (création séance -> étape 3) */}
      <Pressable
        onPress={() => {
          router.push("/workouts/new");
        }}
        style={s.fab}
      >
        <Ionicons name="add" size={32} color="#061018" />
      </Pressable>
    </SafeAreaView>
  );
}

/* -------------------------------------------------
   Composant WeekStrip
   -> Le bandeau semaine (Dim Lun Mar ...)
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
  // Jours de la semaine courante
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
              {/* pastille ronde du jour */}
              <View
                style={[
                  styles.dayDot,
                  active && { backgroundColor: "#12E29A" },
                ]}
              />
              {/* label du jour (Dim, Lun, ...) */}
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
   Styles (tous les styles inline sans thème externe)
   ------------------------------------------------- */

const styles = StyleSheet.create({
  // Conteneur global écran
  container: {
    flex: 1,
    backgroundColor: "#0F1420", // fond global
    paddingHorizontal: 16,
    position: "relative",
  },

  // Header en haut (titre + bouton calendrier)
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 12,
    alignItems: "center",
  },

  title: {
    color: "#E6F0FF",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
  },

  iconBtn: {
    backgroundColor: "rgba(255,255,255,0.05)", // léger overlay
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
    backgroundColor: "#1C1F2A", // pastille neutre
  },

  dayLabel: {
    color: "#98A2B3",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },

  // Titre de la section "Workouts du jour"
  sectionTitle: {
    color: "#E6F0FF",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 12,
  },

  // Carte workout
  workoutCard: {
    backgroundColor: "#121927",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#232A3A",
    gap: 6,

    // ombre douce
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  // Ligne du haut dans la carte: titre + poubelle
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Bouton supprimer (poubelle rouge)
  deleteBtn: {
    marginLeft: 6,
    padding: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255,0,0,0.07)",
  },

  // Titre du workout
  workoutTitle: {
    color: "#E6F0FF",
    fontSize: 16,
    fontWeight: "700",
  },

  // Texte sous le titre
  workoutMeta: {
    color: "#98A2B3",
    fontSize: 14,
    fontWeight: "500",
  },

  // Barre de progression (track)
  progressBarTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "#1C1F2A",
    overflow: "hidden",
  },

  // Barre de progression (remplissage vert)
  progressBarFill: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "#12E29A",
  },

  // Bouton "COMMENCER" / "TERMINÉ"
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
    lineHeight: 18,
  },

  // Variante visuelle si la séance est déjà finie
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
    marginBottom: 6,
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
    marginTop: 6,
  },

  cta: {
    backgroundColor: "#12E29A",
    paddingVertical: 8,
    paddingHorizontal: 12,
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
    color: "#FF6B6B",
  },

  // FAB flottant "+"
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

    // ombre du bouton flottant
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 50,
  },
});
