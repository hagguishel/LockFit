import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueryExerciseDto } from "./dto/query-exercise.dto";

@Injectable()
export class ExerciseService{
  constructor(private prisma: PrismaService) {}

  list(query: QueryExerciseDto) {
    const { muscle, equipment, level, q } = query;
    return this.prisma.exercise.findMany({
      where: {
        AND: [
          muscle ? { primaryMuscle: { contains: muscle, mode: "insensitive" } } : {},
          equipment ? { equipment: { contains: equipment, mode: "insensitive" } } : {},
          level ? { level: { contains: level, mode: "insensitive" } } : {},
          q ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { instructions: { contains: q, mode: "insensitive" } },
            ]
          } : {}
        ]
      },
      orderBy: { name: "asc" }
    });
  }
  one(idOrSlug: string) {
    return this.prisma.exercise.findMany({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] }
    });
  }
}
