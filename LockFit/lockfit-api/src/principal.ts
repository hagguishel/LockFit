//Fichier qui éxecuté en premier qui démarre le serveur, active Helmet, CORS, validation et met le préfixe d'URL /api/v1

import 'reflect-metadata'
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet'; //Sécurité HTTP, helmet active une série de protections automatiques
import { AppModule } from './application.module';

async function bootstrap() { //Fonction asynchrone de démarrage
	const app = await NestFactory.create(AppModule); // Création de l'instance Nest a partir du fichier application.module

	app.use(helmet());

	app.enableCors({
		origin: [
			'http://localhost:19006', // URL de l'expo web (navigateur pour tester les api)
			'http://localhost:3000', // URL du client web qui appelle l'API de l'application (seulement avec le front)
		],
		credentials: true,
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', //méthodes autorisées
		allowedHeaders: 'Content-Type, Authorization, X-User-Id',
	});

	app.useGlobalPipes(new ValidationPipe({
		whitelist: true,
		transform: true,
		forbidNonWhitelisted: true,
	 }));
	app.setGlobalPrefix('api/v1'); // Toutes les routes commencent par /api/v1

	await app.listen(3000);
	console.log('🚀 LockFit API up on http://localhost:3000/api/v1');
}
bootstrap().catch((err) => {
	console.error('❌ Bootstrap error:', err);
	process.exit(1);
});
