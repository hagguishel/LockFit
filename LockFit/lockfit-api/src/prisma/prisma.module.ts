import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // dispo partout sans ré-importer
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
