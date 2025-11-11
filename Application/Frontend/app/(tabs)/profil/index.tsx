import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  Alert,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { httpPost, httpGet } from "../../../src/api/http";
import { loadTokens, clearTokens } from "../../../src/lib/tokenStorage";

export default function ProfileScreen() {
  const [loadingLogout, setLoadingLogout] = useState(false);
  const [loadingMfa, setLoadingMfa] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  // 👇 pour les onglets factices
  const [activeTab, setActiveTab] = useState<"posts" | "stats" | "trophies">(
    "posts"
  );

  // ============================
  // Charger /auth/me au montage
  // ============================
  useEffect(() => {
    (async () => {
      try {
        const tokens = await loadTokens();
        if (!tokens?.access) return;

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
          paddingBottom: 40,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Titre */}
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

        {/* CARTE EXISTANTE (on ne touche pas) */}
        <View
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: "#101628",
            borderRadius: 18,
            padding: 20,
            alignItems: "center",
            marginBottom: 18,
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
              source={{ uri: "https://i.imgur.com/5VfvdET.png" }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>

          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
            @Haguinounet
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
                3
              </Text>
              <Text style={{ color: "#fff", fontSize: 12 }}>Trophées</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
                12
              </Text>
              <Text style={{ color: "#fff", fontSize: 12 }}>
                Entraînements
              </Text>
            </View>
          </View>

          {/* Bloc actions réelles */}
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

        {/* ================================
            BLOC FICTIF inspiré de Figma
           ================================ */}
        <View
          style={{
            width: "100%",
            maxWidth: 420,
            gap: 14,
          }}
        >
          {/* Onglets */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#0E1120",
              borderRadius: 16,
              padding: 4,
              gap: 4,
            }}
          >
            <TouchableOpacity
              onPress={() => setActiveTab("posts")}
              style={{
                flex: 1,
                backgroundColor:
                  activeTab === "posts" ? "#00ff88" : "transparent",
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: activeTab === "posts" ? "#0f0f23" : "#D2D4DD",
                  fontWeight: "600",
                }}
              >
                Posts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("stats")}
              style={{
                flex: 1,
                backgroundColor:
                  activeTab === "stats" ? "#00ff88" : "transparent",
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: activeTab === "stats" ? "#0f0f23" : "#D2D4DD",
                  fontWeight: "600",
                }}
              >
                Stats
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("trophies")}
              style={{
                flex: 1,
                backgroundColor:
                  activeTab === "trophies" ? "#00ff88" : "transparent",
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: activeTab === "trophies" ? "#0f0f23" : "#D2D4DD",
                  fontWeight: "600",
                }}
              >
                Trophées
              </Text>
            </TouchableOpacity>
          </View>

          {/* CONTENU DES ONGLETS */}
          {activeTab === "posts" && (
            <View
              style={{
                backgroundColor: "#101628",
                borderRadius: 16,
                padding: 14,
                gap: 10,
              }}
            >
              <Text
                style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}
              >
                Vos posts
              </Text>
              {/* post factice */}
              <View
                style={{
                  backgroundColor: "#141A2E",
                  borderRadius: 14,
                  padding: 12,
                  gap: 6,
                }}
              >
                <Text style={{ color: "#8A90A0", fontSize: 12 }}>
                  12/10/2025
                </Text>
                <Text style={{ color: "#fff" }}>
                  “Push Day terminé 💪 6 exos - 75 min.”
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 14, marginTop: 4 }}
                >
                  <Text style={{ color: "#fff", fontSize: 12 }}>❤️ 124</Text>
                  <Text style={{ color: "#fff", fontSize: 12 }}>💬 3</Text>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: "#141A2E",
                  borderRadius: 14,
                  padding: 12,
                  gap: 6,
                }}
              >
                <Text style={{ color: "#8A90A0", fontSize: 12 }}>
                  05/10/2025
                </Text>
                <Text style={{ color: "#fff" }}>
                  “Nouveau PR au développé couché 🔥”
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 14, marginTop: 4 }}
                >
                  <Text style={{ color: "#fff", fontSize: 12 }}>❤️ 89</Text>
                  <Text style={{ color: "#fff", fontSize: 12 }}>💬 1</Text>
                </View>
              </View>

              <Text style={{ color: "#8A90A0", fontSize: 12, marginTop: 2 }}>
                Historique visible bientôt...
              </Text>
            </View>
          )}

          {activeTab === "stats" && (
            <View
              style={{
                backgroundColor: "#101628",
                borderRadius: 16,
                padding: 14,
                gap: 10,
              }}
            >
              <Text
                style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}
              >
                Vos stats
              </Text>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#141A2E",
                    borderRadius: 14,
                    padding: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
                    12
                  </Text>
                  <Text style={{ color: "#8A90A0", fontSize: 12 }}>
                    Entraînements
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#141A2E",
                    borderRadius: 14,
                    padding: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
                    1 240
                  </Text>
                  <Text style={{ color: "#8A90A0", fontSize: 12 }}>
                    Volume (kg)
                  </Text>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: "#141A2E",
                  borderRadius: 14,
                  padding: 12,
                  marginTop: 2,
                }}
              >
                <Text style={{ color: "#fff", marginBottom: 4 }}>
                  Progression
                </Text>
                <Text style={{ color: "#8A90A0", fontSize: 12 }}>
                  Graphique à venir 📈
                </Text>
              </View>
            </View>
          )}

          {activeTab === "trophies" && (
            <View
              style={{
                backgroundColor: "#101628",
                borderRadius: 16,
                padding: 14,
                gap: 10,
              }}
            >
              <Text
                style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}
              >
                Trophées (3/6)
              </Text>

              {/* Trophée débloqué */}
              <View
                style={{
                  backgroundColor: "rgba(0,255,136,0.12)",
                  borderColor: "#00ff88",
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 12,
                  gap: 4,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  🎯 Premier pas
                </Text>
                <Text style={{ color: "#D2D4DD", fontSize: 12 }}>
                  Premier entraînement complété
                </Text>
                <Text style={{ color: "#00ff88", fontSize: 12, marginTop: 2 }}>
                  Débloqué ✓
                </Text>
              </View>

              {/* Trophée lock */}
              <View
                style={{
                  backgroundColor: "#141A2E",
                  borderRadius: 14,
                  padding: 12,
                  gap: 4,
                  opacity: 0.6,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  🔒 Régularité
                </Text>
                <Text style={{ color: "#D2D4DD", fontSize: 12 }}>
                  7 jours consécutifs d'entraînement
                </Text>
                <Text style={{ color: "#8A90A0", fontSize: 11, marginTop: 1 }}>
                  Entraînez-vous 7 jours de suite
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
