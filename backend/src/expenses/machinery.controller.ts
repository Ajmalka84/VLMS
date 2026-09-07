import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { MachineryService } from './machinery.service';
import { CreateMachineryDto } from './dto/create-machinery.dto';
import { UpdateMachineryDto } from './dto/update-machinery.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('machinery')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MachineryController {
  constructor(private readonly machineryService: MachineryService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'OWNER', 'CO_PARTNER', 'SITE_BOY')
  async listMachinery(
    @Request() req: any,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.machineryService.listMachinery(ownerId, includeInactive === 'true');
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'OWNER', 'CO_PARTNER', 'SITE_BOY')
  async getMachineryById(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.machineryService.getMachineryById(ownerId, id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'OWNER')
  async createMachinery(
    @Request() req: any,
    @Body() dto: CreateMachineryDto,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.machineryService.createMachinery(ownerId, dto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'OWNER')
  async updateMachinery(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateMachineryDto,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.machineryService.updateMachinery(ownerId, id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'OWNER')
  async deleteMachinery(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.machineryService.deleteMachinery(ownerId, id);
  }
}
