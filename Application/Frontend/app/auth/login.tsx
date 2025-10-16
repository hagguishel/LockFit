// app/auth/login.tsx
// ÉCRAN DE CONNEXION "tout-en-un" (Expo Router)
// - UI fidèle à ta maquette (fond sombre, accent vert, champs avec icônes)
// - Logique: appelle src/api/auth.login(), gère MFA, erreurs
// - Pas d’autre composant nécessaire

import React, { useState} from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { login } from "@/api/auth";
import { isMfaRequired } from "@/types/auth";
import { saveTokens } from "@/lib/tokenStorage";

// ⛳ Mode mock pour tests visuels (met à false quand tu branches le vrai backend)
const MOCK_AUTH = true;


export default function LoginRoute() {
  const router = useRouter();

 // 🧱 États UI (formulaire & statut)
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [showPassword, setShowPassword] = useState(false);
 const [loading, setLoading] = useState(false);

 // 👉 Bouton "Se connecter"
 async function onSubmit() {
  if (!email || !password || loading)
    return;
  setLoading(true);
  try {
    if (MOCK_AUTH) {
      // 🔌 Bypass complet : on simule un délai puis on ouvre les onglets
      await new Promise((r) => setTimeout(r, 400));
       // (option) tu peux sauvegarder des tokens factices si tu veux tester les gardes plus tard
      // await saveTokens({ access: "fake", refresh: "fake" });
      router.replace("/(tabs)");
      return;
    }
    // ======= flux réel (à réactiver quand tu branches le backend) ======
    const res = await login(email, password);

    // Cas 1 : MFA requis → on passe le tempSessionId à l’écran MFA
    if (isMfaRequired(res)) {
      router.push({ pathname: "/auth/mfa", params: { sid: res.tempSessionId } });
      return;
    }

    await saveTokens(res.tokens);

    router.replace("/(tabs)")

    // Cas 2 : Succès direct (tokens reçus)
    // Prochaine étape (après validation): saveTokens(res.tokens) + router.replace("/(tabs)")
    Alert.alert("Connecté ✅", `Bienvenue ${res.user.email}`);
  } catch (e: any) {
    // Erreurs normalisées (voir src/api/auth.ts)
    const status = e?.status ?? 0;
    const code = e?.error ?? "UNKNOWN"
    if (status === 401 || code === "INVALID_CREDENTIALS") {
      Alert.alert("Erreur", "Identifiants invalides.");
    } else if (status === 429 || code === "TOO_MANY_ATTEMPTS") {
      Alert.alert("Erreur", "Trop de tentatives. Réessayez plus tard.");
    } else if (status === 0 || code === "NETWORK_ERROR") {
      Alert.alert("Erreur réseau", "vérifie ta connexion.")
    } else {
        Alert.alert("Erreur", "Erreur inattendue. Réessaie.")
    }

    } finally {
      setLoading(false);
      setPassword("") // petit plus UX : on nettoie le mot de passe
    }
  }
  // 🎯 Boutons “Google/Apple” (pour démo/placeholder)
  function handleDemoLogin() {
    const e = "demo@lockfit.app";
    const p = "demo123";
    setEmail(e);
    setPassword(p);
    setTimeout(() => onSubmit(), 50);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        {/* Logo + titres */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Ionicons name="barbell" size={28} color="#0b0b1a" />
          </View>
          <Text style={styles.title}>LockFit</Text>
          <Text style={styles.subtitle}>
            Connexion sécurisée <Text>🔒</Text>
          </Text>
        </View>

        {/* Email */}
        <View style={styles.field}>
          <Text style={styles.srOnly}>Email</Text>
          <View style={styles.inputRow}>
            <Feather name="mail" size={18} color="#9aa0a6" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9aa0a6"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        {/* Mot de passe */}
        <View style={styles.field}>
          <Text style={styles.srOnly}>Mot de passe</Text>
          <View style={styles.inputRow}>
            <Feather name="lock" size={18} color="#9aa0a6" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor="#9aa0a6"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(s => !s)} style={styles.eyeBtn}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#9aa0a6" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Se connecter */}
        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
          onPress={onSubmit}
          disabled={loading || !email || !password}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Se connecter</Text>}
        </TouchableOpacity>

        {/* Mot de passe oublié */}
        <TouchableOpacity style={styles.center} onPress={() => { /* à brancher plus tard */ }}>
          <Text style={styles.linkGreen}>Mot de passe oublié ?</Text>
        </TouchableOpacity>

        {/* Test MFA (optionnel pour valider la navigation MFA) */}
        <TouchableOpacity
          style={[styles.outlineBtn, {marginTop: 8 }]}
          onPress={() => router.push({ pathname: "/auth/mfa", params: {sid: "demo-sid-123456" } })}
          >
            <Text style={styles.outlineBtnText}>Tester MFA</Text>
          </TouchableOpacity>

        {/* Créer un compte */}
        <TouchableOpacity style={styles.outlineBtn} onPress={() => { /* router.push("/auth/creation") */ }}>
          <Text style={styles.outlineBtnText}>Créer un compte</Text>
        </TouchableOpacity>

        {/* Séparateur */}
        <View style={styles.separatorRow}>
          <View style={styles.separator} />
          <Text style={styles.separatorText}>Ou continuer avec</Text>
          <View style={styles.separator} />
        </View>

        {/* Boutons sociaux (placeholder) */}
        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn} onPress={handleDemoLogin}>
            <Text style={styles.socialBtnText}>G  Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn} onPress={handleDemoLogin}>
            <Text style={styles.socialBtnText}>  Apple</Text>
          </TouchableOpacity>
        </View>

        {/* Note SSL */}
        <View style={[styles.center, { marginTop: 22 }]}>
          <Feather name="shield" size={14} color="#9aa0a6" />
          <Text style={styles.sslNote}>  Données protégées par chiffrement SSL</Text>
        </View>
      </View>
    </View>
  );
}

/* 🎨 Thème rapide (tu peux ajuster ces valeurs au même endroit) */
const BG = "#0b0b1a";        // fond sombre
const CARD = "#0c0d20";      // carte sombre
const INPUT_BG = "#1f2336";  // champs
const INPUT_BORDER = "#323856";
const TEXT = "#e6e6f0";
const MUTED = "#9aa0a6";
const ACCENT = "#00ff88";    // vert fluo

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG, paddingHorizontal: 16, paddingVertical: 24, justifyContent: "center" },
  card: { marginHorizontal: "auto", width: "100%", maxWidth: 420, gap: 14 },
  header: { alignItems: "center", marginBottom: 6 },
  logo: { width: 64, height: 64, borderRadius: 16, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "800", color: TEXT, marginBottom: 4 },
  subtitle: { fontSize: 16, fontWeight: "700", color: TEXT, opacity: 0.9 },
  field: { gap: 6 },
  srOnly: { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0 },
  inputRow: { position: "relative", flexDirection: "row", alignItems: "center" },
  inputIcon: { position: "absolute", left: 12 },
  input: {
    flex: 1,
    height: 48,
    paddingLeft: 40,
    paddingRight: 40,
    borderRadius: 12,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    color: TEXT,
    fontSize: 16,
  },
  eyeBtn: { position: "absolute", right: 12, padding: 6 },
  primaryBtn: { backgroundColor: "#1a1a35", height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  center: { alignItems: "center", marginTop: 8 },
  linkGreen: { color: ACCENT, fontWeight: "600", textDecorationLine: "underline", marginTop: 4 },
  outlineBtn: { height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: ACCENT, marginTop: 10 },
  outlineBtnText: { color: ACCENT, fontSize: 16, fontWeight: "700" },
  separatorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18 },
  separator: { flex: 1, height: 1, backgroundColor: INPUT_BORDER },
  separatorText: { color: MUTED, fontSize: 12 },
  socialRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  socialBtn: { flex: 1, height: 48, backgroundColor: "#2a2a4a", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  socialBtnText: { color: TEXT, fontSize: 15, fontWeight: "600" },
  sslNote: { color: MUTED, fontSize: 12 },
});
