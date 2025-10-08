// Fichier lancé en premier : démarre le serveur, Helmet, CORS, validation, préfixe /api/v1

import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './application.module';

async function bootstrap() {
  // 1) Crée l’app Nest (CORS off ici, on va l’activer juste après avec une config claire)
  const app = await NestFactory.create(AppModule, { cors: false });

  // 2) Helmet (sécurité HTTP) — on désactive la politique d’images cross-origin en dev pour éviter des surprises
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // 3) CORS : en DEV on peut être permissif pour Expo Go (qui n’envoie pas toujours d’Origin)
  //    origin: true => reflète l’origine de la requête si présente
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 86400,
  });

  // 4) Validation globale : nettoie et transforme le payload, bloque les champs non attendus
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // 5) Toutes les routes commencent par /api/v1
  app.setGlobalPrefix('api/v1');

  // 6) Écoute sur 0.0.0.0 pour être accessible depuis le réseau local / téléphone
  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 LockFit API up on http://0.0.0.0:${port}/api/v1`);
}

bootstrap().catch((err) => {
  console.error('❌ Bootstrap error:', err);
  process.exit(1);
});
