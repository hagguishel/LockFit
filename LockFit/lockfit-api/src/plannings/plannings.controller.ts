import { Controller,Body, Post } from '@nestjs/common';
import { PlanningsService } from './plannings.service';
import { CreerPlanningDto } from './dto/creer-planning.dto';
/**
 * Controller = colle l'HTTP à la logique métier.
 * - Reçoit le body
 * - Laisse ValidationPipe vérifier le DTO
 * - Appelle le service
 */
@Controller('plannings')
export class PlanningsController {
	constructor(private readonly service: PlanningsService) {}

	@Post()
	create(@Body() dto: CreerPlanningDto) {
		return this.service.create(dto);
	}
}
