// app/workouts/new.tsx
// Écran de création d’un entraînement (POST /workouts)

import { useState } from "react"; // Hooks React pour gérer l'état (title, saving)
import { Alert, StyleSheet, Text, View, TextInput, Pressable } from "react-native"; // Composant de l'UI
import { SafeAreaView } from "react-native-safe-area-context"; // Gère seul les zones "safe"
import { Stack, useRouter } from "expo-router"; // Header + navigation
import { createWorkout } from "@/lib/workouts";    // Client API: POST /workouts

export default function NewWorkoutScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    const trimmed = title.trim();

    if (!trimmed) {
      Alert.alert("Titre requis", "Merci d'indiquer un titre pour votre entraînement.");
      return;
    }
    if (trimmed.length > 50) {
      Alert.alert("Titre trop long", "50 caractères maximum.");
      return;
    }

    try {
      setSaving(true);
      const w = await createWorkout({ title: trimmed });
      if (!w?.id) {
        Alert.alert("Erreur", "Réponse inattendue du serveur (création sans id).");
        return;
      }
      setTitle("");
      // Redirection immédiate vers la fiche
      router.replace(`/workouts/${w.id}`);
    } catch (e: any) {
      if (e instanceof HttpError) {
        Alert.alert("Erreur", `${e.status} — ${e.message}`);
      } else {
        Alert.alert("Erreur", e?.message || "Impossible de créer la séance.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Créer un entraînement", headerShown: true }} />

      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={{ flex: 1 }}>
        <View style={s.card}>
          <Text style={s.label}>Nom de la séance</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ex : Push Day, Pull Day, Legs…"
            placeholderTextColor={theme.colors.muted}
            style={s.input}
            maxLength={50}
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            editable={!saving}
          />

          <Pressable style={[s.cta, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
            {saving ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Text style={s.ctaText}>Créer</Text>}
          </Pressable>

          <Pressable style={s.secondary} onPress={() => router.back()} disabled={saving}>
            <Text style={s.secondaryText}>Annuler</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: layout.inset.x },
  card: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: layout.radius.lg,
    padding: layout.gap.lg,
    gap: layout.gap.sm,
    ...theme.shadow.card,
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: theme.colors.primary,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
    color: theme.colors.text,
    borderRadius: layout.radius.md,
    paddingHorizontal: layout.gap.md,
    paddingVertical: layout.gap.sm,
    fontSize: 16,
  },
  cta: {
    backgroundColor: theme.colors.primary,
    paddingVertical: layout.gap.md,
    borderRadius: layout.radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: layout.gap.sm,
  },
  ctaText: { ...typography.cta, color: theme.colors.onPrimary },
  secondary: { paddingVertical: layout.gap.sm, borderRadius: layout.radius.md, alignItems: "center" },
  secondaryText: { color: theme.colors.muted, fontWeight: "600" },
});
