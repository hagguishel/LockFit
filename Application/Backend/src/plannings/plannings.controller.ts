import { Controller,Body, Post, Get, Query, Param, Patch, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { PlanningsService } from './plannings.service';
import { CreerPlanningDto } from './dto/creer-planning.dto';
import { ListPlanningsQuery } from './dto/list-plannings.query';
import { AjouterJourDto } from './dto/ajouter-jour.dto';
import { UpdatePlanningJourDto } from './dto/update-planning-jour.dto';
import { FinishPlanningJourDto } from './dto/finish-planning-jour.dto';

/**
 * Contrôleur Plannings
 * - Expose les routes HTTP et délègue au service.
 * - Le ValidationPipe global (whitelist + transform) valide les DTO/Query.
 *
 * NB: si tu as un global prefix "api/v1" dans principal.ts,
 * alors l'URL finale sera /api/v1/plannings/...
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
    console.log('test');
		return this.service.create(dto);
	}

  /**
 * POST /api/v1/plannings/:id/jours
 * - Ajoute un jour au planning (date ISO, workoutId, note?)
 */
  @Post(':id/jours')
  addJour(@Param('id') planningId: string, @Body() dto: AjouterJourDto) {
    return this.service.addJour(planningId, dto);
  }

  @Post(':planningId/jours/:jourId/finish')
  @HttpCode(HttpStatus.OK)
  finishJour(
    @Param('planningId') planningId: string,
    @Param('jourId') jourId: string,
    @Body() dto: FinishPlanningJourDto
  ) {
    return this.service.finishJour(planningId, jourId, dto);
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

  @Patch(':planningId/jours/:jourId')
  updateJour(
    @Param('planningId') planningId: string,
    @Param('jourId') jourId: string,
    @Body() dto: UpdatePlanningJourDto,
  ) {
    return this.service.updateJour(planningId, jourId, dto);
  }

  @Delete(':planningId/jours/:jourId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteJour(
    @Param('planningId') planningId: string,
    @Param('jourId') jourId: string,
  ) {
    return this.service.deleteJour(planningId, jourId);
  }

}
