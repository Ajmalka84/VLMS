import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { ContractorsModule } from './contractors/contractors.module';
import { HealthModule } from './health/health.module';
import { LoadsModule } from './loads/loads.module';
import { MaterialTypesModule } from './material-types/material-types.module';
import { PrismaModule } from './prisma/prisma.module';
import { RatesModule } from './rates/rates.module';
import { ReportsModule } from './reports/reports.module';
import { SitesModule } from './sites/sites.module';
import { VehicleTypesModule } from './vehicle-types/vehicle-types.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    CommonModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    AdminModule,
    VehicleTypesModule,
    MaterialTypesModule,
    SitesModule,
    VehiclesModule,
    ContractorsModule,
    RatesModule,
    LoadsModule,
    ReportsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
