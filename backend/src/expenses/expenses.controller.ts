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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'OWNER', 'CO_PARTNER', 'SITE_BOY')
  async createExpense(
    @Request() req: any,
    @Body() dto: CreateExpenseDto,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    return this.expensesService.createExpense(ownerId, userId, userRole, dto);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'OWNER', 'CO_PARTNER', 'SITE_BOY')
  async listExpenses(
    @Request() req: any,
    @Query() query: QueryExpensesDto,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.expensesService.listExpenses(ownerId, query);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'OWNER', 'CO_PARTNER', 'SITE_BOY')
  async getExpenseById(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.expensesService.getExpenseById(ownerId, id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'OWNER', 'CO_PARTNER', 'SITE_BOY')
  async updateExpense(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    return this.expensesService.updateExpense(ownerId, userId, userRole, id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'OWNER')
  async deleteExpense(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const ownerId = req.user.ownerId || req.user.id;
    return this.expensesService.deleteExpense(ownerId, id);
  }
}
