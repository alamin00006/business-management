import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from '../prisma/prisma-error.utils';

@Injectable()
export class LoyaltyTransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  // Loyalty transaction-specific error configuration
  private readonly loyaltyTransactionErrorOptions = {
    entity: 'loyalty transaction',
    foreignKeyMap: {
      customerId: 'Customer does not exist',
    },
    customMessages: {
      P2003: 'Referenced customer does not exist',
    },
  };

  // Create a loyalty transaction
  async create(data: {
    customerId: number;
    type: string;
    points: number;
    balanceAfter: number;
    reason: string;
    referenceType?: string;
    referenceId?: number;
  }) {
    try {
      return await this.prisma.loyaltyTransaction.create({
        data: {
          customerId: data.customerId,
          type: data.type as any,
          points: data.points,
          balanceAfter: data.balanceAfter,
          reason: data.reason,
          referenceType: data.referenceType as any,
          referenceId: data.referenceId,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              customerCode: true,
            },
          },
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.loyaltyTransactionErrorOptions,
        'Failed to create loyalty transaction',
      );
    }
  }

  // Get all loyalty transactions with filters
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.LoyaltyTransactionWhereInput;
    orderBy?: Prisma.LoyaltyTransactionOrderByWithRelationInput;
  }) {
    try {
      const { skip, take, where, orderBy } = params;
      return await this.prisma.loyaltyTransaction.findMany({
        skip,
        take,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              customerCode: true,
            },
          },
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.loyaltyTransactionErrorOptions,
        'Failed to fetch loyalty transactions',
      );
    }
  }

  // Get a single loyalty transaction by ID
  async findOne(id: number) {
    try {
      const transaction = await this.prisma.loyaltyTransaction.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              customerCode: true,
              phone: true,
            },
          },
        },
      });

      if (!transaction) {
        throw new NotFoundException(
          `Loyalty transaction with ID ${id} not found`,
        );
      }

      return transaction;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.loyaltyTransactionErrorOptions,
        `Failed to fetch loyalty transaction with ID ${id}`,
      );
    }
  }

  // Get transactions by customer ID
  async findByCustomer(
    customerId: number,
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.LoyaltyTransactionWhereInput;
    },
  ) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      const where: Prisma.LoyaltyTransactionWhereInput = {
        customerId,
        ...params?.where,
      };

      return await this.prisma.loyaltyTransaction.findMany({
        skip: params?.skip,
        take: params?.take,
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              customerCode: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.loyaltyTransactionErrorOptions,
        'Failed to fetch customer loyalty transactions',
      );
    }
  }

  // Get transactions by type
  async findByType(
    type: string,
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.LoyaltyTransactionWhereInput;
    },
  ) {
    try {
      const where: Prisma.LoyaltyTransactionWhereInput = {
        type: type as any,
        ...params?.where,
      };

      return await this.prisma.loyaltyTransaction.findMany({
        skip: params?.skip,
        take: params?.take,
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              customerCode: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.loyaltyTransactionErrorOptions,
        'Failed to fetch loyalty transactions by type',
      );
    }
  }

  // Get transactions by reference
  async findByReference(referenceType: string, referenceId: number) {
    try {
      return await this.prisma.loyaltyTransaction.findMany({
        where: {
          referenceType: referenceType as any,
          referenceId,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              customerCode: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.loyaltyTransactionErrorOptions,
        'Failed to fetch reference loyalty transactions',
      );
    }
  }

  // Get customer transaction summary
  async getCustomerSummary(
    customerId: number,
    startDate?: Date,
    endDate?: Date,
  ) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      const where: Prisma.LoyaltyTransactionWhereInput = {
        customerId,
        ...(startDate &&
          endDate && {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
      };

      const transactions = await this.prisma.loyaltyTransaction.findMany({
        where,
        orderBy: { createdAt: 'asc' },
      });

      const summary = {
        customerId,
        totalTransactions: transactions.length,
        totalPointsEarned: 0,
        totalPointsRedeemed: 0,
        netPoints: 0,
        byType: {} as Record<string, { count: number; points: number }>,
        byMonth: {} as Record<string, { earned: number; redeemed: number }>,
      };

      transactions.forEach((transaction) => {
        // Calculate totals
        if (
          transaction.type === 'EARNED' ||
          transaction.type === 'ADJUSTMENT_ADD'
        ) {
          summary.totalPointsEarned += transaction.points;
          summary.netPoints += transaction.points;
        } else if (
          transaction.type === 'REDEEMED' ||
          transaction.type === 'ADJUSTMENT_REMOVE' ||
          transaction.type === 'RESET' ||
          transaction.type === 'EXPIRED'
        ) {
          summary.totalPointsRedeemed += transaction.points;
          summary.netPoints -= transaction.points;
        }

        // Group by type
        if (!summary.byType[transaction.type]) {
          summary.byType[transaction.type] = { count: 0, points: 0 };
        }
        summary.byType[transaction.type].count++;
        summary.byType[transaction.type].points += transaction.points;

        // Group by month
        const monthKey = transaction.createdAt.toISOString().substring(0, 7); // YYYY-MM
        if (!summary.byMonth[monthKey]) {
          summary.byMonth[monthKey] = { earned: 0, redeemed: 0 };
        }

        if (
          transaction.type === 'EARNED' ||
          transaction.type === 'ADJUSTMENT_ADD'
        ) {
          summary.byMonth[monthKey].earned += transaction.points;
        } else if (
          transaction.type === 'REDEEMED' ||
          transaction.type === 'ADJUSTMENT_REMOVE' ||
          transaction.type === 'RESET' ||
          transaction.type === 'EXPIRED'
        ) {
          summary.byMonth[monthKey].redeemed += transaction.points;
        }
      });

      return summary;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.loyaltyTransactionErrorOptions,
        'Failed to fetch customer transaction summary',
      );
    }
  }

  // Get loyalty program statistics
  async getProgramStats(startDate?: Date, endDate?: Date) {
    try {
      const where: Prisma.LoyaltyTransactionWhereInput =
        startDate && endDate
          ? {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            }
          : {};

      const transactions = await this.prisma.loyaltyTransaction.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const stats = {
        totalTransactions: transactions.length,
        uniqueCustomers: new Set(transactions.map((t) => t.customerId)).size,
        totalPointsEarned: 0,
        totalPointsRedeemed: 0,
        averagePointsPerTransaction: 0,
        topEarners: [] as Array<{
          customerId: number;
          customerName: string;
          totalEarned: number;
        }>,
        transactionTypes: {} as Record<string, number>,
      };

      const customerEarnings = new Map();

      transactions.forEach((transaction) => {
        // Calculate totals
        if (
          transaction.type === 'EARNED' ||
          transaction.type === 'ADJUSTMENT_ADD'
        ) {
          stats.totalPointsEarned += transaction.points;
        } else if (
          transaction.type === 'REDEEMED' ||
          transaction.type === 'ADJUSTMENT_REMOVE' ||
          transaction.type === 'RESET' ||
          transaction.type === 'EXPIRED'
        ) {
          stats.totalPointsRedeemed += transaction.points;
        }

        // Track transaction types
        stats.transactionTypes[transaction.type] =
          (stats.transactionTypes[transaction.type] || 0) + 1;

        // Track customer earnings for top earners
        if (transaction.type === 'EARNED') {
          if (!customerEarnings.has(transaction.customerId)) {
            customerEarnings.set(transaction.customerId, {
              customerId: transaction.customerId,
              customerName: transaction.customer.name,
              totalEarned: 0,
            });
          }
          const customer = customerEarnings.get(transaction.customerId);
          customer.totalEarned += transaction.points;
        }
      });

      // Get top 10 earners
      stats.topEarners = Array.from(customerEarnings.values())
        .sort((a, b) => b.totalEarned - a.totalEarned)
        .slice(0, 10);

      stats.averagePointsPerTransaction =
        stats.totalTransactions > 0
          ? (stats.totalPointsEarned + stats.totalPointsRedeemed) /
            stats.totalTransactions
          : 0;

      return stats;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.loyaltyTransactionErrorOptions,
        'Failed to fetch loyalty program statistics',
      );
    }
  }

  // Search loyalty transactions
  async search(
    query: string,
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.LoyaltyTransactionWhereInput;
    },
  ) {
    try {
      const where: Prisma.LoyaltyTransactionWhereInput = {
        ...params?.where,
        OR: [
          { reason: { contains: query, mode: 'insensitive' } },
          {
            customer: {
              name: { contains: query, mode: 'insensitive' },
            },
          },
          {
            customer: {
              email: { contains: query, mode: 'insensitive' },
            },
          },
          {
            customer: {
              customerCode: { contains: query, mode: 'insensitive' },
            },
          },
        ],
      };

      return await this.prisma.loyaltyTransaction.findMany({
        skip: params?.skip,
        take: params?.take,
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              customerCode: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.loyaltyTransactionErrorOptions,
        'Failed to search loyalty transactions',
      );
    }
  }

  // Get recent transactions
  async findRecent(limit: number = 10, customerId?: number) {
    try {
      const where: Prisma.LoyaltyTransactionWhereInput = customerId
        ? { customerId }
        : {};

      return await this.prisma.loyaltyTransaction.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              customerCode: true,
            },
          },
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.loyaltyTransactionErrorOptions,
        'Failed to fetch recent loyalty transactions',
      );
    }
  }

  // Delete loyalty transaction (admin only - use carefully)
  async remove(id: number) {
    try {
      const transaction = await this.prisma.loyaltyTransaction.findUnique({
        where: { id },
      });

      if (!transaction) {
        throw new NotFoundException(
          `Loyalty transaction with ID ${id} not found`,
        );
      }

      return await this.prisma.loyaltyTransaction.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.loyaltyTransactionErrorOptions,
        `Failed to delete loyalty transaction with ID ${id}`,
      );
    }
  }
}
