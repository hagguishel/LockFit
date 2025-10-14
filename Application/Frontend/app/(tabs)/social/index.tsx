import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "react-native";

export default function SocialScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0F1420", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#E6F0FF" }}>Social</Text>
    </SafeAreaView>
  );
}
