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
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Stack,
  useLocalSearchParams,
  useFocusEffect,
  useRouter,
} from "expo-router";
import {
  getWorkout,
  finishWorkout,
  type Workout,
  addWorkoutItem,
} from "../../../src/lib/workouts";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // form ajout exercice
  const [exId, setExId] = useState("");
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("");
  const [rest, setRest] = useState("");
  const [adding, setAdding] = useState(false);

  // suivi local des sets cochés
  const [doneSets, setDoneSets] = useState<Record<string, Set<number>>>({});

  // clé unique d'un exercice pour le suivi des sets cochés
  const keyFor = useCallback(
    (exerciseId: string, order: number) => `${exerciseId}-${order}`,
    []
  );

  // toggle (cocher / décocher) une série
  const toggleSet = useCallback(
    (exerciseId: string, order: number, setIndex: number) => {
      const k = keyFor(exerciseId, order);
      setDoneSets((prev) => {
        const copy = { ...prev };
        const s = new Set(copy[k] ?? []);
        if (s.has(setIndex)) {
          s.delete(setIndex);
        } else {
          s.add(setIndex);
        }
        copy[k] = s;
        return copy;
      });
    },
    [keyFor]
  );

  // bouton "valider le prochain set"
  const nextSet = useCallback(
    (exerciseId: string, order: number, totalSets: number) => {
      const k = keyFor(exerciseId, order);
      const s = doneSets[k] ?? new Set<number>();
      const next = [...Array(totalSets).keys()].find((i) => !s.has(i));
      if (next !== undefined) {
        toggleSet(exerciseId, order, next);
      }
    },
    [doneSets, keyFor, toggleSet]
  );

  // charge le workout depuis l'API
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
  useEffect(() => {
    load();
  }, [load]);

  // Recharge quand on revient sur l'écran
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Marquer la séance comme terminée
  const onFinish = useCallback(async () => {
    if (!data || data.finishedAt) return;

    setFinishing(true);

    // Optimiste: on marque terminé localement tout de suite
    const previous = data;
    setData({ ...data, finishedAt: new Date().toISOString() });

    try {
      await finishWorkout(String(id));
      Alert.alert("Séance terminée ✅");
    } catch (e: any) {
      // Rollback si erreur
      setData(previous);
      Alert.alert("Erreur", e?.message || "Impossible de terminer");
    } finally {
      setFinishing(false);
    }
  }, [data, id]);

  // Ajouter un exercice à la séance
  const onAddItem = useCallback(async () => {
    const exerciseId = exId.trim();
    const r = Number(reps);
    const wkg = weight ? Number(weight) : undefined;
    const rs = rest ? Number(rest) : undefined;

    if (!exerciseId) {
      Alert.alert("Exercice requis", "Renseigne un exerciseId.");
      return;
    }

    if (!Number.isFinite(r) || r <= 0) {
      Alert.alert(
        "Série invalide",
        "Indique un nombre de répétitions valide (> 0)."
      );
      return;
    }

    try {
      setAdding(true);
      const updated = await addWorkoutItem(String(id), {
        exerciseId,
        reps: r,
        weight: wkg,
        rest: rs,
      });

      // si l'API renvoie le workout complet mis à jour -> on le met direct
      if (updated?.items && Array.isArray(updated.items)) {
        setData(updated);
      } else {
        // sinon on refetch proprement
        await load();
      }

      // reset du formulaire
      setExId("");
      setReps("10");
      setWeight("");
      setRest("");

      Alert.alert("OK", "Exercice ajouté.");
    } catch (e: any) {
      Alert.alert(
        "Erreur",
        e?.message || "Impossible d'ajouter l'exercice."
      );
    } finally {
      setAdding(false);
    }
  }, [exId, reps, weight, rest, id, load]);

  // Titre affiché dans le header natif
  const title = data?.title || "Séance";

  // Texte statut (terminée ou pas)
  const finishedAtText = useMemo(() => {
    if (!data?.finishedAt) return "🕓 En cours";
    const d = new Date(data.finishedAt);
    return `✅ Terminée le ${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  }, [data?.finishedAt]);

  // Sécurité pendant le tout premier chargement
  if (loading && !data) {
    return (
      <SafeAreaView style={s.center} edges={["top", "bottom"]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  // On est prêt à afficher l'écran
  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title }} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Carte d'info */}
        <View style={s.card}>
          {data?.note ? <Text style={s.note}>{data.note}</Text> : null}
          <Text style={s.status}>{finishedAtText}</Text>
        </View>

        {/* Action "marquer terminé" */}
        {!data?.finishedAt && (
          <Pressable
            style={[s.cta, finishing && { opacity: 0.6 }]}
            onPress={onFinish}
            disabled={finishing}
          >
            <Text style={s.ctaText}>
              {finishing ? "Validation…" : "Marquer terminé"}
            </Text>
          </Pressable>
        )}

        {/* Liste des exercices */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Exercices</Text>

          {data?.items && data.items.length > 0 ? (
            data.items.map((it, idx) => {
              const k = keyFor(it.exerciseId, it.order);
              const done = doneSets[k] ?? new Set<number>();

              return (
                <View
                  key={`${it.exerciseId}-${it.order}-${idx}`}
                  style={s.exerciseItem}
                >
                  <View style={s.exerciseHeader}>
                    <Text style={s.exerciseTitle}>
                      #{it.order} - {it.exerciseId}
                    </Text>
                    <Text style={s.progressText}>
                      {done.size}/{it.sets?.length ?? 0}
                    </Text>
                  </View>

                  {(it.sets || []).map((set, i) => {
                    const isDone = done.has(i);
                    const isDisabled = !!data?.finishedAt;
                    return (
                      <Pressable
                        key={i}
                        onPress={() =>
                          !isDisabled &&
                          toggleSet(it.exerciseId, it.order, i)
                        }
                        style={s.setRow}
                        disabled={isDisabled}
                      >
                        <Text
                          style={{
                            color: isDone ? "#12E29A" : "#98A2B3",
                          }}
                        >
                          {isDone ? "✓ " : "• "}
                          Série {i + 1}: {set.reps} reps
                          {typeof set.weight === "number"
                            ? ` @${set.weight}kg`
                            : ""}
                          {typeof set.rest === "number"
                            ? ` (repos ${set.rest}s)`
                            : ""}
                        </Text>
                      </Pressable>
                    );
                  })}

                  {(it.sets?.length ?? 0) > 0 && !data?.finishedAt && (
                    <Pressable
                      onPress={() =>
                        nextSet(it.exerciseId, it.order, it.sets!.length)
                      }
                      style={s.nextSetBtn}
                    >
                      <Text style={s.ctaText}>Valider le prochain set</Text>
                    </Pressable>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={{ color: "#98A2B3" }}>
              Aucun exercice pour l’instant.
            </Text>
          )}
        </View>

        {/* Formulaire d'ajout d'exercice */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>+ Ajouter un exercice</Text>

          <Text style={s.label}>Titre de l'exercice</Text>
          <TextInput
            value={exId}
            onChangeText={setExId}
            placeholder="ex: bench"
            placeholderTextColor="#6B7280"
            style={s.input}
            autoCapitalize="none"
            editable={!data?.finishedAt}
          />

          <Text style={s.label}>Répétitions</Text>
          <TextInput
            value={reps}
            onChangeText={setReps}
            keyboardType="numeric"
            placeholder="10"
            placeholderTextColor="#6B7280"
            style={s.input}
            editable={!data?.finishedAt}
          />

          <Text style={s.label}>Poids (kg)</Text>
          <TextInput
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholder="ex: 60"
            placeholderTextColor="#6B7280"
            style={s.input}
            editable={!data?.finishedAt}
          />

          <Text style={s.label}>Temps de repos (sec)</Text>
          <TextInput
            value={rest}
            onChangeText={setRest}
            keyboardType="numeric"
            placeholder="ex: 90"
            placeholderTextColor="#6B7280"
            style={s.input}
            editable={!data?.finishedAt}
          />

          <Pressable
            style={[
              s.cta,
              (adding || !!data?.finishedAt) && { opacity: 0.6 },
            ]}
            onPress={onAddItem}
            disabled={adding || !!data?.finishedAt}
          >
            <Text style={s.ctaText}>
              {adding ? "Ajout…" : "Ajouter l'exercice"}
            </Text>
          </Pressable>

          {!!data?.finishedAt && (
            <Text style={s.disabledText}>
              La séance est terminée — ajout désactivé.
            </Text>
          )}
        </View>

        {/* Bouton réinitialiser la progression */}
        {Object.keys(doneSets).length > 0 && !data?.finishedAt && (
          <Pressable
            onPress={() => {
              Alert.alert(
                "Réinitialiser la progression",
                "Es-tu sûr de vouloir réinitialiser toutes les séries validées ?",
                [
                  { text: "Annuler", style: "cancel" },
                  {
                    text: "Réinitialiser",
                    onPress: () => setDoneSets({}),
                    style: "destructive",
                  },
                ]
              );
            }}
            style={[s.secondary, { marginBottom: 8 }]}
          >
            <Text style={[s.secondaryText, { color: "#EF4444" }]}>
              Réinitialiser la progression
            </Text>
          </Pressable>
        )}

        {/* Bouton retour */}
        <Pressable style={s.secondary} onPress={() => router.back()}>
          <Text style={s.secondaryText}>Retour</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1420", padding: 16 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F1420",
  },

  card: {
    borderWidth: 1,
    borderColor: "#232A3A",
    backgroundColor: "#121927",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  note: { color: "#98A2B3", marginBottom: 8 },
  status: { color: "#E6F0FF", fontWeight: "600" },

  sectionTitle: {
    color: "#E6F0FF",
    fontWeight: "700",
    marginBottom: 12,
    fontSize: 16,
  },

  exerciseItem: { marginBottom: 16 },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  exerciseTitle: {
    color: "#E6F0FF",
    fontWeight: "600",
    fontSize: 15,
    flex: 1,
  },
  progressText: {
    color: "#12E29A",
    fontWeight: "700",
    fontSize: 14,
  },
  setRow: { paddingVertical: 6 },

  nextSetBtn: {
    backgroundColor: "#12E29A",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },

  cta: {
    backgroundColor: "#12E29A",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  ctaText: { color: "#061018", fontWeight: "700" },

  secondary: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryText: { color: "#98A2B3", fontWeight: "600" },

  label: {
    color: "#12E29A",
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#232A3A",
    backgroundColor: "#0F1420",
    color: "#E6F0FF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  disabledText: {
    color: "#98A2B3",
    marginTop: 8,
    fontSize: 13,
  },
});
