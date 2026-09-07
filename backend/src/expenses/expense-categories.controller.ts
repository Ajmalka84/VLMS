import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ExpenseCategoriesService } from './expense-categories.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('expense-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpenseCategoriesController {
  constructor(private readonly expenseCategoriesService: ExpenseCategoriesService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'OWNER', 'CO_PARTNER', 'SITE_BOY')
  async listCategories(@Request() req: any) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.expenseCategoriesService.listCategories(ownerId);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'OWNER')
  async createCategory(
    @Request() req: any,
    @Body() dto: CreateExpenseCategoryDto,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.expenseCategoriesService.createCategory(ownerId, dto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'OWNER')
  async updateCategory(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseCategoryDto,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.expenseCategoriesService.updateCategory(ownerId, id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'OWNER')
  async deleteCategory(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.expenseCategoriesService.deleteCategory(ownerId, id);
  }
}
