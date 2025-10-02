// Fichier qui reçoit les appels HTTP, vérifie la forme via DTO, puis délègue au service (DB)
import { Controller, Get, Post, Body, Param, Patch, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';   // Décorateurs Nest pour routes & corps de requête
import { CreateWorkoutDto } from './dto/create-workout.dto';    // Contrat d'entrée pour créer un workout
import { WorkoutsService } from './workouts.service';           // Service qui parlera à la base
import { UpdateWorkoutDto } from './dto/update-workout.dto';
@Controller(['workouts', 'entrainements'])                        // Toutes les routes ici commencent par /workouts
export class WorkoutsController {                                // Contrôleur = “standardiste” HTTP
  constructor(private readonly service: WorkoutsService) {}      // Injection du service (logique & DB)

  @Post()                                                        // POST /api/v1/workouts
  create(@Body() dto: CreateWorkoutDto) {                        // Lit & valide le JSON contre le DTO
    return this.service.create(dto);                             // Délègue la création au service
  }

  @Get()                                                                 // GET /api/v1/workouts
  findAll(@Query('from') from?: string, @Query('to') to?: string) {     // Passe les éventuels filtres de date au service
    return this.service.findAll({ from, to });                         // Délègue la lecture au service et renvoie { items, total }
  }

  //GET /api/v1/workouts/:id - détail d'une séance, @Param ('id') lit le segment url
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id); //404 automatique si introuvable
  }
  // PATCH /api/v1/workouts/:id — mise à jour partielle
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWorkoutDto) {
    return this.service.update(id, dto);
  }
  // DELETE /api/v1/workouts/:id — supprime une séance
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
  // POST /api/v1/workouts/:id/finish — marque comme terminée (finishedAt = maintenant)
  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  finish(@Param('id') id: string) {
    return this.service.finish(id);
  }
}
