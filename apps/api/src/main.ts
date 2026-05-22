import 'reflect-metadata';
import multipart from '@fastify/multipart';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { apiEnv } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.enableCors({
    origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'x-athletiq-user-id', 'x-athletiq-user-role'],
  });
  await app.register(multipart);

  app.setGlobalPrefix('api');
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ATHLETIQ API')
    .setDescription(
      'Verified athlete identity, tournament operations, and sports infrastructure APIs.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(apiEnv.API_PORT, '0.0.0.0');
}

void bootstrap();
