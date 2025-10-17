import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, Alert, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { httpPost } from "../../../src/api/http";
import { loadTokens, clearTokens } from "../../../src/lib/tokenStorage";
import { useState } from "react";

export default function ProfileScreen() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);

    try {
      //1) On récupère les tokens stockés (acces + refresh)
      const tokens = await loadTokens();

      // 2) On appelle l'API /auth/logout AVEC le refresh token
      //    ⚠️ Important : ton backend protège /logout avec "jwt-refresh"
      //    → il attend le "refresh" dans Authorization: Bearer <refresh>
      if (tokens?.refresh) {
        await httpPost<void>("/auth/logout", undefined, {
          token: tokens.refresh,
        });
      }
      // Si pas de refresh, ce n’est pas grave : on va quand même vider localement

      // 3) On efface les tokens côté app (sécurité)
      await clearTokens();

      // 4) On envoie l'utilisateur vers l'écran de connexion
      router.replace("/auth/login");
    } catch (e: any) {
      // Même si l'API renvoie une erreur (rare), on considère la déconnexion côté app
      await clearTokens();
      Alert.alert("Déconnexion");
      router.replace("/auth/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0F1420", alignItems: "center", justifyContent: "center" }}>
    <View
      style={{
        flex: 1,
        padding: 16,
        gap: 16,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "white", fontSize: 22, fontWeight: "700" }}>Profil</Text>

      <Pressable
        onPress={handleLogout}
        disabled={loading}
        style={({ pressed }) => ({
          opacity: pressed || loading ? 0.6 : 1,
          backgroundColor: "#12E29A", 
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 12,
          minWidth: 200,
          alignItems: "center",
        })}
      >
        {loading ? (
          <ActivityIndicator color="#061018" />
        ) : (
          <Text style={{ color: "#061018", fontWeight: "700" }}>Se déconnecter</Text>
        )}
      </Pressable>
    </View>
    </SafeAreaView>
  );
}
