import React, { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

const BOXES = 6;
const API_BASE = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export default function MfaScreen() {
  const router = useRouter();
  const { tempSessionId } = useLocalSearchParams<{ tempSessionId?: string }>();

  const [digits, setDigits] = useState<string[]>(Array(BOXES).fill("")); // On crée une variable digits qui contient 6 cases vides au départ : setDigits permet de modifier cette variable

  const [loading, setLoading] = useState(false); // on crée une variable pour vérifier le code ou non
  
  const inputs = useRef<(TextInput | null)[]>([]); // Une liste pour "pointer" vers chacune des 6 cases de saisie (pour pouvoir les contrôler, comme passer à la suivante automatiquement)

  const onChange = (i: number, v: string) => { // Quand l'utilisateur tape la case i avec la valeur v
    const n = v.replace(/\D/g, "").slice(-1); // On enlève tout ce qui n'est pas un chiffre (\D = non-digit)
    const next = [...digits];
    next[i] = n;
    setDigits(next); // On met à jour le tableau digits avec la dernière valeur tapée
    if (n && i < BOXES - 1) inputs.current[i + 1]?.focus(); // Si l'utilisateur a tapé une valeur et qu'on n'est pas à la dernière case, on passe à la prochaine.
  };

  const onKey = (i: number, e: any) => {
    if (e.nativeEvent.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
      const next = [...digits];
      next[i - 1] = "";
      setDigits(next);
    }
  };

  const verify = async () => {
    const code = digits.join(""); // On crée une chaîne avec tous les chiffres donnés dans les cases

    if (!API_BASE) {
      Alert.alert("Config", "EXPO_PUBLIC_API_URL n'est pas défini.");
      return;
    }
    // 1) On récupère le ticket de tempSessionId
    const ticket =
      (typeof tempSessionId === "string" && tempSessionId) || "";

    if (!ticket) {
      Alert.alert("Erreur", "Aucun ticket...");
      return;
    }
    if (code.length !== BOXES) {
      Alert.alert("Code incomplet", "Entre les 6 chiffres du code.");
      return;
    }

    setLoading(true); // On active le mode "chargement" (le bouton va montrer "Vérification...")

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempSessionId: ticket, code }),
      });

      const data = await safeJson(res); // on récupère la réponse en JSON

      if (!res.ok) {
        Alert.alert("Erreur", data?.message || "Code invalide");
        return;
      }

      Alert.alert("Succès", data?.message || "MFA vérifiée ✅", [
        { text: "OK", onPress: () => router.replace("/(tabs)/index") },
      ]);
    } catch (e) {
      Alert.alert("Erreur réseau", "Impossible de joindre le serveur.");
    } finally {
      setLoading(false); // à la fin, on désactive le mode "chargement"
    }
  };

  const reset = () => { // Réinitialiser : on vide toutes les cases et on retourne à la première
    setDigits(Array(BOXES).fill(""));
    inputs.current[0]?.focus();
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Tester MFA</Text>
      <Text style={styles.subtitle}>Entre le code à 6 chiffres</Text>

      <View style={styles.row}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(ref) => {
              inputs.current[i] = ref;
            }}
            value={d}
            onChangeText={(v) => onChange(i, v)}
            onKeyPress={(e) => onKey(i, e)}
            keyboardType="number-pad"
            maxLength={1}
            style={styles.box}
            placeholder="•"
            placeholderTextColor="#7b7f88"
            textContentType="oneTimeCode"
          />
        ))}
      </View>

      <Pressable style={[styles.primary, loading && { opacity: 0.7 }]} onPress={verify} disabled={loading}>
        <Text style={styles.primaryText}>{loading ? "Vérification..." : "Vérifier"}</Text>
      </Pressable>

      <Pressable style={styles.secondary} onPress={reset} disabled={loading}>
        <Text style={styles.secondaryText}>Réinitialiser</Text>
      </Pressable>
    </View>
  );
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24, paddingTop: 80, backgroundColor: "#0E0E10" },
  title: { color: "#FFFFFF", fontSize: 24, fontWeight: "800", textAlign: "center" },
  subtitle: { color: "#B0B0B0", textAlign: "center", marginTop: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 24 },
  box: {
    width: 46,
    height: 54,
    borderRadius: 10,
    backgroundColor: "#111326",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#FFFFFF",
    fontSize: 20,
    textAlign: "center",
  },
  primary: {
    marginTop: 24,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
  },
  primaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  secondary: {
    marginTop: 12,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#00FFAA",
    backgroundColor: "rgba(0,255,170,0.06)",
  },
  secondaryText: { color: "#FFFFFF", fontWeight: "600" },
});