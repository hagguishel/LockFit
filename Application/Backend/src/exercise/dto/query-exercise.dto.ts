import { IsOptional, IsString } from "class-validator";

export class QueryExerciseDto {
  @IsOptional() @IsString() muscle?: string;
  @IsOptional() @IsString() equipment?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsString() q?: string; // recherce textuelle (nom/instruction)
}
