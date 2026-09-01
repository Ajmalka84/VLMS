import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const rawOrigin = process.env.FRONTEND_ORIGIN;
  const origins =
    process.env.NODE_ENV === 'production' && rawOrigin
      ? rawOrigin.includes(',')
        ? rawOrigin.split(',').map((o) => o.trim())
        : rawOrigin === '*'
        ? true
        : rawOrigin
      : true; // Allow all origins in dev/local network mode so mobile phones on LAN can test

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

