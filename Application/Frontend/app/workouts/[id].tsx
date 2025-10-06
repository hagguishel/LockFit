import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { getWorkout, finishWorkout, type Workout } from "@/lib/workouts";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] =useState<Workout | null>(null);
  const [loading, setLoading] = useRouter(true);
}

async function load() {

}
