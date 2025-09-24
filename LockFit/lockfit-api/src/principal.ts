import 'reflect-metadata'
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
