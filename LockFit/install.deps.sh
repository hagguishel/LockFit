#!/bin/bash
set -euo pipefail

log() { echo -e "➡️  $1"; }
ok()  { echo -e "✅ $1"; }
warn(){ echo -e "⚠️  $1"; }
err() { echo -e "❌ $1"; }

ROOT="$(pwd)"
API_DIR="$ROOT/lockfit-api"

# --- Prérequis ---
command -v node >/dev/null 2>&1 || { err "NodeJS manquant"; exit 1; }
command -v npm  >/dev/null 2>&1 || { err "npm manquant"; exit 1; }

# --- Dossier API ---
[ -d "$API_DIR" ] || { err "Dossier lockfit-api introuvable"; exit 1; }

cd "$API_DIR"

log "Installation des dépendances API (Nest, Prisma, validation)…"
npm install @nestjs/common @nestjs/core @nestjs/platform-express rxjs reflect-metadata \
            class-validator class-transformer @prisma/client >/dev/null

log "Installation des dev-deps (TypeScript, ts-node, types)…"
npm install -D typescript ts-node @types/node prisma >/dev/null

# --- package.json : scripts + main ---
log "Vérification des scripts NPM et du main…"
node - <<'NODE'
const fs = require('fs');
const path = 'package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
pkg.main = 'dist/principal.js';
pkg.scripts = Object.assign({}, pkg.scripts, {
  build: 'tsc -p tsconfig.json',
  start: 'node dist/principal.js',
  'start:dev': 'ts-node src/principal.ts',
});
fs.writeFileSync(path, JSON.stringify(pkg, null, 2));
console.log('package.json mis à jour (main + scripts).');
NODE

# --- tsconfig.json ---
log "Mise en place tsconfig.json…"
if [ -d tsconfig.json ]; then
  warn "Un dossier 'tsconfig.json/' existe → suppression"
  rm -rf tsconfig.json
fi
if [ ! -f tsconfig.json ]; then
cat > tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "target": "ES2019",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "outDir": "dist",
    "sourceMap": true,
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
JSON
  ok "tsconfig.json créé"
else
  ok "tsconfig.json déjà présent (non modifié)"
fi

# --- principal.ts ---
log "Vérification src/principal.ts…"
mkdir -p src
if [ -f src/principal.ts ]; then
  ok "src/principal.ts déjà présent (non modifié)"
else
cat > src/principal.ts <<'TS'
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './application.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1');
  await app.listen(3000);
  console.log('🚀 LockFit API up on http://localhost:3000/api/v1');
}
bootstrap().catch((err) => {
  console.error('❌ Bootstrap error:', err);
  process.exit(1);
});
TS
  ok "src/principal.ts créé"
fi

# --- Prisma module/service ---
log "Vérification PrismaModule/Service…"
mkdir -p src/prisma
if [ ! -f src/prisma/prisma.module.ts ]; then
cat > src/prisma/prisma.module.ts <<'TS'
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
TS
  ok "src/prisma/prisma.module.ts créé"
else
  ok "src/prisma/prisma.module.ts déjà présent"
fi

if [ ! -f src/prisma/prisma.service.ts ]; then
cat > src/prisma/prisma.service.ts <<'TS'
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
TS
  ok "src/prisma/prisma.service.ts créé"
else
  ok "src/prisma/prisma.service.ts déjà présent"
fi

# --- Health controller (/health) ---
log "Vérification HealthController…"
mkdir -p src/commun
if [ ! -f src/commun/health.controller.ts ]; then
cat > src/commun/health.controller.ts <<'TS'
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  ok() {
    return { ok: true, service: 'lockfit-api' };
  }
}
TS
  ok "src/commun/health.controller.ts créé"
else
  ok "src/commun/health.controller.ts déjà présent"
fi

# --- AppModule minimal (si vide) ---
log "Vérification AppModule…"
if [ ! -f src/application.module.ts ]; then
cat > src/application.module.ts <<'TS'
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './commun/health.controller';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class AppModule {}
TS
  ok "src/application.module.ts créé (minimal)"
else
  # ne pas écraser si existant : créer un exemple
  if ! grep -q 'PrismaModule' src/application.module.ts; then
    cat > src/application.module.ts.example <<'TS'
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './commun/health.controller';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class AppModule {}
TS
    warn "application.module.ts présent. Exemple généré: src/application.module.ts.example (à fusionner)"
  else
    ok "application.module.ts déjà configuré (PrismaModule détecté)"
  fi
fi

# --- DTO Workouts ---
log "Vérification DTO Workouts…"
mkdir -p src/workouts/dto

[ -f src/workouts/dto/create-workout.dto.ts ] || cat > src/workouts/dto/create-workout.dto.ts <<'TS'
import { Type } from 'class-transformer';
import {
  IsArray,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class SetDto {
  @IsOptional() @IsNumber() @Min(0) reps?: number;
  @IsOptional() @IsNumber() @Min(0) weight?: number;
  @IsOptional() @IsNumber() @Min(0) durationSec?: number;
  @IsOptional() @IsNumber() @Min(0) restSec?: number;
  @IsOptional() @IsNumber() @Min(0) rpe?: number;
}

class ItemDto {
  @IsString() exerciseId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => SetDto)
  sets!: SetDto[];
}

export class CreateWorkoutDto {
  @IsOptional() @IsString() @MaxLength(80)
  title?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;

  @IsArray() @ValidateNested({ each: true }) @Type(() => ItemDto)
  items!: ItemDto[];

  @IsOptional() @IsISO8601()
  plannedAt?: string;
}
TS

[ -f src/workouts/dto/update-workout.dto.ts ] || cat > src/workouts/dto/update-workout.dto.ts <<'TS'
import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkoutDto } from './create-workout.dto';

export class UpdateWorkoutDto extends PartialType(CreateWorkoutDto) {}
TS

[ -f src/workouts/dto/range-query.dto.ts ] || cat > src/workouts/dto/range-query.dto.ts <<'TS'
import { IsISO8601, IsOptional } from 'class-validator';

export class RangeQueryDto {
  @IsOptional() @IsISO8601()
  from?: string;

  @IsOptional() @IsISO8601()
  to?: string;
}
TS

ok "DTO workouts prêts (créés si absents)"

cd "$ROOT"
ok "Installation/initialisation terminée ✅"
echo "ℹ️  Démarrer l'API :"
echo "    cd lockfit-api && npm run start:dev"
