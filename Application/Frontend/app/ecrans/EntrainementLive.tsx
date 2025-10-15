import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Button, Alert, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "app/navigation/NavigateurApp";
import { getWorkout, finishWorkout, type Workout } from "@/api/workouts";

// ✅ CORRECTION 1 : Nom de route corrigé (sans accent)
type Props = NativeStackScreenProps<RootStackParamList, "Entrainement">;
// ANCIEN : "Entraînement" ❌
// NOUVEAU : "Entrainement" ✅

export default function EntrainementLive({ route, navigation }: Props) {
  const { id } = route.params;
  const [data, setData] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);

  // état "done" côté client (si ton back ne gère pas encore le done par set)
  const [done, setDone] = useState<Record<string, boolean>>({}); // clé "exoIdx-setIdx"

  useEffect(() => {
    (async () => {
      try {
        const w = await getWorkout(id);
        // ✅ CORRECTION 2 : Vérification que w existe
        if (!w) {
          Alert.alert("Erreur", "Workout introuvable.");
          navigation.goBack();
          return;
        }
        setData(w);
      } catch (e) {
        Alert.alert("Erreur", "Impossible de charger le workout.");
        // ✅ CORRECTION 3 : Retour en arrière en cas d'erreur
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigation]); // ✅ Ajout de navigation dans les dépendances

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  if (!data) return <Text style={{ padding: 16 }}>Introuvable.</Text>;

  const totalSets = (data.items ?? []).reduce((acc, it) => acc + (it.sets?.length ?? 0), 0);
  const doneCount = Object.values(done).filter(Boolean).length;
  const progress = totalSets ? Math.round((doneCount / totalSets) * 100) : 0;

  function toggle(idx: number, sIdx: number) {
    const key = `${idx}-${sIdx}`;
    setDone((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function onFinish() {
    // ✅ CORRECTION 4 : Vérification que tous les sets sont faits (optionnel mais recommandé)
    if (doneCount < totalSets) {
      Alert.alert(
        "Séance incomplète",
        `Tu as validé ${doneCount}/${totalSets} sets. Veux-tu quand même terminer ?`,
        [
          { text: "Annuler", style: "cancel" },
          { text: "Terminer quand même", onPress: () => completeWorkout() }
        ]
      );
      return;
    }
    completeWorkout();
  }

  async function completeWorkout() {
    try {
      const result = await finishWorkout(id);
      // ✅ CORRECTION 5 : Vérification du résultat
      if (!result) {
        throw new Error("Réponse invalide du serveur");
      }
      Alert.alert("Bravo !", "Séance terminée ✅");
      // ✅ CORRECTION 6 : navigate au lieu de replace (permet le retour)
      navigation.navigate("Détails", { id });
      // ANCIEN : navigation.replace("Détails", { id }); ❌
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de terminer la séance.");
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>{data.title}</Text>
      <Text style={{ opacity: 0.8 }}>Progression : {doneCount}/{totalSets} ({progress}%)</Text>

      {(data.items ?? []).map((it, idx) => (
        <View key={idx} style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: "#333", borderRadius: 10 }}>
          <Text style={{ fontWeight: "700", marginBottom: 6 }}>{it.exerciseId}</Text>
          {it.sets?.map((s, sIdx) => {
            const key = `${idx}-${sIdx}`;
            const checked = !!done[key];
            return (
              <TouchableOpacity
                key={sIdx}
                onPress={() => toggle(idx, sIdx)}
                style={{
                  padding: 10,
                  borderWidth: 1,
                  borderColor: checked ? "#4ea" : "#555",
                  borderRadius: 8,
                  marginTop: 6,
                  backgroundColor: checked ? "rgba(0,255,170,0.08)" : "transparent",
                }}
              >
                <Text>
                  Set {sIdx + 1} — {s.reps} reps{typeof s.weight === "number" ? ` @ ${s.weight}kg` : ""} — repos {s.rest ?? 0}s
                  {checked ? "  ✅" : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      <Button title="Terminer la séance" onPress={onFinish} />
    </View>
  );
}
