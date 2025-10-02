import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
/**
 * Module global = pas besoin de le réimporter partout
 * (sinon, au minimum exporte PrismaService)
 */
@Global() // dispo partout sans ré-importer
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
