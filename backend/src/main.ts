import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
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

