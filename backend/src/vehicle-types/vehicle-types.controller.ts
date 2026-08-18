import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { VehicleTypesService } from './vehicle-types.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('vehicle-types')
@UseGuards(JwtAuthGuard)
export class VehicleTypesController {
  constructor(private readonly vehicleTypesService: VehicleTypesService) {}

  @Get()
  async findAll() {
    return this.vehicleTypesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.vehicleTypesService.findOne(id);
  }
}
