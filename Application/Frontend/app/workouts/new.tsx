//Fichier de l'écran de création de l'entrainement.

import { useState } from "react";
import { Alert, StyleSheet, Text, View, TextInput, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";


export default function NewWorkoutScreen() {
    const router = useRouter();
    const [title, setTitle] = useState(""); //Stockage du titre saisi par l'utilisateur
        
    //Soumission du formulaire sans appel a l'API (V1)
    const handleCreate = () => {
        const trimmed = title.trim(); //Enlève les espaces du début et de fin

    if (!trimmed) {
        Alert.alert("Merci d'indiquer un titre pour votre entraînement.")
        return;
    }

    if (trimmed.length > 50) {
        Alert.alert("50 caractères maximum.")
        return;
    }

    //V1: confirmation locale seulement.

    Alert.alert(`Entraînement crée: "${trimmed}"`), [
        {
        text: "ok",
        onPress: () => {
            router.replace("/workouts"); //revient a la liste apres la creation de l'entrainement
        },
        },
    ];
    };
    return (
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            {/* Configure le header de cet écran */}
            <Stack.Screen options={{ title: "créer un entraînement" }} />

            <View style={styles.card}>
                <Text style={styles.label}>Nom de la séance</Text>
                <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Ex: Push Day, Pull Day, Legs..."
                    placeholderTextColor="#6B7280"
                    style={styles.input}
                    maxLength={250}
                    returnKeyType="done"
                    onSubmitEditing={handleCreate}
                    />

                    <Pressable style={styles.cta} onPress={handleCreate}>
                        <Text style={styles.ctaText}>Créer</Text>
                    </Pressable>

                    <Pressable style={styles.secondary} onPress={() => router.back()}>
                        <Text style={styles.secondaryText}>Annuler</Text>
                    </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0F1420", padding: 16},
    card: {
        borderWidth: 1,
        borderColor: "#232A3A",
        backgroundColor: "#121927",
        borderRadius: 16,
        padding: 16,
        gap: 12,
    },

    label: {color: "#12E29A", fontWeight: "600", marginBottom: 4},

    input: {
        borderWidth: 1,
        borderColor: "#232A3A",
        backgroundColor: "#0F1420",
        color: "#E6F0FF",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10
    },

    cta: {
        backgroundColor: "#12E29A",
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 8,
    },
    ctaText: { color: "#061018", fontWeight: "700" },

    secondary: {
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: "center",
    },
    secondaryText: { color: "#98A2B3", fontWeight: "600"}
});
