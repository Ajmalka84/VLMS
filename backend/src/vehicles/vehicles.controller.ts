import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(user.ownerId, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: AuthUser) {
    return this.vehiclesService.findAll(user.ownerId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.vehiclesService.findOne(user.ownerId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(user.ownerId, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'SUPER_ADMIN')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.vehiclesService.remove(user.ownerId, id);
  }
}
