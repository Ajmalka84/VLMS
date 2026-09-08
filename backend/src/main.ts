import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security & Proxy configuration for load balancers
  const httpAdapter = app.getHttpAdapter();
  if (typeof httpAdapter.getInstance === 'function') {
    const expressApp = httpAdapter.getInstance();
    if (typeof expressApp.set === 'function') {
      expressApp.set('trust proxy', 1);
    }
  }

  // Request payload limits
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  const rawOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
  const origins = rawOrigin.includes(',')
    ? rawOrigin.split(',').map((o) => o.trim())
    : rawOrigin === '*'
    ? true
    : rawOrigin;

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  await app.listen(Number(process.env.PORT ?? 3000));
}

void bootstrap();


