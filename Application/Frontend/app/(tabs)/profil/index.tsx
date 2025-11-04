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
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { httpPost, httpGet } from "../../../src/api/http";
import { loadTokens, clearTokens } from "../../../src/lib/tokenStorage";

export default function ProfileScreen() {
  const [loadingLogout, setLoadingLogout] = useState(false);
  const [loadingMfa, setLoadingMfa] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  // ============================
  // Charger /auth/me au montage
  // ============================
  useEffect(() => {
    (async () => {
      try {
        const tokens = await loadTokens();
        if (!tokens?.access) return;

        // on caste en any pour éviter l'erreur TS "mfaEnabled n'existe pas"
        const me = (await httpGet("/auth/me", {
          token: tokens.access,
        })) as any;

        if (me && typeof me.mfaEnabled === "boolean") {
          setMfaEnabled(me.mfaEnabled);
        }
      } catch (err) {
        console.log("Erreur /auth/me", err);
      }
    })();
  }, []);

  // ============================
  // Déconnexion
  // ============================
  async function handleLogout() {
    if (loadingLogout) return;
    setLoadingLogout(true);

    try {
      const tokens = await loadTokens();

      if (tokens?.refresh) {
        await httpPost<void>("/auth/logout", undefined, {
          token: tokens.refresh,
        });
      }

      await clearTokens();
      router.replace("/auth/login");
    } catch (e) {
      await clearTokens();
      Alert.alert("Déconnexion");
      router.replace("/auth/login");
    } finally {
      setLoadingLogout(false);
    }
  }

  // ============================
  // Activer / désactiver MFA
  // ============================
  async function handleToggleMfa() {
    if (loadingMfa) return;
    setLoadingMfa(true);

    try {
      const tokens = await loadTokens();
      if (!tokens?.access) {
        Alert.alert("Erreur", "Non authentifié");
        return;
      }

      if (!mfaEnabled) {
        // ACTIVER
        const res = (await httpPost("/auth/mfa/enable", undefined, {
          token: tokens.access,
        })) as any;

        if (res?.mfaEnabled === true) {
          setMfaEnabled(true);
          Alert.alert("Succès", "MFA activée !");
        } else {
          // même si le backend ne renvoie rien
          setMfaEnabled(true);
          Alert.alert("Succès", "MFA activée !");
        }
      } else {
        // DÉSACTIVER
        const res = (await httpPost("/auth/mfa/disable", undefined, {
          token: tokens.access,
        })) as any;

        if (res?.mfaEnabled === false) {
          setMfaEnabled(false);
          Alert.alert("Info", "MFA désactivée.");
        } else {
          setMfaEnabled(false);
          Alert.alert("Info", "MFA désactivée.");
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Impossible de modifier la MFA pour le moment.");
    } finally {
      setLoadingMfa(false);
    }
  }

  // ============================
  // UI
  // ============================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0F1420" }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 32,
          alignItems: "center",
        }}
      >
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
              source={{ uri: "https://i.pravatar.cc/150?img=12" }}
              style={{ width: "100%", height: "100%" }}
            />
          </View>

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
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
                0
              </Text>
              <Text style={{ color: "#fff", fontSize: 12 }}>Trophées</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
                0
              </Text>
              <Text style={{ color: "#fff", fontSize: 12 }}>Entraînements</Text>
            </View>
          </View>

          {/* Bloc actions */}
          <View style={{ width: "100%", gap: 10 }}>
            {/* Toggle MFA */}
            <Pressable
              onPress={handleToggleMfa}
              disabled={loadingMfa}
              style={({ pressed }) => ({
                backgroundColor: mfaEnabled ? "#12E29A" : "#0F1929",
                borderWidth: 1,
                borderColor: "#12E29A",
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
                opacity: pressed || loadingMfa ? 0.6 : 1,
              })}
            >
              {loadingMfa ? (
                <ActivityIndicator color={mfaEnabled ? "#061018" : "#12E29A"} />
              ) : (
                <Text
                  style={{
                    color: mfaEnabled ? "#061018" : "#12E29A",
                    fontWeight: "700",
                  }}
                >
                  {mfaEnabled ? "Désactiver MFA" : "Activer MFA"}
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
