// app/auth/forgot-password-pending.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://lockfit.onrender.com";

export default function ForgotPasswordPending() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [loading, setLoading] = useState(false);

  async function resendEmail() {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/password/reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        Alert.alert("Erreur", body?.message || "Impossible de renvoyer l’email.");
        return;
      }

      Alert.alert("Succès", "Email de réinitialisation renvoyé !");
    } catch (e: any) {
      Alert.alert("Erreur réseau", e?.message || "Réessaie plus tard.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      {/* bouton retour */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      {/* icône de succès */}
      <View style={styles.iconBox}>
        <Feather name="check-circle" size={32} color="#16A968" />
      </View>

      <Text style={styles.title}>Email envoyé !</Text>
      <Text style={styles.subtitle}>
        Vérifie ta boîte mail pour réinitialiser ton mot de passe
      </Text>

      <View style={styles.card}>
        <Feather name="mail" size={18} color="#16A968" />
        <Text style={styles.email}>Email envoyé à{"\n"}{email}</Text>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.tip}>✔ Vérifie la boîte de réception</Text>
          <Text style={styles.tip}>✔ Clique sur le lien dans l’email</Text>
          <Text style={styles.tip}>✔ Entre ton nouveau mot de passe</Text>
        </View>
      </View>

      <Text style={styles.footerText}>
        Pas reçu d’email ? Vérifie tes spams ou{" "}
      </Text>

      <TouchableOpacity
        onPress={resendEmail}
        disabled={loading}
        style={[styles.resendBtn, loading && { opacity: 0.6 }]}
      >
        {loading ? (
          <ActivityIndicator color="#16A968" />
        ) : (
          <Text style={styles.resendText}>renvoie le code</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.help}>
        Besoin d’aide ? Contacte <Text style={styles.link}>support@lockfit.app</Text>
      </Text>
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
  backBtn: { marginBottom: 10 },
  backText: { color: "#ffffff", fontSize: 14 },
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
  card: {
    backgroundColor: "#0E1A23",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#13343D",
    padding: 20,
    marginBottom: 16,
  },
  email: {
    color: "#16A968",
    fontSize: 14,
    marginTop: 6,
    fontWeight: "600",
  },
  tip: {
    color: "#d0d6de",
    fontSize: 13,
    marginTop: 2,
  },
  footerText: {
    color: "#ffffff",
    textAlign: "center",
    marginTop: 12,
  },
  resendBtn: {
    alignSelf: "center",
    marginTop: 4,
  },
  resendText: {
    color: "#16A968",
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  help: {
    color: "#9aa0b0",
    fontSize: 12,
    marginTop: 24,
    textAlign: "center",
  },
  link: { color: "#6BD18C" },
});
