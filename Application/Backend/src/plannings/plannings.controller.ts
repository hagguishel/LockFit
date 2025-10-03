import { Controller,Body, Post, Get, Query, Param } from '@nestjs/common';
import { PlanningsService } from './plannings.service';
import { CreerPlanningDto } from './dto/creer-planning.dto';
import { ListPlanningsQuery } from './dto/list-plannings.query';
/**
 * Contrôleur Plannings
 * - Expose les routes HTTP et délègue au service.
 * - Le ValidationPipe global (whitelist + transform) valide les DTO/Query.
 */
@Controller('plannings')
export class PlanningsController {
	constructor(private readonly service: PlanningsService) {}

	/**
   	* POST /api/v1/plannings
   	* Crée un planning (retourne l'objet créé).
   	*/
	@Post()
	create(@Body() dto: CreerPlanningDto) {
		return this.service.create(dto);
	}

	/**
   	* GET /api/v1/plannings
   	* Paramètres:
   	*  - from, to: dates ISO optionnelles pour filtrer par chevauchement
   	*  - page, limit: pagination (page ≥ 1, 1 ≤ limit ≤ 100)
   	* Retourne: { items, total }
   	*/

	@Get()
	list(@Query() q: ListPlanningsQuery) {
		return this.service.list(q);
	}
   /**
   * GET /api/v1/plannings/:id
   * - Retourne le planning demandé
   * - 404 si introuvable
   */
  @Get(':id')
  findOne(@Param('id') id : string) {
    return this.service.findOne(id);
  }
}
