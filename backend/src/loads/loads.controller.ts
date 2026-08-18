import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LoadsService } from './loads.service';
import { CreateLoadDto } from './dto/create-load.dto';
import { UpdateLoadDto } from './dto/update-load.dto';
import { QueryLoadsDto } from './dto/query-loads.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@Controller('loads')
@UseGuards(JwtAuthGuard)
export class LoadsController {
  constructor(private readonly loadsService: LoadsService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateLoadDto,
  ) {
    return this.loadsService.create(user.id, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryLoadsDto,
  ) {
    return this.loadsService.findAll(user.id, query);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.loadsService.findOne(user.id, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateLoadDto,
  ) {
    return this.loadsService.update(user.id, id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.loadsService.remove(user.id, id);
  }
}
