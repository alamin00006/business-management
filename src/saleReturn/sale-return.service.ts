import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from '../prisma/prisma-error.utils';

@Injectable()
export class SaleReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  // Sale return-specific error configuration
  private readonly saleReturnErrorOptions = {
    entity: 'sale return',
    foreignKeyMap: {
      saleId: 'Sale does not exist',
      productId: 'Product does not exist',
      processedById: 'User does not exist',
    },
    customMessages: {
      P2003: 'Referenced sale, product, or user does not exist',
    },
  };

  // Create a new sale return
  async create(data: {
    saleId: number;
    productId: number;
    quantity: number;
    reason: string;
    refundAmount: number;
    processedById?: number;
  }) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Verify sale exists and get sale details
        const sale = await tx.sale.findUnique({
          where: { id: data.saleId },
          include: {
            saleItems: true,
          },
        });

        if (!sale) {
          throw new NotFoundException(`Sale with ID ${data.saleId} not found`);
        }

        // Verify product exists in the sale
        const saleItem = sale.saleItems.find(
          (item) => item.productId === data.productId,
        );
        if (!saleItem) {
          throw new BadRequestException(
            `Product with ID ${data.productId} not found in sale ${data.saleId}`,
          );
        }

        // Verify return quantity doesn't exceed sold quantity
        if (data.quantity > saleItem.quantity) {
          throw new BadRequestException(
            `Return quantity (${data.quantity}) exceeds sold quantity (${saleItem.quantity})`,
          );
        }

        // Verify refund amount is reasonable
        const maxRefund = Number(saleItem.unitPrice) * data.quantity;
        if (Number(data.refundAmount) > maxRefund) {
          throw new BadRequestException(
            `Refund amount (${data.refundAmount}) exceeds maximum allowed (${maxRefund})`,
          );
        }

        // Create sale return
        const saleReturn = await tx.saleReturn.create({
          data: {
            saleId: data.saleId,
            productId: data.productId,
            quantity: data.quantity,
            reason: data.reason,
            refundAmount: data.refundAmount,
            processedById: data.processedById,
          },
          include: {
            sale: {
              include: {
                branch: true,
                customer: true,
              },
            },
            product: {
              include: {
                category: true,
                brand: true,
              },
            },
            processedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        // Update stock (add returned items back to stock)
        await tx.stock.upsert({
          where: {
            productId_branchId: {
              productId: data.productId,
              branchId: sale.branchId,
            },
          },
          update: {
            quantity: {
              increment: data.quantity,
            },
          },
          create: {
            productId: data.productId,
            branchId: sale.branchId,
            quantity: data.quantity,
          },
        });

        // Create inventory log for return
        // await tx.inventoryLog.create({
        //   data: {
        //     productId: data.productId,
        //     branchId: sale.branchId,
        //     changeType: 'RETURN',
        //     quantityChange: data.quantity,
        //     previousStock: saleItem.quantity - data.quantity, // Approximate previous stock
        //     newStock: saleItem.quantity, // Approximate new stock after return
        //     referenceType: 'SALE_RETURN',
        //     referenceId: saleReturn.id,
        //     createdById: data.processedById || sale.createdById,
        //   },
        // });

        return saleReturn;
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
        this.saleReturnErrorOptions,
        'Failed to create sale return',
      );
    }
  }

  // Get all sale returns with filters
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.SaleReturnWhereInput;
    orderBy?: Prisma.SaleReturnOrderByWithRelationInput;
  }) {
    try {
      const { skip, take, where, orderBy } = params;
      return await this.prisma.saleReturn.findMany({
        skip,
        take,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
        include: {
          sale: {
            include: {
              branch: true,
              customer: true,
            },
          },
          product: {
            include: {
              category: true,
              brand: true,
            },
          },
          processedBy: {
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
        this.saleReturnErrorOptions,
        'Failed to fetch sale returns',
      );
    }
  }

  // Get a single sale return by ID
  async findOne(id: number) {
    try {
      const saleReturn = await this.prisma.saleReturn.findUnique({
        where: { id },
        include: {
          sale: {
            include: {
              branch: true,
              customer: true,
              saleItems: {
                include: {
                  product: true,
                },
              },
            },
          },
          product: {
            include: {
              category: true,
              brand: true,
              supplier: true,
            },
          },
          processedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!saleReturn) {
        throw new NotFoundException(`Sale return with ID ${id} not found`);
      }

      return saleReturn;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.saleReturnErrorOptions,
        `Failed to fetch sale return with ID ${id}`,
      );
    }
  }

  // Get sale returns by sale ID
  async findBySale(saleId: number) {
    try {
      const sale = await this.prisma.sale.findUnique({
        where: { id: saleId },
      });

      if (!sale) {
        throw new NotFoundException(`Sale with ID ${saleId} not found`);
      }

      return await this.prisma.saleReturn.findMany({
        where: { saleId },
        include: {
          sale: {
            include: {
              branch: true,
              customer: true,
            },
          },
          product: {
            include: {
              category: true,
              brand: true,
            },
          },
          processedBy: {
            select: {
              id: true,
              name: true,
              email: true,
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
        this.saleReturnErrorOptions,
        'Failed to fetch sale returns by sale',
      );
    }
  }

  // Get sale returns by product ID
  async findByProduct(
    productId: number,
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.SaleReturnWhereInput;
    },
  ) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      const where: Prisma.SaleReturnWhereInput = {
        productId,
        ...params?.where,
      };

      return await this.prisma.saleReturn.findMany({
        skip: params?.skip,
        take: params?.take,
        where,
        include: {
          sale: {
            include: {
              branch: true,
              customer: true,
            },
          },
          product: {
            include: {
              category: true,
              brand: true,
            },
          },
          processedBy: {
            select: {
              id: true,
              name: true,
              email: true,
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
        this.saleReturnErrorOptions,
        'Failed to fetch sale returns by product',
      );
    }
  }

  // Get sale returns by customer
  async findByCustomer(
    customerId: number,
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.SaleReturnWhereInput;
    },
  ) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${customerId} not found`);
      }

      const where: Prisma.SaleReturnWhereInput = {
        sale: {
          customerId: customerId,
        },
        ...params?.where,
      };

      return await this.prisma.saleReturn.findMany({
        skip: params?.skip,
        take: params?.take,
        where,
        include: {
          sale: {
            include: {
              branch: true,
              customer: true,
            },
          },
          product: {
            include: {
              category: true,
              brand: true,
            },
          },
          processedBy: {
            select: {
              id: true,
              name: true,
              email: true,
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
        this.saleReturnErrorOptions,
        'Failed to fetch sale returns by customer',
      );
    }
  }

  // Update sale return status
  async updateStatus(id: number, status: string, processedById: number) {
    try {
      const saleReturn = await this.prisma.saleReturn.findUnique({
        where: { id },
      });

      if (!saleReturn) {
        throw new NotFoundException(`Sale return with ID ${id} not found`);
      }

      return await this.prisma.saleReturn.update({
        where: { id },
        data: {
          status: status as any,
          processedById: processedById,
        },
        include: {
          sale: {
            include: {
              branch: true,
              customer: true,
            },
          },
          product: {
            include: {
              category: true,
              brand: true,
            },
          },
          processedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.saleReturnErrorOptions,
        `Failed to update sale return status with ID ${id}`,
      );
    }
  }

  // Update sale return details
  async update(
    id: number,
    data: {
      quantity?: number;
      reason?: string;
      refundAmount?: number;
    },
  ) {
    try {
      const saleReturn = await this.prisma.saleReturn.findUnique({
        where: { id },
      });

      if (!saleReturn) {
        throw new NotFoundException(`Sale return with ID ${id} not found`);
      }

      // If quantity is being updated, adjust stock
      if (
        data.quantity !== undefined &&
        data.quantity !== saleReturn.quantity
      ) {
        const sale = await this.prisma.sale.findUnique({
          where: { id: saleReturn.saleId },
        });

        const quantityDifference = data.quantity - saleReturn.quantity;

        // await this.prisma.stock.update({
        //   where: {
        //     productId_branchId: {
        //       productId: saleReturn.productId,
        //       branchId: sale.branchId,
        //     },
        //   },
        //   data: {
        //     quantity: {
        //       increment: quantityDifference,
        //     },
        //   },
        // });

        // Update inventory log
        // await this.prisma.inventoryLog.create({
        //   data: {
        //     productId: saleReturn.productId,
        //     branchId: sale.branchId,
        //     changeType: 'ADJUSTMENT',
        //     quantityChange: quantityDifference,
        //     previousStock: saleReturn.quantity,
        //     newStock: data.quantity,
        //     referenceType: 'SALE_RETURN',
        //     referenceId: id,
        //     createdById: saleReturn.processedById || sale.createdById,
        //   },
        // });
      }

      return await this.prisma.saleReturn.update({
        where: { id },
        data,
        include: {
          sale: {
            include: {
              branch: true,
              customer: true,
            },
          },
          product: {
            include: {
              category: true,
              brand: true,
            },
          },
          processedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.saleReturnErrorOptions,
        `Failed to update sale return with ID ${id}`,
      );
    }
  }

  // Delete sale return (and reverse stock adjustment)
  async remove(id: number) {
    try {
      const saleReturn = await this.prisma.saleReturn.findUnique({
        where: { id },
      });

      if (!saleReturn) {
        throw new NotFoundException(`Sale return with ID ${id} not found`);
      }

      return await this.prisma.$transaction(async (tx) => {
        // Get sale details for stock reversal
        const sale = await tx.sale.findUnique({
          where: { id: saleReturn.saleId },
        });

        // Reverse stock adjustment (remove returned items from stock)
        // await tx.stock.update({
        //   where: {
        //     productId_branchId: {
        //       productId: saleReturn.productId,
        //       branchId: sale.branchId,
        //     },
        //   },
        //   data: {
        //     quantity: {
        //       decrement: saleReturn.quantity,
        //     },
        //   },
        // });

        // Create inventory log for deletion
        // await tx.inventoryLog.create({
        //   data: {
        //     productId: saleReturn.productId,
        //     branchId: sale.branchId,
        //     changeType: 'ADJUSTMENT',
        //     quantityChange: -saleReturn.quantity,
        //     previousStock: saleReturn.quantity,
        //     newStock: 0,
        //     referenceType: 'SALE_RETURN',
        //     referenceId: id,
        //     createdById: saleReturn.processedById || sale.createdById,
        //   },
        // });

        // Delete the sale return
        return await tx.saleReturn.delete({
          where: { id },
        });
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.saleReturnErrorOptions,
        `Failed to delete sale return with ID ${id}`,
      );
    }
  }

  // Get sale return statistics
  async getStats(branchId?: number, startDate?: Date, endDate?: Date) {
    try {
      const where: Prisma.SaleReturnWhereInput = {
        ...(branchId && {
          sale: {
            branchId: branchId,
          },
        }),
        ...(startDate &&
          endDate && {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
      };

      const saleReturns = await this.prisma.saleReturn.findMany({
        where,
        include: {
          product: true,
          sale: true,
        },
      });

      const totalReturns = saleReturns.length;
      const totalQuantity = saleReturns.reduce(
        (sum, ret) => sum + ret.quantity,
        0,
      );
      const totalRefundAmount = saleReturns.reduce(
        (sum, ret) => sum + Number(ret.refundAmount),
        0,
      );
      const averageRefund =
        totalReturns > 0 ? totalRefundAmount / totalReturns : 0;

      // Group by status
      const statusStats = saleReturns.reduce((acc, ret) => {
        acc[ret.status] = (acc[ret.status] || 0) + 1;
        return acc;
      }, {});

      // Group by reason
      const reasonStats = saleReturns.reduce((acc, ret) => {
        acc[ret.reason] = (acc[ret.reason] || 0) + 1;
        return acc;
      }, {});

      // Top returned products
      const productStats = await this.prisma.saleReturn.groupBy({
        by: ['productId'],
        where,
        _sum: {
          quantity: true,
          refundAmount: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 10,
      });

      return {
        totalReturns,
        totalQuantity,
        totalRefundAmount,
        averageRefund,
        statusStats,
        reasonStats,
        topReturnedProducts: productStats,
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.saleReturnErrorOptions,
        'Failed to fetch sale return statistics',
      );
    }
  }

  // Get recent sale returns
  async findRecent(limit: number = 10, branchId?: number) {
    try {
      const where: Prisma.SaleReturnWhereInput = branchId
        ? {
            sale: {
              branchId: branchId,
            },
          }
        : {};

      return await this.prisma.saleReturn.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sale: {
            include: {
              branch: true,
              customer: true,
            },
          },
          product: {
            include: {
              category: true,
              brand: true,
            },
          },
          processedBy: {
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
        this.saleReturnErrorOptions,
        'Failed to fetch recent sale returns',
      );
    }
  }

  // Search sale returns
  async search(
    query: string,
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.SaleReturnWhereInput;
    },
  ) {
    try {
      const where: Prisma.SaleReturnWhereInput = {
        ...params?.where,
        OR: [
          { reason: { contains: query, mode: 'insensitive' } },
          {
            product: {
              name: { contains: query, mode: 'insensitive' },
            },
          },
          {
            sale: {
              invoiceNo: { contains: query, mode: 'insensitive' },
            },
          },
        ],
      };

      return await this.prisma.saleReturn.findMany({
        skip: params?.skip,
        take: params?.take,
        where,
        include: {
          sale: {
            include: {
              branch: true,
              customer: true,
            },
          },
          product: {
            include: {
              category: true,
              brand: true,
            },
          },
          processedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.saleReturnErrorOptions,
        'Failed to search sale returns',
      );
    }
  }

  // Validate if a product can be returned from a sale
  async validateReturn(saleId: number, productId: number, quantity: number) {
    try {
      const sale = await this.prisma.sale.findUnique({
        where: { id: saleId },
        include: {
          saleItems: true,
          saleReturns: true,
        },
      });

      if (!sale) {
        throw new NotFoundException(`Sale with ID ${saleId} not found`);
      }

      const saleItem = sale.saleItems.find(
        (item) => item.productId === productId,
      );
      if (!saleItem) {
        throw new BadRequestException(
          `Product with ID ${productId} not found in sale ${saleId}`,
        );
      }

      // Calculate already returned quantity
      const alreadyReturned = sale.saleReturns
        .filter((ret) => ret.productId === productId)
        .reduce((sum, ret) => sum + ret.quantity, 0);

      const availableToReturn = saleItem.quantity - alreadyReturned;

      return {
        isValid: quantity <= availableToReturn,
        availableToReturn,
        alreadyReturned,
        soldQuantity: saleItem.quantity,
        unitPrice: saleItem.unitPrice,
        maxRefundAmount: Number(saleItem.unitPrice) * quantity,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.saleReturnErrorOptions,
        'Failed to validate sale return',
      );
    }
  }
}
