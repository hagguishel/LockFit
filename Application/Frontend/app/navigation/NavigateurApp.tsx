import React from "react";
import { Button } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ListeEntrainements from "app/ecrans/ListeEntrainements";
import FormulaireEntrainement from "app/ecrans/FormulaireEntrainement";
import DetailsEntrainement from "app/ecrans/DetailsEntrainement";
import EntrainementLive from "app/ecrans/EntrainementLive";

export type RootStackParamList = {
  Liste: undefined;
  Nouveau: undefined;
  Détails: { id: string };
  Entrainement: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
export default function NavigateurApp() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
        name="Liste"
        component={ListeEntrainements}
        options={({ navigation }) => ({
          title: "Mes entrainements",
          headerRight: () => (
            <Button
            title="Nouveau"
            onPress={() => navigation.navigate("Nouveau")}
            />
          ),
        })} />
        <Stack.Screen
        name="Nouveau"
        component={FormulaireEntrainement} options={{ title: "Nouveau workout" }}
        />
        <Stack.Screen
        name="Détails"
        component={DetailsEntrainement}
        options={{ title: "Détails" }}
        />
        <Stack.Screen
        name="Entrainement"
        component={EntrainementLive}
        options={{ title: "Entrainement (live)" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
