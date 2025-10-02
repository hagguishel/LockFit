import { IsISO8601, IsString } from "class-validator";
// DTO = structure attendue pour POST /plannings

export class CreerPlanningDto {
	@IsString()
	nom!: string;

	@IsISO8601()
	debut!: string; // date en ISO

	@IsISO8601()
	fin!: string; // date en ISO
}
