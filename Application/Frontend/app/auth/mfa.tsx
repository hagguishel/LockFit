import React, { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { saveTokens } from "@/lib/tokenStorage"; // même helper que dans le login

const BOXES = 6;
const API_BASE = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") || "";

export default function MfaScreen() {
  const router = useRouter();
  const { tempSessionId } = useLocalSearchParams<{ tempSessionId?: string }>();

  const [digits, setDigits] = useState<string[]>(Array(BOXES).fill(""));
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const onChange = (i: number, v: string) => {
    const n = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = n;
    setDigits(next);
    if (n && i < BOXES - 1) inputs.current[i + 1]?.focus();
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
    const code = digits.join("");

    if (!API_BASE) {
      Alert.alert("Config", "EXPO_PUBLIC_API_URL n'est pas défini.");
      return;
    }

    // ticket envoyé depuis le login
    const ticket = Array.isArray(tempSessionId) ? tempSessionId[0] : tempSessionId || "";
    if (!ticket) {
      Alert.alert("Erreur", "Aucun ticket MFA reçu. Recommence la connexion.");
      return;
    }
    if (code.length !== BOXES) {
      Alert.alert("Code incomplet", "Entre les 6 chiffres du code.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempSessionId: ticket, code }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        Alert.alert("Erreur", data?.message || "Code invalide");
        return;
      }

      // 🔐 ton backend renvoie normalement { accessToken, refreshToken, user }
      if (data?.accessToken) {
        await saveTokens({
          access: data.accessToken,
          refresh: data.refreshToken ?? null,
        });
      }
      // 🔐 fallback si un jour tu renvoies { tokens: { access, refresh } }
      else if (data?.tokens) {
        await saveTokens({
          access: data.tokens.access,
          refresh: data.tokens.refresh ?? null,
        });
      }

      // ✅ on va sur l'accueil (ton layout de tabs)
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Erreur réseau", "Impossible de joindre le serveur.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setDigits(Array(BOXES).fill(""));
    inputs.current[0]?.focus();
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Validation MFA</Text>
      <Text style={styles.subtitle}>Entre le code à 6 chiffres reçu par e-mail</Text>

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

      <Pressable
        style={[styles.primary, loading && { opacity: 0.7 }]}
        onPress={verify}
        disabled={loading}
      >
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
