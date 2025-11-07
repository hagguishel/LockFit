// src/workouts/workouts.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { WorkoutsService } from './workouts.service';
import { UpdateWorkoutDto } from './dto/update-workout.dto';
import { UpdatesetDto } from './dto/update-set.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller(['workouts', 'entrainements'])
@UseGuards(AuthGuard('jwt')) // 🔐 tout ce contrôleur nécessite d’être connecté
export class WorkoutsController {
  constructor(private readonly service: WorkoutsService) {}

  @Post()
  create(@Body() dto: CreateWorkoutDto, @Req() req: Request) {
    const userId = (req.user as any).sub || (req.user as any).id;
    return this.service.create(dto, userId);
  }

  @Get()
  findAll(
    @Req() req: Request,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('finished') finished?: string,
  ) {
    const userId = (req.user as any).sub || (req.user as any).id;
    const f =
      finished === undefined ? undefined : finished.toLowerCase() === 'true';

    return this.service.findAll(userId, { from, to, finished: f });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).sub || (req.user as any).id;
    return this.service.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkoutDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).sub || (req.user as any).id;
    return this.service.update(id, dto, userId);
  }

  @Patch(':id/sets/:setId/complete')
  @HttpCode(HttpStatus.OK)
  completeSet(
    @Param('id') workoutId: string,
    @Param('setId') setId: string,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).sub || (req.user as any).id;
    return this.service.completeSet(workoutId, setId, userId);
  }

  @Patch(':id/sets/:setId')
  updateSet(
    @Param('id') workoutId: string,
    @Param('setId') setId: string,
    @Body() dto: UpdatesetDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).sub || (req.user as any).id;
    return this.service.updateSet(workoutId, setId, dto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).sub || (req.user as any).id;
    return this.service.remove(id, userId);
  }

  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  finish(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).sub || (req.user as any).id;
    return this.service.finish(id, userId);
  }
}
