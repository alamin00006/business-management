import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from '../prisma/prisma-error.utils';
import { LoyaltyTransactionService } from 'src/loyaltyTransaction/loyalty-transaction.service';

@Injectable()
export class CustomerLoyaltyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
    private readonly loyaltyTransactionService: LoyaltyTransactionService, // Add this
  ) {}

  // Customer loyalty-specific error configuration
  private readonly customerLoyaltyErrorOptions = {
    entity: 'customer loyalty',
    foreignKeyMap: {
      customerId: 'Customer does not exist',
    },
    customMessages: {
      P2003: 'Referenced customer does not exist',
      P2002: 'Customer loyalty record already exists for this customer',
    },
  };

  // Initialize loyalty account for a customer
  async initialize(customerId: number) {
    try {
      // Check if customer exists
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      // Check if loyalty account already exists
      const existingLoyalty = await this.prisma.customerLoyalty.findUnique({
        where: { customerId },
      });

      if (existingLoyalty) {
        throw new BadRequestException(
          'Loyalty account already exists for this customer',
        );
      }

      return await this.prisma.customerLoyalty.create({
        data: {
          customerId: customerId,
          pointsBalance: 0,
          totalEarned: 0,
          totalRedeemed: 0,
        },
        include: {
          customer: {
            include: {
              _count: {
                select: {
                  sales: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.customerLoyaltyErrorOptions,
        'Failed to initialize customer loyalty',
      );
    }
  }

  // Get loyalty account by customer ID
  async findByCustomer(customerId: number) {
    try {
      const loyalty = await this.prisma.customerLoyalty.findUnique({
        where: { customerId },
        include: {
          customer: {
            include: {
              _count: {
                select: {
                  sales: true,
                },
              },
            },
          },
        },
      });

      if (!loyalty) {
        throw new NotFoundException(
          `Loyalty account not found for customer ID ${customerId}`,
        );
      }

      return loyalty;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.customerLoyaltyErrorOptions,
        'Failed to fetch customer loyalty',
      );
    }
  }

  // Get loyalty account by ID
  async findOne(id: number) {
    try {
      const loyalty = await this.prisma.customerLoyalty.findUnique({
        where: { id },
        include: {
          customer: {
            include: {
              sales: {
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                  branch: true,
                },
              },
              _count: {
                select: {
                  sales: true,
                },
              },
            },
          },
        },
      });

      if (!loyalty) {
        throw new NotFoundException(`Loyalty account with ID ${id} not found`);
      }

      return loyalty;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.customerLoyaltyErrorOptions,
        `Failed to fetch loyalty account with ID ${id}`,
      );
    }
  }

  // Get all loyalty accounts with filters
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.CustomerLoyaltyWhereInput;
    orderBy?: Prisma.CustomerLoyaltyOrderByWithRelationInput;
  }) {
    try {
      const { skip, take, where, orderBy } = params;
      return await this.prisma.customerLoyalty.findMany({
        skip,
        take,
        where,
        orderBy: orderBy || { pointsBalance: 'desc' },
        include: {
          customer: {
            include: {
              _count: {
                select: {
                  sales: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.customerLoyaltyErrorOptions,
        'Failed to fetch customer loyalty accounts',
      );
    }
  }

  // Add points to customer loyalty account
  async addPoints(
    customerId: number,
    points: number,
    reason: string,
    referenceId?: number,
  ) {
    try {
      if (points <= 0) {
        throw new BadRequestException('Points must be greater than 0');
      }

      return await this.prisma.$transaction(async (tx) => {
        // Get current loyalty account
        const loyalty = await tx.customerLoyalty.findUnique({
          where: { customerId },
        });

        if (!loyalty) {
          throw new NotFoundException(
            `Loyalty account not found for customer ID ${customerId}`,
          );
        }

        // Update loyalty points
        const updatedLoyalty = await tx.customerLoyalty.update({
          where: { customerId },
          data: {
            pointsBalance: {
              increment: points,
            },
            totalEarned: {
              increment: points,
            },
          },
          include: {
            customer: true,
          },
        });

        // Create loyalty transaction log
        // await tx.loyaltyTransaction.create({
        //   data: {
        //     customerId: customerId,
        //     type: 'EARNED',
        //     points: points,
        //     balanceAfter: updatedLoyalty.pointsBalance,
        //     reason: reason,
        //     referenceId: referenceId,
        //     referenceType: referenceId ? 'SALE' : 'MANUAL',
        //   },
        // });

        return updatedLoyalty;
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.customerLoyaltyErrorOptions,
        'Failed to add loyalty points',
      );
    }
  }

  // Redeem points from customer loyalty account
  async redeemPoints(
    customerId: number,
    points: number,
    reason: string,
    referenceId?: number,
  ) {
    try {
      if (points <= 0) {
        throw new BadRequestException('Points must be greater than 0');
      }

      return await this.prisma.$transaction(async (tx) => {
        // Get current loyalty account
        const loyalty = await tx.customerLoyalty.findUnique({
          where: { customerId },
        });

        if (!loyalty) {
          throw new NotFoundException(
            `Loyalty account not found for customer ID ${customerId}`,
          );
        }

        // Check if customer has enough points
        if (loyalty.pointsBalance < points) {
          throw new BadRequestException(
            `Insufficient points. Available: ${loyalty.pointsBalance}, Requested: ${points}`,
          );
        }

        // Update loyalty points
        const updatedLoyalty = await tx.customerLoyalty.update({
          where: { customerId },
          data: {
            pointsBalance: {
              decrement: points,
            },
            totalRedeemed: {
              increment: points,
            },
          },
          include: {
            customer: true,
          },
        });

        // Create loyalty transaction log
        // await tx.loyaltyTransaction.create({
        //   data: {
        //     customerId: customerId,
        //     type: 'REDEEMED',
        //     points: points,
        //     balanceAfter: updatedLoyalty.pointsBalance,
        //     reason: reason,
        //     referenceId: referenceId,
        //     referenceType: referenceId ? 'REDEMPTION' : 'MANUAL',
        //   },
        // });

        return updatedLoyalty;
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.customerLoyaltyErrorOptions,
        'Failed to redeem loyalty points',
      );
    }
  }

  // Adjust points (admin function for corrections)
  async adjustPoints(customerId: number, points: number, reason: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Get current loyalty account
        const loyalty = await tx.customerLoyalty.findUnique({
          where: { customerId },
        });

        if (!loyalty) {
          throw new NotFoundException(
            `Loyalty account not found for customer ID ${customerId}`,
          );
        }

        const newBalance = loyalty.pointsBalance + points;

        // Update loyalty points
        const updatedLoyalty = await tx.customerLoyalty.update({
          where: { customerId },
          data: {
            pointsBalance: newBalance,
            ...(points > 0 && {
              totalEarned: {
                increment: points,
              },
            }),
            ...(points < 0 && {
              totalRedeemed: {
                increment: Math.abs(points),
              },
            }),
          },
          include: {
            customer: true,
          },
        });

        // Create loyalty transaction log
        // await tx.loyaltyTransaction.create({
        //   data: {
        //     customerId: customerId,
        //     type: points > 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_REMOVE',
        //     points: Math.abs(points),
        //     balanceAfter: updatedLoyalty.pointsBalance,
        //     reason: reason,
        //     referenceType: 'ADJUSTMENT',
        //   },
        // });

        return updatedLoyalty;
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.customerLoyaltyErrorOptions,
        'Failed to adjust loyalty points',
      );
    }
  }

  // Calculate points from sale amount (you can customize this logic)
  calculatePointsFromSale(saleAmount: number): number {
    // Example: 1 point for every $10 spent
    const pointsPerDollar = 0.1;
    return Math.floor(saleAmount * pointsPerDollar);
  }

  // Process points from a sale
  async processSalePoints(saleId: number) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const sale = await tx.sale.findUnique({
          where: { id: saleId },
          include: {
            customer: true,
          },
        });

        if (!sale || !sale.customerId) {
          throw new NotFoundException(
            'Sale not found or no customer associated',
          );
        }

        // Check if loyalty account exists, create if not
        let loyalty = await tx.customerLoyalty.findUnique({
          where: { customerId: sale.customerId },
        });

        if (!loyalty) {
          loyalty = await tx.customerLoyalty.create({
            data: {
              customerId: sale.customerId,
              pointsBalance: 0,
              totalEarned: 0,
              totalRedeemed: 0,
            },
          });
        }

        // Calculate points from sale
        const pointsEarned = this.calculatePointsFromSale(
          Number(sale.grandTotal),
        );

        if (pointsEarned > 0) {
          // Update loyalty points
          const updatedLoyalty = await tx.customerLoyalty.update({
            where: { customerId: sale.customerId },
            data: {
              pointsBalance: {
                increment: pointsEarned,
              },
              totalEarned: {
                increment: pointsEarned,
              },
            },
          });

          // Create loyalty transaction log
          //   await tx.loyaltyTransaction.create({
          //     data: {
          //       customerId: sale.customerId,
          //       type: 'EARNED',
          //       points: pointsEarned,
          //       balanceAfter: updatedLoyalty.pointsBalance,
          //       reason: `Points from sale #${sale.invoiceNo}`,
          //       referenceId: saleId,
          //       referenceType: 'SALE',
          //     },
          //   });

          return {
            loyalty: updatedLoyalty,
            pointsEarned,
            saleAmount: sale.grandTotal,
          };
        }

        return {
          loyalty,
          pointsEarned: 0,
          saleAmount: sale.grandTotal,
          message: 'No points earned from this sale',
        };
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.customerLoyaltyErrorOptions,
        'Failed to process sale points',
      );
    }
  }

  // Get top customers by loyalty points
  async getTopCustomers(limit: number = 10) {
    try {
      return await this.prisma.customerLoyalty.findMany({
        take: limit,
        orderBy: { pointsBalance: 'desc' },
        include: {
          customer: {
            include: {
              _count: {
                select: {
                  sales: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.customerLoyaltyErrorOptions,
        'Failed to fetch top loyalty customers',
      );
    }
  }

  // Get loyalty statistics
  async getStats() {
    try {
      const totalAccounts = await this.prisma.customerLoyalty.count();
      const totalPoints = await this.prisma.customerLoyalty.aggregate({
        _sum: {
          pointsBalance: true,
          totalEarned: true,
          totalRedeemed: true,
        },
      });

      const activeAccounts = await this.prisma.customerLoyalty.count({
        where: {
          pointsBalance: {
            gt: 0,
          },
        },
      });

      // Top earners
      const topEarners = await this.prisma.customerLoyalty.findMany({
        take: 5,
        orderBy: { totalEarned: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        totalAccounts,
        activeAccounts,
        inactiveAccounts: totalAccounts - activeAccounts,
        totalPointsBalance: totalPoints._sum.pointsBalance || 0,
        totalPointsEarned: totalPoints._sum.totalEarned || 0,
        totalPointsRedeemed: totalPoints._sum.totalRedeemed || 0,
        averagePointsPerAccount:
          totalAccounts > 0
            ? (totalPoints._sum.pointsBalance || 0) / totalAccounts
            : 0,
        topEarners,
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.customerLoyaltyErrorOptions,
        'Failed to fetch loyalty statistics',
      );
    }
  }

  // Get customer loyalty history
  async getCustomerHistory(
    customerId: number,
    params?: {
      skip?: number;
      take?: number;
    },
  ) {
    try {
      const loyalty = await this.prisma.customerLoyalty.findUnique({
        where: { customerId },
      });

      if (!loyalty) {
        throw new NotFoundException(
          `Loyalty account not found for customer ID ${customerId}`,
        );
      }

      //   // This assumes you have a LoyaltyTransaction model
      //   const transactions = await this.prisma.loyaltyTransaction.findMany({
      //     where: { customerId },
      //     skip: params?.skip,
      //     take: params?.take,
      //     orderBy: { createdAt: 'desc' },
      //   });

      return {
        loyalty,
        // transactions,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.customerLoyaltyErrorOptions,
        'Failed to fetch customer loyalty history',
      );
    }
  }

  // Reset loyalty account (admin function)
  async resetAccount(customerId: number, reason: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const loyalty = await tx.customerLoyalty.findUnique({
          where: { customerId },
        });

        if (!loyalty) {
          throw new NotFoundException(
            `Loyalty account not found for customer ID ${customerId}`,
          );
        }

        const updatedLoyalty = await tx.customerLoyalty.update({
          where: { customerId },
          data: {
            pointsBalance: 0,
            totalRedeemed: {
              increment: loyalty.pointsBalance, // Move current balance to redeemed
            },
          },
          include: {
            customer: true,
          },
        });

        // Create loyalty transaction log for reset
        // await tx.loyaltyTransaction.create({
        //   data: {
        //     customerId: customerId,
        //     type: 'RESET',
        //     points: loyalty.pointsBalance,
        //     balanceAfter: 0,
        //     reason: reason,
        //     referenceType: 'ADMIN',
        //   },
        // });

        return updatedLoyalty;
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.customerLoyaltyErrorOptions,
        'Failed to reset loyalty account',
      );
    }
  }
}
