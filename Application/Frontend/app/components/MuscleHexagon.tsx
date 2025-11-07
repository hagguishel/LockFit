// app/components/MuscleHexagon.tsx
import React from "react";
import { View, Text } from "react-native";
import Svg, { Line, Polygon, Text as SvgText, Circle } from "react-native-svg";

// le type minimal dont on a besoin
export type Workout = {
  date: string | Date;
  completed?: boolean;
  exercises: {
    name: string;
    sets?: number;
  }[];
};

type MuscleHexagonProps = {
  workouts: Workout[];
};

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// map exo -> groupe musculaire (d’après ton seed)
const exerciseToMuscleGroup: Record<
  string,
  "Pectoraux" | "Dos" | "Jambes" | "Bras" | "Épaules" | "Core"
> = {
  "bench press barre": "Pectoraux",
  "developpe incline halteres": "Pectoraux",
  "squat barre": "Jambes",
  deadlift: "Dos",
  "deadlift conventionnel": "Dos",
  "tractions pronation": "Dos",
  "developpe epaules halteres": "Épaules",
  "rowing barre": "Dos",
  "curl biceps halteres": "Bras",
  "extension triceps poulie corde": "Bras",
  "presse a cuisses": "Jambes",
  "leg press": "Jambes",
  // rattrapage générique
  "developpe couche": "Pectoraux",
  "developpe militaire": "Épaules",
  crunch: "Core",
  gainage: "Core",
};

const MUSCLE_ORDER: Array<"Pectoraux" | "Dos" | "Jambes" | "Bras" | "Épaules" | "Core"> = [
  "Pectoraux",
  "Dos",
  "Jambes",
  "Bras",
  "Épaules",
  "Core",
];

export const MuscleHexagon: React.FC<MuscleHexagonProps> = ({ workouts }) => {
  // 1. 7 derniers jours
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const muscleCounts: Record<
    "Pectoraux" | "Dos" | "Jambes" | "Bras" | "Épaules" | "Core",
    number
  > = {
    Pectoraux: 0,
    Dos: 0,
    Jambes: 0,
    Bras: 0,
    Épaules: 0,
    Core: 0,
  };

  // 2. on remplit selon les workouts
  workouts.forEach((w) => {
    const wDate = typeof w.date === "string" ? new Date(w.date) : w.date;
    if (!wDate || wDate < sevenDaysAgo) return;
    if (w.completed === false) return;

    w.exercises.forEach((ex) => {
      const n = normalize(ex.name);
      let matched: keyof typeof muscleCounts | null = null;
      for (const [key, group] of Object.entries(exerciseToMuscleGroup)) {
        if (n.includes(key)) {
          matched = group;
          break;
        }
      }
      if (matched) {
        const vol = typeof ex.sets === "number" ? ex.sets : 1;
        muscleCounts[matched] += vol;
      }
    });
  });

  // 3. on prépare les points du polygone
  const values = MUSCLE_ORDER.map((m) => muscleCounts[m]);
  const maxVal = Math.max(10, ...values); // pour avoir toujours quelque chose
  const size = 200;
  const center = size / 2;
  const radius = 70;

  // pour chaque axe, on calcule le point
  const points = MUSCLE_ORDER.map((muscle, index) => {
    const angle = (Math.PI * 2 * index) / MUSCLE_ORDER.length - Math.PI / 2; // on part vers le haut
    const value = muscleCounts[muscle];
    const r = (value / maxVal) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  });

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // pour dessiner les 3 cercles/hexagones de fond
  const levels = [1, 0.66, 0.33];

  return (
    <View
      style={{
        backgroundColor: "#0E0E10",
        borderRadius: 24,
        padding: 16,
        borderColor: "rgba(255,255,255,0.05)",
        borderWidth: 1,
      }}
    >
      <Text style={{ color: "white", fontSize: 18, fontWeight: "700" }}>
        Équilibre musculaire
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
        Analyse de la semaine
      </Text>

      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size}>
          {/* niveaux de fond */}
          {levels.map((lvl, idx) => {
            const lvlPoints = MUSCLE_ORDER.map((_, index) => {
              const angle = (Math.PI * 2 * index) / MUSCLE_ORDER.length - Math.PI / 2;
              const r = radius * lvl;
              const x = center + r * Math.cos(angle);
              const y = center + r * Math.sin(angle);
              return `${x},${y}`;
            }).join(" ");
            return (
              <Polygon
                key={idx}
                points={lvlPoints}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
                fill="none"
              />
            );
          })}

          {/* axes */}
          {MUSCLE_ORDER.map((_, index) => {
            const angle = (Math.PI * 2 * index) / MUSCLE_ORDER.length - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            return (
              <Line
                key={index}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={1}
              />
            );
          })}

          {/* polygone de l'utilisateur */}
          <Polygon
            points={polygonPoints}
            fill="rgba(18, 226, 154, 0.28)"
            stroke="#12E29A"
            strokeWidth={2}
          />

          {/* petit point au centre */}
          <Circle cx={center} cy={center} r={4} fill="#12E29A" />

          {/* labels autour */}
          {MUSCLE_ORDER.map((label, index) => {
            const angle = (Math.PI * 2 * index) / MUSCLE_ORDER.length - Math.PI / 2;
            const x = center + (radius + 18) * Math.cos(angle);
            const y = center + (radius + 18) * Math.sin(angle);
            return (
              <SvgText
                key={label}
                x={x}
                y={y}
                fill="white"
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
              >
                {label}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    </View>
  );
};
