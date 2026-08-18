import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [CommonModule, PrismaModule, HealthModule],
  controllers: [AppController],
})
export class AppModule {}

