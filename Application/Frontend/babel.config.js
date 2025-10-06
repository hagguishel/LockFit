module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "expo-router/babel",
      // Reanimated DOIT être le dernier plugin sinon écran qui tourne
      "react-native-reanimated/plugin"
    ],
  };
};
