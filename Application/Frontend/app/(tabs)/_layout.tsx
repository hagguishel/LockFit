// app/(tabs)/_layout.tsx — layout des onglets
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#12E29A",
        tabBarInactiveTintColor: "#98A2B3",
        tabBarStyle: {
          backgroundColor: "#0B0F13",
          borderTopColor: "transparent",
          height: Platform.select({ ios: 92, default: 70 }),
          paddingTop: 6,
          paddingBottom: Platform.select({ ios: 22, default: 10 }),
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          position: "absolute",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      {/* Accueil -> app/(tabs)/index.tsx */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      {/* Entraînements -> app/(tabs)/index.tsx */}
      <Tabs.Screen
        name="workouts/index"
        options={{
          title: "Entraînements",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell-outline" size={size} color={color} />
          ),
        }}
      />

      {/* On enlève les routes qui apparaissent sur l'application*/}
      <Tabs.Screen name="workouts/new" options={{ href: null }} />
        <Tabs.Screen name="workouts/[id]" options={{ href: null }} />
        <Tabs.Screen name="workouts/workoutlive" options={{ href: null }} />


      {/* Social -> app/(tabs)/index.tsx */}
      <Tabs.Screen
        name="social/index"
        options={{
          title: "Social",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Profil -> app/(tabs)/index.tsx */}
      <Tabs.Screen
        name="profil/index"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
