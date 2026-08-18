import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { MaterialTypesService } from './material-types.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('material-types')
@UseGuards(JwtAuthGuard)
export class MaterialTypesController {
  constructor(private readonly materialTypesService: MaterialTypesService) {}

  @Get()
  async findAll() {
    return this.materialTypesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.materialTypesService.findOne(id);
  }
}
