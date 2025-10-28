// app/workouts/new.tsx
// Écran de création d’un entraînement (POST /workouts)

import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { createWorkout } from "@/lib/workouts";

export default function NewWorkoutScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    const trimmed = title.trim();

    if (!trimmed) {
      Alert.alert(
        "Titre requis",
        "Merci d'indiquer un titre pour votre entraînement."
      );
      return;
    }

    if (trimmed.length > 50) {
      Alert.alert("Titre trop long", "50 caractères maximum.");
      return;
    }

    try {
      setSaving(true);

      // Appel API -> POST /workouts
      const w = await createWorkout({ title: trimmed });

      if (!w?.id) {
        Alert.alert(
          "Erreur",
          "Réponse inattendue du serveur (création sans id)."
        );
        return;
      }

      // on reset le champ
      setTitle("");

      // Redirection vers l'écran détail du workout créé
      router.replace(`/workouts/${w.id}`);
    } catch (e: any) {
      Alert.alert(
        "Erreur",
        e?.message || "Impossible de créer la séance."
      );
    } finally {
        setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.container} edges={["top", "bottom"]}>
      {/* Header Expo Router (si le dossier workouts est dans un Stack layout) */}
      <Stack.Screen
        options={{
          title: "Créer un entraînement",
          headerShown: true,
          headerStyle: {
            backgroundColor: "#0F1420",
          },
          headerTintColor: "#E6F0FF",
          headerTitleStyle: {
            fontWeight: "700",
          },
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1, justifyContent: "center" }}
      >
        <View style={s.card}>
          <Text style={s.label}>Nom de la séance</Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ex : Push Day, Pull Day, Legs…"
            placeholderTextColor="#6B7280" // gris doux
            style={s.input}
            maxLength={50}
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            editable={!saving}
          />

          <Pressable
            style={[s.cta, saving && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#061018" />
            ) : (
              <Text style={s.ctaText}>Créer</Text>
            )}
          </Pressable>

          <Pressable
            style={s.secondary}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={s.secondaryText}>Annuler</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  // fond global
  container: {
    flex: 1,
    backgroundColor: "#0F1420",
    paddingHorizontal: 16,
  },

  // carte centrale
  card: {
    borderWidth: 1,
    borderColor: "#232A3A",
    backgroundColor: "#121927",
    borderRadius: 16,
    padding: 20,
    gap: 12,

    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: "#12E29A", // vert LockFit pour le label
    marginBottom: 4,
  },

  input: {
    borderWidth: 1,
    borderColor: "#232A3A",
    backgroundColor: "#0F1420",
    color: "#E6F0FF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },

  // bouton valider
  cta: {
    backgroundColor: "#12E29A",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  ctaText: {
    color: "#061018",
    fontWeight: "700",
    fontSize: 15,
    lineHeight: 18,
  },

  // bouton annuler
  secondary: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  secondaryText: {
    color: "#98A2B3",
    fontWeight: "600",
    fontSize: 14,
  },
});
