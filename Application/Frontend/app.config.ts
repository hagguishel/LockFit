import { ExpoConfig } from "expo/config";
const config: ExpoConfig = {
  name: "LockFit",
  slug: "lockfit",
  scheme: "lockfit",
  extra: { EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL ?? "https://lockfit.onrender.com" },
};
export default config;
