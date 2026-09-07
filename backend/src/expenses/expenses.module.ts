import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExpenseCategoriesService } from './expense-categories.service';
import { ExpenseCategoriesController } from './expense-categories.controller';
import { MachineryService } from './machinery.service';
import { MachineryController } from './machinery.controller';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    ExpenseCategoriesController,
    MachineryController,
    ExpensesController,
  ],
  providers: [
    ExpenseCategoriesService,
    MachineryService,
    ExpensesService,
  ],
  exports: [
    ExpenseCategoriesService,
    MachineryService,
    ExpensesService,
  ],
})
export class ExpensesModule {}
