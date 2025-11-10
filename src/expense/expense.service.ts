import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from '../prisma/prisma-error.utils';

@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  // Expense-specific error configuration
  private readonly expenseErrorOptions = {
    entity: 'expense',
    foreignKeyMap: {
      branchId: 'Branch does not exist',
      createdById: 'User does not exist',
    },
    customMessages: {
      P2003: 'Referenced branch or user does not exist',
    },
  };

  // Create a new expense
  async create(data: {
    branchId: number;
    category: string;
    amount: number;
    description?: string;
    expenseDate: Date;
    createdById: number;
    paymentMethod?: string;
    referenceNo?: string;
  }) {
    try {
      return await this.prisma.expense.create({
        data: {
          branchId: data.branchId,
          category: data.category,
          amount: data.amount,
          description: data.description,
          expenseDate: data.expenseDate,
          createdById: data.createdById,
          paymentMethod: data.paymentMethod as any,
          referenceNo: data.referenceNo,
        },
        include: {
          branch: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.expenseErrorOptions,
        'Failed to create expense',
      );
    }
  }

  // Get all expenses with filters
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ExpenseWhereInput;
    orderBy?: Prisma.ExpenseOrderByWithRelationInput;
  }) {
    try {
      const { skip, take, where, orderBy } = params;
      return await this.prisma.expense.findMany({
        skip,
        take,
        where,
        orderBy: orderBy || { expenseDate: 'desc' },
        include: {
          branch: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.expenseErrorOptions,
        'Failed to fetch expenses',
      );
    }
  }

  // Get a single expense by ID
  async findOne(id: number) {
    try {
      const expense = await this.prisma.expense.findUnique({
        where: { id },
        include: {
          branch: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!expense) {
        throw new NotFoundException(`Expense with ID ${id} not found`);
      }

      return expense;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.expenseErrorOptions,
        `Failed to fetch expense with ID ${id}`,
      );
    }
  }

  // Get expenses by branch
  async findByBranch(
    branchId: number,
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.ExpenseWhereInput;
    },
  ) {
    try {
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
      });

      if (!branch) {
        throw new NotFoundException(`Branch with ID ${branchId} not found`);
      }

      const where: Prisma.ExpenseWhereInput = {
        branchId,
        ...params?.where,
      };

      return await this.prisma.expense.findMany({
        skip: params?.skip,
        take: params?.take,
        where,
        include: {
          branch: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { expenseDate: 'desc' },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.expenseErrorOptions,
        'Failed to fetch branch expenses',
      );
    }
  }

  // Get expenses by category
  async findByCategory(category: string, branchId?: number) {
    try {
      const where: Prisma.ExpenseWhereInput = {
        category: {
          contains: category,
          mode: 'insensitive',
        },
        ...(branchId && { branchId }),
      };

      return await this.prisma.expense.findMany({
        where,
        include: {
          branch: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { expenseDate: 'desc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.expenseErrorOptions,
        'Failed to fetch expenses by category',
      );
    }
  }

  // Update expense details
  async update(
    id: number,
    data: {
      category?: string;
      amount?: number;
      description?: string;
      expenseDate?: Date;
      paymentMethod?: string;
      referenceNo?: string;
    },
  ) {
    try {
      const expense = await this.prisma.expense.findUnique({
        where: { id },
      });

      if (!expense) {
        throw new NotFoundException(`Expense with ID ${id} not found`);
      }

      //   return await this.prisma.expense.update({
      //     where: { id },
      //     data,
      //     include: {
      //       branch: true,
      //       createdBy: {
      //         select: {
      //           id: true,
      //           name: true,
      //           email: true,
      //         },
      //       },
      //     },
      //   });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.expenseErrorOptions,
        `Failed to update expense with ID ${id}`,
      );
    }
  }

  // Delete expense
  async remove(id: number) {
    try {
      const expense = await this.prisma.expense.findUnique({
        where: { id },
      });

      if (!expense) {
        throw new NotFoundException(`Expense with ID ${id} not found`);
      }

      return await this.prisma.expense.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.expenseErrorOptions,
        `Failed to delete expense with ID ${id}`,
      );
    }
  }

  // Get expense statistics
  async getStats(branchId?: number, startDate?: Date, endDate?: Date) {
    try {
      const where: Prisma.ExpenseWhereInput = {
        ...(branchId && { branchId }),
        ...(startDate &&
          endDate && {
            expenseDate: {
              gte: startDate,
              lte: endDate,
            },
          }),
      };

      const expenses = await this.prisma.expense.findMany({
        where,
        include: {
          branch: true,
        },
      });

      const totalExpenses = expenses.length;
      const totalAmount = expenses.reduce(
        (sum, expense) => sum + Number(expense.amount),
        0,
      );
      const averageExpense =
        totalExpenses > 0 ? totalAmount / totalExpenses : 0;

      // Group by category
      const categoryStats = expenses.reduce((acc, expense) => {
        acc[expense.category] =
          (acc[expense.category] || 0) + Number(expense.amount);
        return acc;
      }, {});

      // Group by payment method
      const paymentMethodStats = expenses.reduce((acc, expense) => {
        const method = expense.paymentMethod || 'UNKNOWN';
        acc[method] = (acc[method] || 0) + Number(expense.amount);
        return acc;
      }, {});

      // Monthly expenses for chart
      const monthlyExpenses = await this.prisma.expense.groupBy({
        by: ['expenseDate'],
        where: {
          ...where,
          expenseDate: {
            gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days if no date
            lte: endDate || new Date(),
          },
        },
        _sum: {
          amount: true,
        },
        orderBy: {
          expenseDate: 'asc',
        },
      });

      return {
        totalExpenses,
        totalAmount,
        averageExpense,
        categoryStats,
        paymentMethodStats,
        monthlyExpenses: monthlyExpenses.map((month) => ({
          date: month.expenseDate,
          amount: month._sum.amount,
        })),
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.expenseErrorOptions,
        'Failed to fetch expense statistics',
      );
    }
  }

  // Get expense categories
  async getCategories(branchId?: number) {
    try {
      const where: Prisma.ExpenseWhereInput = branchId ? { branchId } : {};

      const categories = await this.prisma.expense.groupBy({
        by: ['category'],
        where,
        _count: {
          id: true,
        },
        _sum: {
          amount: true,
        },
        orderBy: {
          _sum: {
            amount: 'desc',
          },
        },
      });

      return categories.map((cat) => ({
        category: cat.category,
        count: cat._count.id,
        totalAmount: cat._sum.amount,
      }));
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.expenseErrorOptions,
        'Failed to fetch expense categories',
      );
    }
  }

  // Get recent expenses
  async findRecent(limit: number = 10, branchId?: number) {
    try {
      const where: Prisma.ExpenseWhereInput = branchId ? { branchId } : {};

      return await this.prisma.expense.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.expenseErrorOptions,
        'Failed to fetch recent expenses',
      );
    }
  }

  // Search expenses
  async search(
    query: string,
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.ExpenseWhereInput;
    },
  ) {
    try {
      const where: Prisma.ExpenseWhereInput = {
        ...params?.where,
        OR: [
          { category: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { referenceNo: { contains: query, mode: 'insensitive' } },
        ],
      };

      return await this.prisma.expense.findMany({
        skip: params?.skip,
        take: params?.take,
        where,
        include: {
          branch: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { expenseDate: 'desc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.expenseErrorOptions,
        'Failed to search expenses',
      );
    }
  }

  // Bulk create expenses (for imports)
  async bulkCreate(
    expenses: Array<{
      branchId: number;
      category: string;
      amount: number;
      description?: string;
      expenseDate: Date;
      createdById: number;
      paymentMethod?: string;
      referenceNo?: string;
    }>,
  ) {
    try {
      //   return await this.prisma.$transaction(
      //     expenses.map(expense =>
      //       this.prisma.expense.create({
      //         data: expense,
      //         include: {
      //           branch: true,
      //           createdBy: {
      //             select: {
      //               id: true,
      //               name: true,
      //               email: true,
      //             },
      //           },
      //         },
      //       })
      //     )
      //   );
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.expenseErrorOptions,
        'Failed to bulk create expenses',
      );
    }
  }

  // Get expense summary by period (daily, weekly, monthly)
  async getSummaryByPeriod(
    branchId?: number,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    startDate?: Date,
    endDate?: Date,
  ) {
    try {
      const where: Prisma.ExpenseWhereInput = {
        ...(branchId && { branchId }),
        ...(startDate &&
          endDate && {
            expenseDate: {
              gte: startDate,
              lte: endDate,
            },
          }),
      };

      const expenses = await this.prisma.expense.findMany({
        where,
        orderBy: { expenseDate: 'asc' },
      });

      const summary = new Map();

      expenses.forEach((expense) => {
        let key: string;
        const date = new Date(expense.expenseDate);

        switch (period) {
          case 'daily':
            key = date.toISOString().split('T')[0]; // YYYY-MM-DD
            break;
          case 'weekly':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
            key = weekStart.toISOString().split('T')[0];
            break;
          case 'monthly':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
            break;
        }

        if (!summary.has(key)) {
          summary.set(key, {
            period: key,
            totalAmount: 0,
            count: 0,
            categories: {},
          });
        }

        const periodData = summary.get(key);
        periodData.totalAmount += Number(expense.amount);
        periodData.count += 1;

        // Track categories
        if (!periodData.categories[expense.category]) {
          periodData.categories[expense.category] = 0;
        }
        periodData.categories[expense.category] += Number(expense.amount);
      });

      return Array.from(summary.values());
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.expenseErrorOptions,
        'Failed to fetch expense summary by period',
      );
    }
  }
}
