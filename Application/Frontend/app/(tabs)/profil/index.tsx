import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  Alert,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { router } from "expo-router";
import { httpPost } from "../../../src/api/http";
import { loadTokens, clearTokens } from "../../../src/lib/tokenStorage";
import { useState } from "react";

export default function ProfileScreen() {
  const [loadingLogout, setLoadingLogout] = useState(false);
  const [loadingMfa, setLoadingMfa] = useState(false);

  // -------------------------
  // Déconnexion
  // -------------------------
  async function handleLogout() {
    if (loadingLogout) return;
    setLoadingLogout(true);

    try {
      const tokens = await loadTokens();

      // Appel API pour invalider le refresh token
      if (tokens?.refresh) {
        await httpPost<void>("/auth/logout", undefined, {
          token: tokens.refresh,
        });
      }

      // On efface les tokens côté app
      await clearTokens();

      // Redirection vers l'écran de login
      router.replace("/auth/login");
    } catch (e: any) {
      await clearTokens();
      Alert.alert("Déconnexion");
      router.replace("/auth/login");
    } finally {
      setLoadingLogout(false);
    }
  }

  // -------------------------
  // Activer MFA (Challenge)
  // -------------------------
  async function handleEnableMfa() {
    if (loadingMfa) return;
    setLoadingMfa(true);

    try {
      const tokens = await loadTokens();
      if (!tokens?.access) {
        Alert.alert("Erreur", "Non authentifié");
        return;
      }

      await httpPost("/auth/mfa/enable", undefined, {
        token: tokens.access, // JWT Access Token
      });

      Alert.alert(
        "MFA activée",
        "L’authentification à deux facteurs est maintenant activée sur ton compte."
      );
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Impossible d’activer la MFA pour le moment.");
    } finally {
      setLoadingMfa(false);
    }
  }

  // -------------------------
  // UI
  // -------------------------
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0F1420" }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 32,
          alignItems: "center",
        }}
      >
        {/* Header */}
        <Text
          style={{
            color: "#fff",
            fontSize: 22,
            fontWeight: "700",
            marginBottom: 16,
          }}
        >
          Mon profil
        </Text>

        {/* Carte profil */}
        <View
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: "#101628",
            borderRadius: 18,
            padding: 20,
            alignItems: "center",
          }}
        >
          {/* Avatar */}
          <View
            style={{
              width: 90,
              height: 90,
              borderRadius: 999,
              borderWidth: 3,
              borderColor: "#12E29A",
              overflow: "hidden",
              marginBottom: 10,
            }}
          >
            <Image
              source={{
                uri: "https://i.pravatar.cc/150?img=12",
              }}
              style={{ width: "100%", height: "100%" }}
            />
          </View>

          {/* Nom utilisateur */}
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
            @FitnessMax
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.6)",
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            Membre depuis janvier 2024
          </Text>

          {/* Stats */}
          <View
            style={{
              flexDirection: "row",
              gap: 26,
              marginBottom: 16,
            }}
          >
            <View style={{ alignItems: "center" }}>
              <Text
                style={{ color: "#12E29A", fontSize: 18, fontWeight: "700" }}
              >
                124
              </Text>
              <Text style={{ color: "#fff", fontSize: 12 }}>Followers</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text
                style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}
              >
                0
              </Text>
              <Text style={{ color: "#fff", fontSize: 12 }}>Trophées</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text
                style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}
              >
                0
              </Text>
              <Text style={{ color: "#fff", fontSize: 12 }}>Entraînements</Text>
            </View>
          </View>

          {/* Boutons de section (fake) */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#0B0F1C",
              borderRadius: 999,
              padding: 4,
              gap: 4,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                backgroundColor: "#12E29A",
                borderRadius: 999,
                paddingVertical: 6,
                paddingHorizontal: 20,
              }}
            >
              <Text style={{ color: "#061018", fontWeight: "700" }}>Posts</Text>
            </View>
            <View
              style={{
                borderRadius: 999,
                paddingVertical: 6,
                paddingHorizontal: 20,
              }}
            >
              <Text style={{ color: "#fff" }}>Stats</Text>
            </View>
            <View
              style={{
                borderRadius: 999,
                paddingVertical: 6,
                paddingHorizontal: 20,
              }}
            >
              <Text style={{ color: "#fff" }}>Trophées</Text>
            </View>
          </View>

          {/* Paramètres sécurité */}
          <View style={{ width: "100%", gap: 10 }}>
            {/* Activer MFA */}
            <Pressable
              onPress={handleEnableMfa}
              disabled={loadingMfa}
              style={({ pressed }) => ({
                backgroundColor: "#0F1929",
                borderWidth: 1,
                borderColor: "#12E29A",
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
                opacity: pressed || loadingMfa ? 0.6 : 1,
              })}
            >
              {loadingMfa ? (
                <ActivityIndicator color="#12E29A" />
              ) : (
                <Text style={{ color: "#12E29A", fontWeight: "700" }}>
                  Activer MFA
                </Text>
              )}
            </Pressable>

            {/* Se déconnecter */}
            <Pressable
              onPress={handleLogout}
              disabled={loadingLogout}
              style={({ pressed }) => ({
                backgroundColor: "#E24848",
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
                opacity: pressed || loadingLogout ? 0.6 : 1,
              })}
            >
              {loadingLogout ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  Se déconnecter
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
