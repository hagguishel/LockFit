// app/auth/forgot-password.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";


const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://lockfit.onrender.com";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!email) return;
    setLoading(true);
    try {
      // appel à ton backend NestJS
      const res = await fetch(`${API_BASE}/api/v1/auth/password/reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.log("❌ reset/request error:", body);
        Alert.alert("Erreur", body?.message || "Impossible d’envoyer l’email.");
        return;
      }

      // on passe à l'écran "email envoyé"
      router.push({
        pathname: "/auth/forgot-password-pending",
        params: { email },
      });
    } catch (e: any) {
      console.error(e);
      Alert.alert("Erreur réseau", e?.message || "Réessaie plus tard.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      {/* retour */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>Retour</Text>
      </TouchableOpacity>

      {/* icône */}
      <View style={styles.iconBox}>
        <Feather name="mail" size={28} color="#ffffff" />
      </View>

      <Text style={styles.title}>Mot de passe oublié ?</Text>
      <Text style={styles.subtitle}>
        Entre ton adresse email pour recevoir un code de vérification
      </Text>

      <Text style={styles.label}>Adresse email</Text>
      <View style={styles.inputRow}>
        <Feather name="mail" size={18} color="#9aa0a6" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="ton@email.com"
          placeholderTextColor="#5F7180"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, (!email || loading) && { opacity: 0.6 }]}
        onPress={handleSend}
        disabled={!email || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>ENVOYER LE CODE</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const BG = "#08111A";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  backBtn: {
    marginBottom: 20,
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
    fontSize: 14,
    marginBottom: 8,
  },
  inputRow: {
    position: "relative",
    marginBottom: 20,
  },
  inputIcon: {
    position: "absolute",
    left: 12,
    top: 14,
  },
  input: {
    backgroundColor: "#0E1A23",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#152533",
    height: 48,
    paddingLeft: 40,
    color: "#fff",
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: "#16A968",
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  help: {
    color: "#9aa0b0",
    fontSize: 12,
    marginTop: 24,
  },
  link: {
    color: "#6BD18C",
  },
});
