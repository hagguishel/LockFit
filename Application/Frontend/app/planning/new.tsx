import { useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { createPlanning } from "@/api/planning";

export default function NewPlanning() {
  const router = useRouter();
  const [title, setTitle] = useState("Semaine LockFit");
  const [creating, setCreating] = useState(false);

  // Calcule automatiquement le lundi de la semaine en cours
  const currentMonday = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Si dimanche (0), recule de 6 jours
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0); // Reset l'heure
    return monday;
  }, []);

  const [monday, setMonday] = useState(currentMonday);

  // Calcule dimanche = lundi + 6 jours
  const sunday = useMemo(() => {
    const sun = new Date(monday);
    sun.setDate(monday.getDate() + 6);
    return sun;
  }, [monday]);

  const toISO = useCallback((d: Date) => d.toISOString().slice(0, 10), []);

  const dateRange = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short'
    };
    const start = monday.toLocaleDateString('fr-FR', options);
    const end = sunday.toLocaleDateString('fr-FR', options);
    return `${start} - ${end}`;
  }, [monday, sunday]);

  const onCreate = useCallback(async () => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      Alert.alert("Titre requis", "Donne un nom à ton planning.");
      return;
    }

    if (creating) return;

    try {
      setCreating(true);
      const p = await createPlanning({
        nom: trimmedTitle,
        debut: toISO(monday),
        fin: toISO(sunday),
      });

      if (!p || !p.id) {
        throw new Error("Réponse invalide du serveur");
      }

      Alert.alert(
        "Planning créé ✅",
        `"${trimmedTitle}" a été créé avec succès.`,
        [
          { text: "Fermer", style: "cancel" },
          {
            text: "Ouvrir",
            onPress: () => router.replace(`/planning/${p.id}`)
          }
        ]
      );
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Création impossible");
    } finally {
      setCreating(false);
    }
  }, [title, monday, sunday, toISO, router, creating]);

  // Fonction pour avancer/reculer d'une semaine
  const changeWeek = useCallback((weeks: number) => {
    setMonday(prev => {
      const newMonday = new Date(prev);
      newMonday.setDate(prev.getDate() + (weeks * 7));
      return newMonday;
    });
  }, []);

  return (
    <SafeAreaView style={s.container}>
      <Stack.Screen options={{ title: "Nouveau planning" }} />

      <View style={s.content}>
        <Text style={s.label}>Nom du planning</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={s.input}
          placeholder="Ex: Programme Fullbody"
          placeholderTextColor="#6B7280"
          editable={!creating}
        />

        <Text style={[s.label, { marginTop: 16 }]}>Semaine</Text>
        <View style={s.weekSelector}>
          <Pressable
            onPress={() => changeWeek(-1)}
            style={s.weekButton}
            disabled={creating}
          >
            <Text style={s.weekButtonText}>← Semaine précédente</Text>
          </Pressable>

          <View style={s.dateDisplay}>
            <Text style={s.dateText}>{dateRange}</Text>
          </View>

          <Pressable
            onPress={() => changeWeek(1)}
            style={s.weekButton}
            disabled={creating}
          >
            <Text style={s.weekButtonText}>Semaine suivante →</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onCreate}
          style={[s.createButton, creating && { opacity: 0.6 }]}
          disabled={creating}
        >
          <Text style={s.createButtonText}>
            {creating ? "Création..." : "Créer le planning"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={s.cancelButton}
          disabled={creating}
        >
          <Text style={s.cancelButtonText}>Annuler</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1420",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  label: {
    color: "#12E29A",
    fontWeight: "600",
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#232A3A",
    backgroundColor: "#121927",
    color: "#E6F0FF",
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
  },
  weekSelector: {
    gap: 12,
    marginBottom: 24,
  },
  weekButton: {
    padding: 12,
    backgroundColor: "#121927",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#232A3A",
    alignItems: "center",
  },
  weekButtonText: {
    color: "#98A2B3",
    fontWeight: "600",
    fontSize: 14,
  },
  dateDisplay: {
    padding: 16,
    backgroundColor: "#121927",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#12E29A",
    alignItems: "center",
  },
  dateText: {
    color: "#E6F0FF",
    fontWeight: "700",
    fontSize: 16,
  },
  createButton: {
    padding: 14,
    backgroundColor: "#12E29A",
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  createButtonText: {
    color: "#061018",
    fontWeight: "700",
    fontSize: 16,
  },
  cancelButton: {
    padding: 14,
    backgroundColor: "transparent",
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#98A2B3",
    fontWeight: "600",
    fontSize: 16,
  },
});
