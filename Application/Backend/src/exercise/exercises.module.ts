import { Module } from "@nestjs/common";
import { ExerciseController } from "./exercises.controller";
import { ExerciseService } from "./exercises.service";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  controllers: [ExerciseController],
  providers: [ExerciseService, PrismaService],
})
export class ExercisesModule {}
