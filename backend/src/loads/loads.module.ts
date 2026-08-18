import { Module } from '@nestjs/common';
import { LoadsService } from './loads.service';
import { LoadsController } from './loads.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LoadsController],
  providers: [LoadsService],
  exports: [LoadsService],
})
export class LoadsModule {}
