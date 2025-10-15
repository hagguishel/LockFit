import { Controller, Get,  Param, Query } from "@nestjs/common";
import { ExerciseService } from "./exercises.service";
import { QueryExerciseDto } from "./dto/query-exercise.dto";

@Controller("exercises")
export class ExerciseController {
  constructor(private service: ExerciseService) {}

@Get()
list(@Query() query: QueryExerciseDto) {
  return this.service.list(query);
}

@Get(":idOrSlug")
one(@Param("idOrSlug") idOrSlug: string) {
  return this.service.one(idOrSlug)
  }
}
