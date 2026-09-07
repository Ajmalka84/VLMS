import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Diesel',
  'Labour & Wages',
  'Explosives & Blasting',
  'Vehicle / Machinery Maintenance',
  'Electricity & Power',
  'Food & Refreshments',
  'General Site Expenses',
];

@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(ownerId: string) {
    let categories = await this.prisma.expenseCategory.findMany({
      where: { userId: ownerId },
      orderBy: { name: 'asc' },
    });

    if (categories.length === 0) {
      await this.seedDefaultCategories(ownerId);
      categories = await this.prisma.expenseCategory.findMany({
        where: { userId: ownerId },
        orderBy: { name: 'asc' },
      });
    }

    return categories;
  }

  async seedDefaultCategories(ownerId: string) {
    const existing = await this.prisma.expenseCategory.findMany({
      where: { userId: ownerId },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));

    const toCreate = DEFAULT_EXPENSE_CATEGORIES.filter(
      (name) => !existingNames.has(name.toLowerCase()),
    );

    if (toCreate.length > 0) {
      await this.prisma.expenseCategory.createMany({
        data: toCreate.map((name) => ({
          userId: ownerId,
          name,
          isDefault: true,
        })),
        skipDuplicates: true,
      });
    }
  }

  async createCategory(ownerId: string, dto: CreateExpenseCategoryDto) {
    const trimmedName = dto.name.trim();

    const existing = await this.prisma.expenseCategory.findFirst({
      where: {
        userId: ownerId,
        name: { equals: trimmedName, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(`Expense category "${trimmedName}" already exists`);
    }

    return this.prisma.expenseCategory.create({
      data: {
        userId: ownerId,
        name: trimmedName,
        isDefault: false,
      },
    });
  }

  async updateCategory(ownerId: string, id: string, dto: UpdateExpenseCategoryDto) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, userId: ownerId },
    });

    if (!category) {
      throw new NotFoundException(`Expense category with ID "${id}" not found`);
    }

    const trimmedName = dto.name.trim();
    const existing = await this.prisma.expenseCategory.findFirst({
      where: {
        userId: ownerId,
        name: { equals: trimmedName, mode: 'insensitive' },
        id: { not: id },
      },
    });

    if (existing) {
      throw new ConflictException(`Expense category "${trimmedName}" already exists`);
    }

    return this.prisma.expenseCategory.update({
      where: { id },
      data: { name: trimmedName },
    });
  }

  async deleteCategory(ownerId: string, id: string) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, userId: ownerId },
    });

    if (!category) {
      throw new NotFoundException(`Expense category with ID "${id}" not found`);
    }

    const linkedExpensesCount = await this.prisma.expense.count({
      where: { categoryId: id, deletedAt: null },
    });

    if (linkedExpensesCount > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" because ${linkedExpensesCount} active expense record(s) are linked to it.`,
      );
    }

    await this.prisma.expenseCategory.delete({
      where: { id },
    });

    return {
      id,
      message: `Expense category "${category.name}" deleted successfully`,
    };
  }
}
