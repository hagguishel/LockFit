import { IsISO8601, IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";
/**
 * DTO (Query) pour GET /plannings
 * - Valide/convertit les paramètres de pagination et de filtres temporels.
 * - "transform: true" dans le ValidationPipe convertit automatiquement les strings → number.
 */
export class ListPlanningsQuery {
 /** Filtre: date de début de fenêtre (ISO). Ex: 2025-10-01 ou 2025-10-01T00:00:00.000Z */
	@IsOptional()
	@IsISO8601()
	from?: string;

	/** Filtre: date de fin de fenêtre (ISO) */
	@IsOptional()
	@IsISO8601()
	to?: string;

	/** Pagination: page courante (≥ 1). Par défaut 1. */
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number = 1;

	/** Pagination: taille de page (1..100). Par défaut 20. */
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number = 20;
}
