// app/auth/creation.tsx
import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { saveTokens } from "@/lib/tokenStorage";

// Même logique que dans auth.ts pour construire l'URL
const RAW = (process.env.EXPO_PUBLIC_API_URL || "https://lockfit.onrender.com").trim().replace(/\/+$/, "");
const API_BASE = /\/api\/v1$/i.test(RAW) ? RAW : `${RAW}/api/v1`;

export default function SignUpScreen() {
    const router = useRouter();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const canSubmit = firstName && lastName && email.includes("@") && password.length >= 8;

    async function onSubmit() {
        if (!canSubmit || loading) return;
        setLoading(true);

        console.log("📝 [SIGNUP] Tentative d'inscription...", { email, firstName, lastName });
        console.log("📝 [SIGNUP] URL:", `${API_BASE}/auth/signup`);

        try {
            const res = await fetch(`${API_BASE}/auth/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    password,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                }),
            });

            const data = await res.json();
            console.log("✅ [SIGNUP] Réponse:", data);

            if (!res.ok) {
                const msg = data?.message || "Inscription impossible";
                Alert.alert("Erreur", msg);
                return;
            }

            // Récupère les tokens (tolère différents formats)
            const tokens = data?.tokens ?? 
                (data?.accessToken && data?.refreshToken 
                    ? { access: data.accessToken, refresh: data.refreshToken }
                    : null);

            if (!tokens?.access || !tokens?.refresh) {
                Alert.alert("Erreur", "Réponse invalide du serveur");
                return;
            }

            // Sauvegarde les tokens
            console.log("💾 [SIGNUP] Sauvegarde des tokens...");
            await saveTokens(tokens);
            console.log("✅ [SIGNUP] Tokens sauvegardés");

            // Petit délai pour laisser le temps au storage
            await new Promise(r => setTimeout(r, 150));

            // Message de bienvenue puis redirection
            Alert.alert(
                "Bienvenue 👋",
                `Compte créé pour ${data.user?.firstName || firstName} !`,
                [
                    {
                        text: "OK",
                        onPress: () => {
                            console.log("🔵 [SIGNUP] Navigation vers (tabs)...");
                            router.replace("/(tabs)");
                        }
                    }
                ]
            );
        } catch (e: any) {
            console.error("❌ [SIGNUP] ERREUR:", e);
            Alert.alert("Erreur réseau", e?.message || "Vérifiez votre connexion");
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <Text style={styles.title}>Créer ton compte dès maintenant ✌</Text>

            <View style={styles.form}>
                <Text style={styles.label}>Prénom</Text>
                <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Tom"
                    placeholderTextColor="#64748B"
                    style={styles.input}
                    autoCapitalize="words"
                />

                <Text style={styles.label}>Nom</Text>
                <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Lagarde"
                    placeholderTextColor="#64748B"
                    style={styles.input}
                    autoCapitalize="words"
                />

                <Text style={styles.label}>Email</Text>
                <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="user@example.com"
                    placeholderTextColor="#64748B"
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <Text style={styles.label}>Mot de passe</Text>
                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="8 caractères minimum"
                    placeholderTextColor="#64748B"
                    style={styles.input}
                    secureTextEntry
                />

                <Pressable
                    onPress={onSubmit}
                    disabled={!canSubmit || loading}
                    style={[styles.cta, (!canSubmit || loading) && { opacity: 0.6 }]}
                >
                    {loading
                        ? <ActivityIndicator color="#061018" />
                        : <Text style={styles.ctaText}>Créer mon compte</Text>}
                </Pressable>

                <Pressable onPress={() => router.back()} style={{ alignSelf: "center", marginTop: 16 }}>
                    <Text style={{ color: "#98A2B3" }}>Retour</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: "#0F1420" },
    title: { fontSize: 24, fontWeight: "700", color: "#12E29A", textAlign: "center", marginVertical: 12 },
    form: { gap: 8, marginTop: 8 },
    label: { color: "#E6F0FF", fontSize: 14, marginTop: 8 },
    input: {
        backgroundColor: "#0B1220",
        borderColor: "#1F2937",
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: "#E6F0FF",
    },
    cta: {
        backgroundColor: "#12E29A",
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 16,
        alignItems: "center",
    },
    ctaText: { color: "#061018", fontWeight: "700" },
});