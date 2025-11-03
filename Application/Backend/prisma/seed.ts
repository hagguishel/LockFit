import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const exercises = [
    {
      slug: "bench-press-barre",
      name: "Bench Press Barre",
      primaryMuscle: "chest",
      secondaryMuscle: "triceps",
      equipment: "barbell",
      level: "intermediate",
    },
    {
      slug: "incline-dumbbell-press",
      name: "Développé incliné haltères",
      primaryMuscle: "chest",
      secondaryMuscle: "shoulders",
      equipment: "dumbbells",
      level: "intermediate",
    },
    {
      slug: "squat-barre",
      name: "Squat Barre",
      primaryMuscle: "quadriceps",
      secondaryMuscle: "glutes",
      equipment: "barbell",
      level: "intermediate",
    },
    {
      slug: "deadlift-conventionnel",
      name: "Deadlift",
      primaryMuscle: "back",
      secondaryMuscle: "hamstrings",
      equipment: "barbell",
      level: "advanced",
    },
    {
      slug: "pull-up",
      name: "Tractions pronation",
      primaryMuscle: "lats",
      secondaryMuscle: "biceps",
      equipment: "bodyweight",
      level: "intermediate",
    },
    {
      slug: "shoulder-press-haltere",
      name: "Développé épaules haltères",
      primaryMuscle: "deltoids",
      secondaryMuscle: "triceps",
      equipment: "dumbbells",
      level: "beginner",
    },
    {
      slug: "barbell-row",
      name: "Rowing barre",
      primaryMuscle: "back",
      secondaryMuscle: "biceps",
      equipment: "barbell",
      level: "intermediate",
    },
    {
      slug: "bicep-curl-halteres",
      name: "Curl biceps haltères",
      primaryMuscle: "biceps",
      equipment: "dumbbells",
      level: "beginner",
    },
    {
      slug: "tricep-extension-corde",
      name: "Extension triceps poulie corde",
      primaryMuscle: "triceps",
      equipment: "cable",
      level: "beginner",
    },
    {
      slug: "leg-press",
      name: "Presse à cuisses",
      primaryMuscle: "quadriceps",
      secondaryMuscle: "glutes",
      equipment: "machine",
      level: "beginner",
    },
  ];

  for (const ex of exercises) {
    await prisma.exercise.upsert({
      where: { slug: ex.slug },
      update: {},
      create: ex,
    });
  }

  console.log("✅ Seed terminé : exercices insérés / mis à jour");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Erreur de seed :", e);
    await prisma.$disconnect();
    process.exit(1);
  });
