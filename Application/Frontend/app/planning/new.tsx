// app/planning/new.tsx
// Création d’un planning : POST /plannings { nom, debut, fin }

import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";

import { createPlanning } from "@/api/planning"; // ← ta fonction existante
import theme from "@/theme/colors";
import layout from "@/theme/layout";
import typography from "@/theme/typography";

function isYMD(s: string) {
  // format strict YYYY-MM-DD
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default function NewPlanningScreen() {
  const router = useRouter();

  const [nom, setNom] = useState("");
  const [debut, setDebut] = useState(""); // ex: 2025-10-25
  const [fin, setFin] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit() {
    const n = nom.trim();
    const d1 = debut.trim();
    const d2 = fin.trim();

    if (!n) {
      Alert.alert("Nom requis", "Indique un nom de planning (ex: Programme Push/Pull/Legs).");
      return;
    }
    if (!isYMD(d1) || !isYMD(d2)) {
      Alert.alert("Dates invalides", "Utilise le format YYYY-MM-DD (ex: 2025-10-25).");
      return;
    }
    if (new Date(d1) > new Date(d2)) {
      Alert.alert("Plage invalide", "La date de début doit être avant la date de fin.");
      return;
    }

    try {
      setSaving(true);
      const p = await createPlanning({ nom: n, debut: d1, fin: d2 });
      if (!p?.id) {
        Alert.alert("Erreur", "Le serveur n’a pas renvoyé d’identifiant.");
        return;
      }
      // redirige vers le détail du planning
      router.replace(`/planning/${p.id}`);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de créer le planning.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Nouveau planning", headerShown: true }} />

      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={{ flex: 1 }}>
        <View style={s.card}>
          <Text style={s.label}>Nom *</Text>
          <TextInput
            style={s.input}
            placeholder="ex: Programme Full Body S4"
            placeholderTextColor={theme.colors.muted}
            value={nom}
            onChangeText={setNom}
            maxLength={80}
            editable={!saving}
          />

          <View style={{ height: layout.gap.md }} />

          <Text style={s.label}>Début (YYYY-MM-DD) *</Text>
          <TextInput
            style={s.input}
            placeholder="ex: 2025-10-25"
            placeholderTextColor={theme.colors.muted}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            value={debut}
            onChangeText={setDebut}
            editable={!saving}
          />

          <Text style={[s.label, { marginTop: layout.gap.md }]}>Fin (YYYY-MM-DD) *</Text>
          <TextInput
            style={s.input}
            placeholder="ex: 2025-11-24"
            placeholderTextColor={theme.colors.muted}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            value={fin}
            onChangeText={setFin}
            editable={!saving}
          />
        </View>

        <View style={{ height: layout.gap.lg }} />

        <Pressable
          onPress={onSubmit}
          disabled={saving}
          style={[s.cta, saving && { opacity: 0.7 }]}
        >
          {saving ? <ActivityIndicator color={theme.colors.onPrimary} /> : <Text style={s.ctaText}>Créer</Text>}
        </Pressable>

        <Pressable style={s.secondary} onPress={() => router.back()} disabled={saving}>
          <Text style={s.secondaryText}>Annuler</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: layout.inset.x,
    paddingTop: layout.inset.y,
  },
  card: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: layout.radius.lg,
    padding: layout.gap.lg,
    ...theme.shadow.card,
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: theme.colors.primary,
    marginBottom: 6,
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
  },
  ctaText: { ...typography.cta, color: theme.colors.onPrimary },
  secondary: { paddingVertical: layout.gap.sm, borderRadius: layout.radius.md, alignItems: "center", marginTop: layout.gap.sm },
  secondaryText: { color: theme.colors.muted, fontWeight: "600" },
});
