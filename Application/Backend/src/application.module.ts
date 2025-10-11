//Fichier du coeur de l'application, montre quels modules sont branchés, et quels sécurités s'appliquent partout

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // charge un fichier .env
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'; // Le Throttler fait de l'anti-spam, limite le nombre de requêtes autorisées

import { WorkoutsModule } from './workouts/workouts.module';
import { PrismaModule } from './prisma/prisma.module'; // Module qui fournit PrismaService, un seul client partagé
import { HealthController } from './commun/health.controller'; // Utilisé pour tester l'API
import { APP_GUARD } from '@nestjs/core';
import { PlanningsModule } from './plannings/plannings.module';
import { AuthModule } from './authentification/authentification.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), //Charge le fichier .env, et le rend global pour l'utiliser partout
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]), //limite le nombre de requêtes a 60
    PrismaModule, // expose Prisma pour que l'app puisse l'utiliser partout
    WorkoutsModule, PlanningsModule, // Ajoute les routes dans l'app
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // On utilise Throttle pour que tout passe par lui et rejete si il y'a trop de requêtes
  ],
})

export class AppModule {}
