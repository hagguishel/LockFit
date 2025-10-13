import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router"; // <-- on n'importe que le hook

// Configure l'URL API
const API = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export default function SignUpScreen() {
    const router = useRouter(); //pour revenir en arrière ou changer d'écran

    // ici, on stock ce que tape l'utilisateur dans les différents champs
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    //validation: on autorise le bouton seulement si tous les champs on était validé
    const canSubmit = firstName && lastName && email.includes("@") && password.length >= 8;

    //Appel utilisé lorsqu'on appuie sur créer un compte
    async function onSubmit() {
        if (!canSubmit || loading) return;
        setLoading(true); //active le spinner

        try {
            const res = await fetch(`${API}/auth/signup`, {
                method: "POST", //on envoie les données avec une méthode post
                headers: { "Content-Type": "application/json" }, //on envoie du json
                body: JSON.stringify({ email, password, firstName, lastName }), //payload attendue par l'API
            });

            const data = await res.json(); //reponse JSON du serveur

            if (!res.ok) {
                //si le serveur repond une erreur (ex: 409 email deja utilisée)
                const msg = data?.message || "Inscription impossible";
                Alert.alert("Erreur", msg); // pop-up d'erreur simple
                return;
            }

            //succès : le backend renvoie accesToken, refreshTOken, user
            Alert.alert("Bienvenue 👋", `Compte créé pour ${data.user.firstName}`, [
                //on remplace l'écran par /workouts
                { text: "OK", onPress: () => router.replace("/workouts") },
            ]);
        } catch (e: any) {
            //problème réseau ou serveurr innaccesible
            Alert.alert("Erreur réseau", e?.message ?? "Vérifiez votre connexion");
        } finally {
            setLoading(false); //on coupe le spinner dans tous les cas
        }
    }

    return (
        //écran avec marges respectant l'encoches + fond sombre
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
            <Text style={styles.title}>Créer un compte</Text>

            <View style={styles.form}>
                {/* Champ prénom */}
                <Text style={styles.label}>Prénom</Text>
                <TextInput
                    value={firstName}
                    onChangeText={setFirstName}   //on met a jour a chaque frappe
                    placeholder="Tom"
                    placeholderTextColor="#64748B"
                    style={styles.input}
                    autoCapitalize="words"  //Met la première lettre du prénom en majuscule
                />

                {/* Champ nom */}
                <Text style={styles.label}>Nom</Text>
                <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Lagarde"
                    placeholderTextColor="#64748B"
                    style={styles.input}
                    autoCapitalize="words"
                />

                {/* Champ email */}
                <Text style={styles.label}>Email</Text>
                <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="user@example.com"
                    placeholderTextColor="#64748B"
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                {/* Champ Mot de passe */}
                <Text style={styles.label}>Mot de passe</Text>
                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="8 caractères minimum"
                    placeholderTextColor={"#64748B"}
                    style={styles.input}
                    secureTextEntry  //masque les caractères
                />

                {/* Bouton d'envoi */}
                <Pressable
                    onPress={onSubmit} //on appelle la fonction onSubmit pour l'appel a l'API lors du clic
                    disabled={!canSubmit || loading}  //On désactive le bouton si le formulaire est invalide
                    style={[styles.cta, (!canSubmit || loading) && { opacity: 0.6 }]} //petit effet visuel disabled
                >
                    {loading
                        ? <ActivityIndicator />  //spinner pendant l'appel
                        : <Text style={styles.ctaText}>Créer mon compte</Text>}
                </Pressable>

                {/* Lien retour simple */}
                <Pressable onPress={() => router.back()} style={{ alignSelf: "center", marginTop: 16 }}>
                    <Text style={{ color: "#98A2B3" }}>Retour</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

// styles visuels (couleurs/espacements)
const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: "#0F1420" },
    title: { fontSize: 24, fontWeight: "700", color: "#12E29A", textAlign: "center", marginVertical: 12 },
    form: { gap: 8, marginTop: 8 },
    label: { color: "#E6F0FF", fontSize: 14, marginTop: 8 },
    input: {
        backgroundColor: "#0B1220",
        borderColor: "#1F2937",
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: "#E6F0FF",
    },
    cta: {
        backgroundColor: "#12E29A",
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 16,
        alignItems: "center",
    },
    ctaText: { color: "#061018", fontWeight: "700" },
});
