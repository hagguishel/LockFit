import { Module } from '@nestjs/common';
import { WorkoutsModule } from './workouts/workouts.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './commun/health.controller';

@Module({
  imports: [WorkoutsModule, PrismaModule],
  controllers: [HealthController],
})
export class AppModule {}
