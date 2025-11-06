// 🎯 LiveWorkoutScreen
// Affiche un entraînement en live, permet d’ajuster reps/poids par série,
// valider les séries en temps réel, voir les exercices à venir, et terminer la séance.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// 🧩 Client API
import {
  getWorkout,
  completeSet,
  finishWorkout,
  updateWorkout,
  type Workout,
} from "@/lib/workouts";

/* =========================================================================
   🔧 Petits helpers UI
   ========================================================================= */
const inc = (v: number | null | undefined, step = 1, min = 0) =>
  Math.max(min, (v ?? 0) + step);
const dec = (v: number | null | undefined, step = 1, min = 0) =>
  Math.max(min, (v ?? 0) - step);

/* =========================================================================
   📱 Écran
   ========================================================================= */
export default function LiveWorkoutScreen() {
  type PatchableSet = { reps?: number; weight?: number| null; rest?: number | null };
  type PatchableItem ={ exerciseId?: string; order?: number; sets?: PatchableSet[] };

  function stripForPatch(items: Workout["items"] | undefined | null): PatchableItem[] {
    const safe: PatchableItem[] = [];
    for (const it  of items ?? []) {
      safe.push({
        exerciseId: it.exerciseId,
        order: typeof it.order === "number" ? it.order : undefined,
        sets: (it.sets ?? []).map((s) => ({
          reps: Number.isFinite(s.reps as any) ? (s.reps as number) : undefined,
          weight:
          typeof s.weight === "number"
          ? (s.weight as number)
          : s.weight === null
          ? null
          : undefined,
          rest:
          s.rest === null
          ? undefined
          :Number.isFinite(s.rest as any)
          ? (s.rest as number)
          : undefined,
        })),
      });
    }
    return safe;
  }
  const { id } = useLocalSearchParams<{ id: string }>(); // id du workout dans l’URL
  const router = useRouter();

  // 🧠 États
  const [data, setData] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* =======================================================================
     🔄 Charger la séance
     ======================================================================= */
  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      setLoading(true);
      console.log("🔄 Chargement séance:", id);
      const w = await getWorkout(id);
      console.log("✅ Données reçues:", w);
      setData(w);
    } catch (e: any) {
      console.error("❌ Erreur load():", e);
      setError(e?.message || "Impossible de charger la séance");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  /* =======================================================================
     🧩 Exercice courant + Exercices à venir
     - Exercice courant = premier qui contient une série non complétée
     ======================================================================= */
  const currentIndex = useMemo(() => {
    if (!data) return 0;
    const items = data.items ?? [];
    const i = items.findIndex((it) => (it.sets ?? []).some((s) => !s.completed));
    return i === -1 ? 0 : i;
  }, [data]);

  const currentItem = data?.items?.[currentIndex];
  const upcomingItems = data?.items?.slice(currentIndex + 1) ?? [];

  /* =======================================================================
     📊 Progression globale (%)
     ======================================================================= */
  const progressPct = useMemo(() => {
    if (!data) return 0;
    const sets = data.items?.flatMap((i) => i.sets ?? []) ?? [];
    if (!sets.length) return 0;
    const done = sets.filter((s) => s.completed).length;
    return Math.round((done / sets.length) * 100);
  }, [data]);

  /* =======================================================================
     💾 Sauvegarde auto (debounce + file d’attente)
     - À chaque modification locale, on schedule un PATCH minimal vers l’API
     ======================================================================= */
  // File de patches (items complets), on n’envoie jamais des sets isolés
  const pendingPatchRef = useRef<any | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<boolean>(false);

  const scheduleSave = useCallback(
    (nextItems: Workout["items"]) => {
      if (!id) return;
      // 1) On garde le dernier état à patcher
      pendingPatchRef.current = { items: nextItems };

      // 2) Debounce 500ms pour regrouper plusieurs clics
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(async () => {
        // Anti chevauchement d’appels API
        if (inflight.current) {
          setTimeout(() => scheduleSave(nextItems), 200);
          return;
        };
        try {
          inflight.current = true;
          setSaving(true);
          const raw = pendingPatchRef.current;
          pendingPatchRef.current = null;
          const payload = { items: stripForPatch(raw?.items) };

          console.log("📤 PATCH /workouts/:id (sanitized)", payload);
          await updateWorkout(id, payload as any);
          console.log("✅ Sauvegarde OK");
        } catch (e) {
          console.error("❌ Sauvegarde échouée", e);
          Alert.alert("Erreur", "Impossible de sauvegarder les changements (réseau/API).");
          // En cas d’erreur, on recharge la vérité serveur
          await load();
        } finally {
          inflight.current = false;
          setSaving(false);
        }
      }, 500);
    },
    [id, load]
  );

  /* =======================================================================
     🧱 Patch local d’un set (Optimistic UI) + schedule du PATCH serveur
     ======================================================================= */
  const patchSetLocal = useCallback(
    (setId: string, patch: Partial<{ reps: number; weight: number | null }>) => {
      setData((prev) => {
        if (!prev) return prev;
        const nextItems = (prev.items ?? []).map((it) => ({
          ...it,
          sets: (it.sets ?? []).map((s) => (s.id === setId ? { ...s, ...patch } : s)),
        }));
        // 👇 on schedule un PATCH serveur pour ce nouvel état
        scheduleSave(nextItems);
        return { ...prev, items: nextItems };
      });
    },
    [scheduleSave]
  );

  /* =======================================================================
     ✅ Valider une série (Optimistic UI + PATCH immédiat)
     ======================================================================= */
  const onCompleteSet = async (setId: string) => {
    if (!id || !data) return;
    console.log("🟢 Tap série:", setId);

    // 1) Optimistic UI
    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((it) => ({
              ...it,
              sets: it.sets.map((s) =>
                s.id === setId ? { ...s, completed: true } : s
              ),
            })),
          }
        : prev
    );

    // 2) Appel API (PATCH dédié)
    try {
      const updated = await completeSet(id, setId);
      console.log("✅ Série validée côté API:", updated);
    } catch (e) {
      console.error("❌ Erreur completeSet:", e);
      await load(); // rollback si erreur
      Alert.alert("Erreur", "Impossible de valider la série (réseau/API).");
    }
  };

  /* =======================================================================
     🏁 Terminer la séance
     ======================================================================= */
  const onFinish = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await finishWorkout(id);
      Alert.alert("Terminé", "Séance marquée comme terminée.");
      router.back();
    } catch (e) {
      console.error("❌ Erreur finishWorkout:", e);
      Alert.alert("Erreur", "Impossible de terminer la séance.");
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================================
     🌀 États de chargement/erreur
     ======================================================================= */
  if (loading)
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color="#12E29A" />
        </View>
      </SafeAreaView>
    );

  if (error || !data)
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.err}>{error || "Séance introuvable"}</Text>
          <Pressable style={styles.btnSec} onPress={load}>
            <Text style={styles.btnSecText}>Réessayer</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );

  /* =======================================================================
     🎨 Rendu principal
     ======================================================================= */
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#121528", "#0c0f1d", "#0a0d19"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>

          <View style={{ flex: 1 }}>
            <View style={styles.headerRow}>
              <Text style={styles.title} numberOfLines={1}>
                {data.title || "Séance"}
              </Text>
              {saving ? (
                <View style={styles.savingPill}>
                  <ActivityIndicator size="small" color="#061018" />
                  <Text style={styles.savingPillText}>Sauvegarde…</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.sub}>{progressPct}% complétée</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
          </View>
        </View>

        {/* CONTENU */}
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 🎯 Exercice en cours */}
          {currentItem ? (
            <View style={styles.card}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8}}>
                <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(18,226,154,0.12)",
                  borderWidth: 1.5,
                  borderColor: "rgba(18,226,156,0.35)",
                }}
                >
                  <Ionicons name="barbell-outline" size={22} color="#12E29A" />
                </View>
                <View style={{ flex: 1}}>
                  <Text style={styles.exercise}>{currentItem.exercise?.name ?? "Exercice"}</Text>
                  <Text style={styles.meta}>
                    {currentItem.sets.length} série x {currentItem.sets[0]?.reps ?? "?"} reps cible
                  </Text>
                </View>
              </View>

              {/* 🔁 En-tete du tableau */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, styles.thIndex]}>#</Text>
                  <Text style={styles.th}>KG</Text>
                  <Text style={styles.th}>REPS</Text>
                  <Text style={[styles.th, { textAlign: "right" }]}>FAIT</Text>
                </View>

              {/* Ligne par serie */}
              {currentItem.sets.map((s, i) => {
                const setReps = (delta: number) => {
                  const newReps = Math.max(0, (s.reps ?? 0) + delta);
                  patchSetLocal(s.id!, {reps: newReps });
                };

                const setKg = (delta: number) => {
                  const newKg = Math.max(0, (s.weight ?? 0) + delta);
                  patchSetLocal(s.id!, { weight: newKg});
                };

                return (
                  <View key={s.id || i}  style={[styles.tr, s.completed && styles.trDone]}>
                    {/* # */}
                    <View style={styles.tdIndex}>
                      <Text style={styles.indexText}>{i + 1}</Text>
                    </View>

                    {/* KG */}
                    <View style={styles.td}>
                      <View style={styles.stepper}>
                        <Pressable
                        disabled={s.completed}
                        onPress={() => setKg(-2.5)}
                        style={styles.stepBtn}>
                          <Ionicons name="remove" size={16} color="#7AD3FF" />
                        </Pressable>

                        {/* valeur afficher */}
                        <Text style={styles.stepVal}>{(s.weight ?? 0).toFixed(1)}</Text>

                        <Pressable
                        disabled={s.completed}
                        onPress={() => setKg(+2.5)}
                        style={styles.stepBtn}
                        >
                          <Ionicons name="add" size={16} color="#7AD3FF" />
                        </Pressable>
                      </View>
                    </View>

                    {/* REPS */}
                    <View style={styles.td}>
                      <View style={styles.stepper}>
                        <Pressable
                        disabled={s.completed}
                        onPress={() => setReps(-1)}
                        style={styles.stepBtn}
                        >
                          <Ionicons name="remove" size={16} color="#12E29A" />
                        </Pressable>
                        {/* valeur afficher */}
                        <Text style={styles.stepVal}>{s.reps ?? 0}</Text>
                        <Pressable
                        disabled={s.completed}
                        onPress={() => setReps(+1)}
                        style={styles.stepBtn}
                        >
                          <Ionicons name="add" size={16} color='#12E29A' />
                        </Pressable>
                      </View>
                    </View>

                    {/* FAIT */}
                    <View style={[styles.td, {alignItems: "flex-end" }]}>
                      <Pressable
                      onPress={() => onCompleteSet(s.id!)}
                      style={[
                        styles.checkBtn,
                        s.completed && { backgroundColor: "#12E29A", borderColor: "#12E29A" },
                      ]}
                      >
                        <Ionicons
                        name={s.completed ? "checkmark" : "ellipse-outline"}
                        size={18}
                        color={s.completed ? "#061018" : "#9FB0BD"} />
                      </Pressable>
                    </View>
                  </View>
                )
              })}
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.exercise}>Tout est terminé 🎉</Text>
            </View>
          )}

          {/* 🆕 Exercices à venir */}
          {upcomingItems.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Text style={styles.sectionTitle}>Exercices à venir</Text>
              {upcomingItems.map((it, i) => (
                <View key={i} style={styles.nextCard}>
                  <Ionicons name="time-outline" size={20} color="#7AD3FF" />
                  <View>
                    <Text style={styles.nextName}>
                      {it.exercise?.name ?? "Exercice"}
                    </Text>
                    <Text style={styles.nextMeta}>
                      {it.sets.length} séries • cible {it.sets[0]?.reps ?? "?"} reps
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 20 }} />

          {/* Bouton terminer */}
          <Pressable disabled={saving} onPress={onFinish} style={styles.btnPrimary}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color="#061018"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.btnPrimaryText}>
              {saving ? "..." : "Terminer la séance"}
            </Text>
          </Pressable>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

/* =========================================================================
   💅 Styles
   ========================================================================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f23" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  err: { color: "#FF6B6B", fontWeight: "600", marginBottom: 10 },

  header: { padding: 16, flexDirection: "row", alignItems: "center" },
  back: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", flexShrink: 1 },
  sub: { color: "#8C9BAD", fontSize: 12, marginTop: 2 },
  savingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#12E29A",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  savingPillText: { color: "#061018", fontWeight: "700", fontSize: 12 },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(122,211,255,0.12)",
    overflow: "hidden",
    marginTop: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#12E29A",
  },

  card: {
    backgroundColor: "rgba(14,17,30,0.65)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(124,211,255,0.08)",
    padding: 16,
  },
  exercise: { color: "#fff", fontSize: 16, fontWeight: "700" },
  meta: { color: "#7fe39b", marginTop: 4 },

  setRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0f1624",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(124,211,255,0.08)",
    padding: 12,
    marginTop: 10,
    gap: 12,
  },
  setRowDone: {
    backgroundColor: "rgba(18,226,154,0.12)",
    borderColor: "rgba(18,226,154,0.45)",
  },
  setRowText: { color: "#fff", fontWeight: "700", marginBottom: 8 },

  controls: { flexDirection: "row", gap: 12 },
  controlGroup: { gap: 4 },
  ctrlLabel: { color: "#8C9BAD", fontSize: 10, fontWeight: "700" },
  ctrlButtons: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(12,18,28,0.6)",
    borderWidth: 1,
    borderColor: "rgba(124,211,255,0.1)",
    borderRadius: 999,
    paddingHorizontal: 8,
    height: 36,
    gap: 10,
  },
  ctrlBtn: { padding: 4 },
  ctrlValue: { color: "#FFFFFF", fontWeight: "700", minWidth: 28, textAlign: "center" },

  sectionTitle: { color: "#7AD3FF", fontWeight: "700", marginBottom: 8, marginTop: 6 },
  nextCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(12,18,28,0.6)",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(124,211,255,0.06)",
  },
  nextName: { color: "#fff", fontWeight: "600" },
  nextMeta: { color: "#8C9BAD", fontSize: 12 },

  btnPrimary: {
    backgroundColor: "#12E29A",
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnPrimaryText: { color: "#061018", fontSize: 15, fontWeight: "700" },

  btnSec: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(122,211,255,0.4)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  btnSecText: { color: "#7AD3FF", fontWeight: "600" },

  // Style tableau
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(124,221,255,0.08)",
  },
  th: {
    flex: 1,
    color: "#8C9BAD",
    fontSize: 12,
    fontWeight: "700",
  },
  thIndex: {
    flex: 0.5,
    textAlign: "center",
  },
  tr: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: "#0f1624",
    borderColor: "rgba(124,211,255,0.08)",
    borderWidth: 1,
    gap: 8,
  },
  trDone: {
    backgroundColor: "rgba(18,226,154,0.12)",
  },

  tdIndex: { flex: 0.5, alignItems: "center", justifyContent: "center"},
  indexText: { color: "#fff", fontWeight: "800" },
  td: { flex: 1 },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(12,18,28,0.6)",
    height: 36,
    paddingHorizontal: 8,
    gap: 6,
  },
  stepBtn: { padding: 4 },
  stepVal: { minWidth: 28, textAlign: "center", color: "#FFFFFF", fontWeight: "700" },

  checkBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(159,176,189,0.35)",
    alignItems: "center",
    justifyContent: "center",
  }
});
