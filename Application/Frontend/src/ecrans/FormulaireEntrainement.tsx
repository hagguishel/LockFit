import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, FlatList, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/NavigateurApp";
import { createWorkout } from "@/api/workouts";

type Props = NativeStackScreenProps<RootStackParamList, "Nouveau">;

type TmpSet = { reps: string; weight: string; restSec: string };
type TmpItem = { exerciseName: string; sets: TmpSet[] };

export default function FormulaireEntrainement({ navigation }: Props) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<TmpItem[]>([]);
  const [newExo, setNewExo] = useState("");

  function addTmpItem() {
    const name = newExo.trim();
    if (!name) return;
    const item: TmpItem = {
      exerciseName: name,
      sets: [{ reps: "8", weight: "", restSec: "90" }],
    };
    setItems((prev) => [...prev, item]);
    setNewExo("");
  }

  function addSetAt(idx: number) {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], sets: [...copy[idx].sets, { reps: "8", weight: "", restSec: "90" }] };
      return copy;
    });
  }

  function updateSet(idx: number, sIdx: number, field: keyof TmpSet, val: string) {
    setItems((prev) => {
      const copy = [...prev];
      const sets = copy[idx].sets.map((s, k) => (k === sIdx ? { ...s, [field]: val } : s));
      copy[idx] = { ...copy[idx], sets };
      return copy;
    });
  }

  // ✅ CORRECTION 1 : Fonction pour convertir TmpItem en format API
  function convertItemsForApi() {
    return items.map(item => ({
      exerciseName: item.exerciseName,
      sets: item.sets.map(s => ({
        reps: parseInt(s.reps) || 0,
        weight: s.weight ? parseFloat(s.weight) : undefined,
        restSec: parseInt(s.restSec) || 0,
      }))
    }));
  }

  async function onSave() {
    if (!title.trim()) {
      Alert.alert("Titre requis", "Donne un nom à ta séance (ex: Push lourd).");
      return;
    }

    // ✅ CORRECTION 2 : Validation des exercices
    if (items.length === 0) {
      Alert.alert(
        "Aucun exercice",
        "Veux-tu créer une séance vide ? Tu pourras ajouter des exercices plus tard.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Continuer", onPress: () => saveWorkout() }
        ]
      );
      return;
    }

    saveWorkout();
  }

  async function saveWorkout() {
    try {
      // ✅ CORRECTION 3 : Envoie les items convertis
      const apiItems = convertItemsForApi();
      const created = await createWorkout({
        title: title.trim(),
        note: note.trim() || undefined,
        items: apiItems.length > 0 ? apiItems : undefined
      });

      // ✅ CORRECTION 4 : navigate au lieu de replace (permet le retour)
      if (!created) {
        Alert.alert("Erreur", "Le workout n'a pas pu etre créé.");
        return;
      }
      navigation.navigate("Détails", { id: created.id });
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de créer le workout.");
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontWeight: "600" }}>Titre</Text>
      <TextInput
        placeholder="Ex: Push (Pecs/Épaules/Triceps)"
        value={title}
        onChangeText={setTitle}
        style={{ borderWidth: 1, borderColor: "#555", padding: 10, borderRadius: 8 }}
      />
      <Text style={{ fontWeight: "600" }}>Note (optionnel)</Text>
      <TextInput
        placeholder="Consignes, tempo, etc."
        value={note}
        onChangeText={setNote}
        style={{ borderWidth: 1, borderColor: "#555", padding: 10, borderRadius: 8 }}
      />

      <View style={{ marginTop: 8 }}>
        <Text style={{ fontWeight: "600" }}>Ajouter un exercice</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <TextInput
            placeholder="Nom de l'exercice (ex: Développé couché)"
            value={newExo}
            onChangeText={setNewExo}
            style={{ flex: 1, borderWidth: 1, borderColor: "#555", padding: 10, borderRadius: 8 }}
          />
          <Button title="Ajouter" onPress={addTmpItem} />
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(_, i) => String(i)}
        style={{ flex: 1 }}
        ListEmptyComponent={<Text style={{ opacity: 0.7, marginTop: 8 }}>Aucun exercice ajouté pour l'instant.</Text>}
        renderItem={({ item, index }) => (
          <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: "#333", borderRadius: 10 }}>
            <Text style={{ fontWeight: "700" }}>{item.exerciseName}</Text>

            {item.sets.map((s, sIdx) => (
              <View key={sIdx} style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TextInput
                  keyboardType="numeric"
                  placeholder="reps"
                  value={s.reps}
                  onChangeText={(v) => updateSet(index, sIdx, "reps", v)}
                  style={{ flex: 1, borderWidth: 1, borderColor: "#555", padding: 8, borderRadius: 8 }}
                />
                <TextInput
                  keyboardType="numeric"
                  placeholder="poids (kg)"
                  value={s.weight}
                  onChangeText={(v) => updateSet(index, sIdx, "weight", v)}
                  style={{ flex: 1, borderWidth: 1, borderColor: "#555", padding: 8, borderRadius: 8 }}
                />
                <TextInput
                  keyboardType="numeric"
                  placeholder="repos (s)"
                  value={s.restSec}
                  onChangeText={(v) => updateSet(index, sIdx, "restSec", v)}
                  style={{ flex: 1, borderWidth: 1, borderColor: "#555", padding: 8, borderRadius: 8 }}
                />
              </View>
            ))}

            <TouchableOpacity onPress={() => addSetAt(index)} style={{ marginTop: 8 }}>
              <Text style={{ color: "#4ea" }}>+ Ajouter un set</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Button title="Créer et continuer" onPress={onSave} />
    </View>
  );
}
