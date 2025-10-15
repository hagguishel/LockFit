import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ActivityIndicator, TextInput, Button, Alert, FlatList } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/NavigateurApp";
// ✅ CORRECTION 1 : Import sans WorkoutItem (on va le définir localement)
import { getWorkout, addWorkoutItem } from "@/api/workouts";
import type { Workout, WorkoutItem } from "@/types/workout";
type Props = NativeStackScreenProps<RootStackParamList, "Détails">;

export default function DetailsEntrainement({ route, navigation }: Props) {
  const { id } = route.params;
  const [data, setData] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);

  // formulaire d'ajout rapide
  const [exo, setExo] = useState("");
  const [reps, setReps] = useState("8");
  const [weight, setWeight] = useState("");
  const [rest, setRest] = useState("90");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const w = await getWorkout(id);
      // ✅ CORRECTION 3 : Vérification que w existe
      if (!w) {
        Alert.alert("Erreur", "Workout introuvable.");
        navigation.goBack();
        return;
      }
      setData(w);
    } catch (e) {
      Alert.alert("Erreur", "Impossible de charger le workout.");
    } finally {
      setLoading(false);
    }
  }, [id, navigation]); // ✅ Ajout de navigation dans les dépendances

  useEffect(() => { load(); }, [load]);

  async function onAddItem() {
    const name = exo.trim();
    if (!name) return;
    try {

      const currentItems: WorkoutItem[] = (data?.items ?? []) as WorkoutItem[];
      const nextOrder = currentItems.length + 1;

      const item: WorkoutItem = {
        exerciseId: name,
        order: nextOrder,
        sets: [{
          reps: Number(reps) || 8,
          weight: weight ? Number(weight) : undefined,
          rest: Number(rest) || 90,
        }],
      };
      // optimistic: affiche direct
      setData((prev: Workout | null) =>
        (prev ? { ...prev, items: [...(prev.items ?? [] as WorkoutItem[]), item ] } : prev
    ));

      // sync API
      const updated = await addWorkoutItem(id, item);
      // ✅ CORRECTION 4 : Vérification que updated existe
      if (!updated) {
        throw new Error("Réponse invalide du serveur");
      }
      setData(updated);

      setExo(""); setReps("8"); setWeight(""); setRest("90");
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Ajout impossible.");
      // reload si échec pour resync
      load();
    }
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  if (!data) return <Text style={{ padding: 16 }}>Introuvable.</Text>;

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>{data.title}</Text>
      {data.note ? <Text style={{ opacity: 0.8 }}>{data.note}</Text> : null}

      <View style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: "700" }}>Ajouter un exercice</Text>
        <TextInput placeholder="Ex: Tractions" value={exo} onChangeText={setExo}
          style={{ borderWidth: 1, borderColor: "#555", padding: 8, borderRadius: 8, marginTop: 6 }} />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
          <TextInput placeholder="reps" keyboardType="numeric" value={reps} onChangeText={setReps}
            style={{ flex: 1, borderWidth: 1, borderColor: "#555", padding: 8, borderRadius: 8 }} />
          <TextInput placeholder="poids" keyboardType="numeric" value={weight} onChangeText={setWeight}
            style={{ flex: 1, borderWidth: 1, borderColor: "#555", padding: 8, borderRadius: 8 }} />
          <TextInput placeholder="repos (s)" keyboardType="numeric" value={rest} onChangeText={setRest}
            style={{ flex: 1, borderWidth: 1, borderColor: "#555", padding: 8, borderRadius: 8 }} />
        </View>
        <Button title="Ajouter l'exercice" onPress={onAddItem} />
      </View>

      <FlatList
        data={data.items ?? []}
        keyExtractor={(_, i) => String(i)}
        ListEmptyComponent={<Text style={{ opacity: 0.7 }}>Aucun exercice pour l'instant.</Text>}
        renderItem={({ item }) => (
          <View style={{ marginTop: 10, padding: 12, borderWidth: 1, borderColor: "#333", borderRadius: 10 }}>
            <Text style={{ fontWeight: "700" }}>{item.exerciseId}</Text>
            {(item.sets ?? []).map((s, i) => (
              <Text key={i} style={{ opacity: 0.85, marginTop: 6 }}>
                • {s.reps} reps{typeof s.weight === "number" ? ` @ ${s.weight}kg` : ""} — repos {s.rest ?? 0}s
              </Text>
            ))}
          </View>
        )}
      />

      {/* ✅ CORRECTION 5 : NOM DE ROUTE CORRIGÉ (sans accent) */}
      <Button title="Démarrer la séance" onPress={() => navigation.navigate("Entrainement", { id })} />
      {/* ANCIEN : "Entraînement" ❌ */}
      {/* NOUVEAU : "Entrainement" ✅ */}
    </View>
  );
}
