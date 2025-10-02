//Fichier qui regroupe tout ce qui concerne les entrainements

import { Module } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { WorkoutsController } from './workouts.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [WorkoutsService],
  controllers: [WorkoutsController]
})
export class WorkoutsModule {}
