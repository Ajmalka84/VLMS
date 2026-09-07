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
import { SitesService } from './sites.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('sites')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @Roles('OWNER', 'SUPER_ADMIN')
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSiteDto,
  ) {
    return this.sitesService.create(user, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: AuthUser) {
    return this.sitesService.findAll(user);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.sitesService.findOne(user, id);
  }

  @Patch(':id')
  @Roles('OWNER', 'SUPER_ADMIN')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSiteDto,
  ) {
    return this.sitesService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'SUPER_ADMIN')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.sitesService.remove(user, id);
  }
}
