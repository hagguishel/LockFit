import { Module } from '@nestjs/common';
import { PlanningsService } from './plannings.service';
import { PlanningsController } from './plannings.controller';
import { PrismaModule } from '../prisma/prisma.module';
/**
 * Module = regroupe controller + service + dépendances (ici PrismaModule)
 */
@Module({
  providers: [PlanningsService],
  controllers: [PlanningsController],
  imports: [PrismaModule],
})
export class PlanningsModule {}
