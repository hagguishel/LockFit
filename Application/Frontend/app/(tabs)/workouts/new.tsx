// app/(tabs)/workouts/new.tsx
import React from "react";
import {
  Alert,
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { createWorkout } from "@/lib/workouts";
import {  type ExerciseDef } from "@/lib/exercises";

type DraftExercice = ExerciseDef & {
  nbSeries: number;
  repsCibles: number;
  poidsCibles:number;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));



export default function NewWorkoutScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();

  // si on revient de /exercises?mode=pick
  const params = useLocalSearchParams<{
    pickedId?: string;
    pickedName?: string;
    pickedPrimaryMuscle?: string;
    current?: string;
  }>();

  const [title, setTitle] = React.useState("");
  const [exercises, setExercises] = React.useState<DraftExercice[]>([]);
  const [saving, setSaving] = React.useState(false);

  // quand on revient de la lib d'exos avec un choix

  React.useEffect(() => {
    if (params.current) {
      try {
        const parsed = JSON.parse(params.current as string) as ExerciseDef[];
        const withDefault: DraftExercice[] = parsed.map((e) => ({
          ...e,
          nbSeries: 4,
          repsCibles: 10,
          poidsCibles: 0,
        }));
        setExercises(withDefault);
      } catch (e) {
        console.log("[new] JSON current invalide", e);
      }
    }
  }, [params.current]);

  React.useEffect(() => {
    if (params.pickedId && params.pickedName) {
      const slug =
      params.pickedName
      ?.toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "") ?? "";

      const newExercise: DraftExercice = {

        id: params.pickedId,
        name: params.pickedName,
        slug,
        primaryMuscle: params.pickedPrimaryMuscle ?? "",
        nbSeries: 4,
        repsCibles: 10,
        poidsCibles: 0,
      };
      setExercises((curr) => [...curr, newExercise]);
    }
  }, [params.pickedId, params.pickedName, params.pickedPrimaryMuscle]);

  // supprimer un exo du brouillon
  function handleRemoveExercise(id: string) {
    setExercises((curr) => curr.filter((e) => e.id !== id));
  }

  // créer la séance → POST /workouts
  async function handleCreate() {
    const trimmed = title.trim();

    if (!trimmed) {
      Alert.alert("Titre requis", "Merci d'indiquer un titre.");
      return;
    }

    if (exercises.length === 0) {
      Alert.alert(
        "Aucun exercice",
        "Ajoute au moins un exercice avant de créer la séance."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: trimmed,
        items: exercises.map((ex, index) => ({
          order: index + 1,
          exerciseId: ex.id,
          sets: Array.from({ length: ex.nbSeries }).map(() => ({
            reps: ex.repsCibles,
            weight: ex.poidsCibles,
          })),
        })),
      };

      const w = await createWorkout(payload);

      if (!w?.id) {
        Alert.alert("Erreur", "Réponse inattendue du serveur.");
        return;
      }

      // reset
      setTitle("");
      setExercises([]);

      // aller sur le détail
      router.replace(`/workouts/${w.id}`);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de créer la séance.");
    } finally {
      setSaving(false);
    }
  }

  function Stepper({
  value,
  onInc,
  onDec,
  disabled,
} : {
  value: string | number;
  onInc: () => void;
  onDec: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable disabled={disabled} onPress={onDec} style={styles.stepBtn}>
        <Ionicons name="remove" size={16} color="#7AD3FF" />
      </Pressable>
      <Text style={styles.stepVal}>{value}</Text>
      <Pressable disabled={disabled} onPress={onInc} style={styles.stepBtn}>
        <Ionicons name="add" size={16} color="#7AD3FF" />
      </Pressable>
    </View>
  )
}
  // rendu d'un exo dans le brouillon
  function renderExerciseRow({
     item,
    index,
  }: {
    item: DraftExercice;
    index: number;
  }) {
    const onIncSeries = () =>
      setExercises((list) =>
        list.map((ex) =>
          ex.id === item.id ? { ...ex, nbSeries: clamp(ex.nbSeries + 1, 1, 20 ) } : ex
        )
      );
    const onDecSeries = () =>
      setExercises((list) =>
        list.map((ex) =>
          ex.id === item.id ? { ...ex, nbSeries: clamp(ex.nbSeries - 1, 1, 20 ) } : ex
        )
      );
    const onIncReps = () =>
      setExercises((list) =>
        list.map((ex) =>
          ex.id === item.id ? { ...ex, repsCibles: clamp(ex.repsCibles + 1, 1, 50 ) } : ex
        )
      );
    const onDecReps = () =>
      setExercises((list) =>
        list.map((ex) =>
          ex.id === item.id ? { ...ex, repsCibles: clamp(ex.repsCibles - 1, 1, 50 ) } : ex
        )
      );
    const onIncKg = () =>
      setExercises((list) =>
        list.map((ex) =>
        ex.id === item.id ? { ...ex, poidsCibles: clamp(ex.poidsCibles + 2.5, 0, 999 ) } : ex
        )
      );
    const onDecKg = () =>
      setExercises((list) =>
        list.map((ex) =>
        ex.id === item.id ? { ...ex, poidsCibles: clamp(ex.poidsCibles - 2.5, 0, 999 ) } :ex
        )
      );

    return (
      <View style={styles.exerciseCard}>
        <View
          style={[
            styles.exerciseIndex,
            index === 0 ? styles.exerciseIndexFirst : null,
          ]}
        >
          <Text style={styles.exerciseIndexText}>{index + 1}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          <View style={styles.exerciseMetaRow}>
            <Text style={styles.exerciseMeta}>
              {item.primaryMuscle && item.primaryMuscle.length > 0
              ? item.primaryMuscle
              : "Muscle non renseigné"}
            </Text>
          </View>

          {/* Serie/rep/kg */}
          <View style={styles.configRow}>
            <View style={styles.configBlock}>
              <Text style={styles.configLabel}>Série</Text>
              <Stepper value={item.nbSeries} onInc={onIncSeries} onDec={onDecSeries} />
            </View>

            <View style={styles.configBlock}>
              <Text style={styles.configLabel}>Reps</Text>
              <Stepper value={item.repsCibles} onInc={onIncReps} onDec={onDecReps} />
            </View>

            <View style={styles.configBlock}>
              <Text style={styles.configLabel}>Kg</Text>
              <Stepper
              value={item.poidsCibles.toFixed(1)}
              onInc={onIncKg}
              onDec={onDecKg} />
            </View>
          </View>
          <Pressable
          style={styles.removeBtn}
          onPress={() => handleRemoveExercise(item.id)}
          disabled={saving}
          >
            <Text style={styles.removeBtnText}>Supp</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* HEADER gradient */}
      <LinearGradient
        colors={["#1a1a35", "#0f0f23"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={{ color: "#fff", fontSize: 16 }}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Nouvelle séance</Text>
          <Text style={styles.headerSubtitle}>Crée ton entraînement</Text>
        </View>
        <View style={{ width: 30 }} />
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: tabBarHeight + 140 }}
        >
          {/* bloc info glass */}
          <BlurView intensity={25} tint="dark" style={styles.infoCard}>
            <Text style={styles.infoTitle}>Détails de la séance</Text>
            <Text style={styles.infoText}>
              Donne un nom et ajoute tes exercices depuis ta bibliothèque.
            </Text>
          </BlurView>

          {/* champ titre */}
          <View style={styles.field}>
            <Text style={styles.label}>Nom de la séance</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ex : Push Day, Full body, Dos…"
              placeholderTextColor="#6B7280"
              style={styles.input}
              editable={!saving}
              maxLength={50}
            />
          </View>

          {/* liste des exos ajoutés */}
          <View style={styles.field}>
            <Text style={styles.label}>Exercices ({exercises.length})</Text>

            {exercises.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  Aucun exercice pour l’instant.
                </Text>
              </View>
            ) : (
              <FlatList
                data={exercises}
                keyExtractor={(item) => item.id}
                renderItem={renderExerciseRow}
                scrollEnabled={false}
                contentContainerStyle={{ gap: 10 }}
              />
            )}
          </View>

          {/* bouton ouvrir la bibliothèque */}
          <Pressable
            style={[styles.addExerciseBtn, saving && { opacity: 0.6 }]}
            onPress={() =>
              router.push({
                pathname: "/exercise",
                params: {
                  mode: "pick",
                  current: JSON.stringify(exercises),
                },
              })
            }
            disabled={saving}
          >
            <Text style={styles.addExerciseIcon}>＋</Text>
            <Text style={styles.addExerciseText}>Ajouter un exercice</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* FOOTER CTA */}
      <View style={[styles.footer, { bottom: tabBarHeight + 12 }]}>
        <Pressable
          style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#061018" />
          ) : (
            <Text style={styles.primaryBtnText}>Créer la séance</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.secondaryBtn}
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text style={styles.secondaryBtnText}>Annuler</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // fond
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#8C9BAD",
    fontSize: 12,
    marginTop: 4,
  },

  /* bloc glass */
  infoCard: {
    marginHorizontal: 16,
    marginTop: -14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(122, 211, 255, 0.12)",
    padding: 16,
    gap: 6,
  },
  infoTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  infoText: {
    color: "#B1B9C7",
    fontSize: 13,
  },

  /* champs */
  field: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  label: {
    color: "#E6F0FF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "rgba(13,16,26,0.4)",
    borderWidth: 1,
    borderColor: "rgba(124,211,255,0.05)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 15,
  },

  emptyBox: {
    backgroundColor: "rgba(12,17,27,0.3)",
    borderRadius: 14,
    padding: 16,
  },
  emptyText: {
    color: "#8C9BAD",
  },

  /* exo card */
  exerciseCard: {
    backgroundColor: "rgba(14,17,30,0.65)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(124,211,255,0.03)",
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  exerciseIndex: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(138, 153, 187, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseIndexFirst: {
    backgroundColor: "rgba(18, 226, 154, 0.14)",
    borderColor: "rgba(18,226,154,0.4)",
    borderWidth: 1,
  },
  exerciseIndexText: {
    color: "#fff",
    fontWeight: "700",
  },
  exerciseName: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  exerciseMetaRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginTop: 3,
  },
  exerciseMeta: {
    color: "#B1B9C7",
    fontSize: 12,
  },
  exerciseIdDebug: {
    color: "#475569",
    fontSize: 11,
  },
  removeBtn: {
    backgroundColor: "rgba(255,107,107,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  removeBtnText: {
    color: "#FF6B6B",
    fontWeight: "600",
    fontSize: 12,
  },

  /* bouton ajouter */
  addExerciseBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#12E29A",
    borderRadius: 14,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addExerciseIcon: {
    color: "#12E29A",
    fontWeight: "700",
    fontSize: 18,
  },
  addExerciseText: {
    color: "#12E29A",
    fontWeight: "600",
    fontSize: 15,
  },

  /* footer */
  footer: {
    position: "absolute",
    left: 16,
    right: 16,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: "#12E29A",
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#061018",
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryBtn: {
    backgroundColor: "transparent",
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: "#8C9BAD",
    fontWeight: "600",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(12,18,28,0.6)",
    borderWidth: 1,
    borderColor: "rgba(124,211,255,0.1)",
    borderRadius: 999,
    height: 36,
    paddingHorizontal: 8,
    gap: 10,
    alignSelf: "flex-start",
  },
  stepBtn: { padding: 4 },
  stepVal: { color: "#FFFFFF", fontWeight: "700", minWidth: 28, textAlign: "center"},

  configRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    marginBottom: 8,
    flexWrap: "wrap",
  },

  configBlock: {
    gap: 6,
  },
  configLabel: {
    color: "#8C9BAD",
    fontSize: 11,
    fontWeight: "700",
  },
});
