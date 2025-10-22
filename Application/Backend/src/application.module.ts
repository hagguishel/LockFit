// Fichier du coeur de l'application, montre quels modules sont branchés, et quels sécurités s'appliquent partout

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { WorkoutsModule } from './workouts/workouts.module';
import { PlanningsModule } from './plannings/plannings.module';
import { ExercisesModule } from './exercise/exercises.module';
import { HealthController } from './commun/health.controller';
import { AuthModule } from './authentification/authentification.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    AuthModule,
    PrismaModule,
    WorkoutsModule,
    PlanningsModule,
    ExercisesModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // pas besoin de remettre PrismaService ici si PrismaModule l’exporte
  ],
})
export class AppModule {}
