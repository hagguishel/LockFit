// app/auth/reset-password.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://lockfit.onrender.com";

export default function ResetPasswordScreen() {
  const router = useRouter();
  // si on arrive via un lien de deep-link, on pourra récupérer le token ici
  const { token: tokenFromParams } = useLocalSearchParams<{ token?: string }>();

  const [token, setToken] = useState(tokenFromParams || "");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!token) {
      Alert.alert("Erreur", "Le token est manquant.");
      return;
    }
    if (!password || password.length < 8) {
      Alert.alert("Erreur", "Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (password !== password2) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/password/reset/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        Alert.alert("Erreur", body?.message || "Impossible de réinitialiser le mot de passe.");
        return;
      }

      Alert.alert("Succès", "Mot de passe réinitialisé. Tu peux te reconnecter.", [
        {
          text: "OK",
          onPress: () => router.replace("/auth/login"),
        },
      ]);
    } catch (e: any) {
      Alert.alert("Erreur réseau", e?.message || "Réessaie plus tard.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <View style={styles.iconBox}>
        <Feather name="lock" size={28} color="#ffffff" />
      </View>

      <Text style={styles.title}>Nouveau mot de passe</Text>
      <Text style={styles.subtitle}>
        Entre le mot de passe que tu veux utiliser pour te connecter
      </Text>

      {/* Token (affiché pour debug / mobile) */}
      <Text style={styles.label}>Token de réinitialisation</Text>
      <TextInput
        style={styles.input}
        placeholder="Colle le token reçu par email"
        placeholderTextColor="#5F7180"
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Nouveau mot de passe</Text>
      <TextInput
        style={styles.input}
        placeholder="********"
        placeholderTextColor="#5F7180"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Text style={styles.label}>Confirmer le mot de passe</Text>
      <TextInput
        style={styles.input}
        placeholder="********"
        placeholderTextColor="#5F7180"
        secureTextEntry
        value={password2}
        onChangeText={setPassword2}
      />

      <TouchableOpacity
        style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
        onPress={handleReset}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>METTRE À JOUR</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#08111A",
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  backBtn: {
    marginBottom: 10,
  },
  backText: {
    color: "#ffffff",
    fontSize: 14,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#0E2730",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 24,
  },
  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    color: "#d0d6de",
    fontSize: 14,
    marginBottom: 24,
  },
  label: {
    color: "#ffffff",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#0E1A23",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#152533",
    height: 48,
    paddingHorizontal: 14,
    color: "#fff",
  },
  primaryBtn: {
    backgroundColor: "#16A968",
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
