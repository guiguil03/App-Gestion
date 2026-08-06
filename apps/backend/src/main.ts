import '@/instrument';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from '@/app.module';
import { corsOptions } from '@/common/config/cors.config';

function setupSwagger(app: NestExpressApplication): void {
  const config = new DocumentBuilder()
    .setTitle('PrésenceConnect API')
    .setDescription('API backend du suivi de présence scolaire')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(
    helmet({
      // API JSON + Swagger UI servis depuis cette même app : pas de rendu
      // HTML de contenu tiers à restreindre par CSP.
      contentSecurityPolicy: false,
      // Le dashboard et le mobile appellent cette API depuis d'autres
      // origines ; le CORP par défaut ('same-origin') bloquerait ces appels
      // indépendamment de la configuration CORS ci-dessous.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors(corsOptions());
  setupSwagger(app);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
