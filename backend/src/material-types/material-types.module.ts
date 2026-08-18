import { Module } from '@nestjs/common';
import { MaterialTypesService } from './material-types.service';
import { MaterialTypesController } from './material-types.controller';
import { AdminMaterialTypesController } from './admin-material-types.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MaterialTypesController, AdminMaterialTypesController],
  providers: [MaterialTypesService],
  exports: [MaterialTypesService],
})
export class MaterialTypesModule {}
