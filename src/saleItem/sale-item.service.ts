import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from '../prisma/prisma-error.utils';

@Injectable()
export class SaleItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  // Sale item-specific error configuration
  private readonly saleItemErrorOptions = {
    entity: 'sale item',
    foreignKeyMap: {
      saleId: 'Sale does not exist',
      productId: 'Product does not exist',
    },
    customMessages: {
      P2003: 'Referenced sale or product does not exist',
    },
  };

  // Create a sale item
  async create(data: {
    saleId: number;
    productId: number;
    quantity: number;
    unitPrice: number;
  }) {
    try {
      const subtotal = Number(data.unitPrice) * data.quantity;

      return await this.prisma.saleItem.create({
        data: {
          saleId: data.saleId,
          productId: data.productId,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          subtotal: subtotal,
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
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.saleItemErrorOptions,
        'Failed to create sale item',
      );
    }
  }

  // Get all sale items with filters
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.SaleItemWhereInput;
    orderBy?: Prisma.SaleItemOrderByWithRelationInput;
  }) {
    try {
      const { skip, take, where, orderBy } = params;
      return await this.prisma.saleItem.findMany({
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
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.saleItemErrorOptions,
        'Failed to fetch sale items',
      );
    }
  }

  // Get a single sale item by ID
  async findOne(id: number) {
    try {
      const saleItem = await this.prisma.saleItem.findUnique({
        where: { id },
        include: {
          sale: {
            include: {
              branch: true,
              customer: true,
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
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
        },
      });

      if (!saleItem) {
        throw new NotFoundException(`Sale item with ID ${id} not found`);
      }

      return saleItem;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.saleItemErrorOptions,
        `Failed to fetch sale item with ID ${id}`,
      );
    }
  }

  // Get sale items by sale ID
  async findBySale(saleId: number) {
    try {
      const sale = await this.prisma.sale.findUnique({
        where: { id: saleId },
      });

      if (!sale) {
        throw new NotFoundException(`Sale with ID ${saleId} not found`);
      }

      return await this.prisma.saleItem.findMany({
        where: { saleId },
        include: {
          product: {
            include: {
              category: true,
              brand: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.saleItemErrorOptions,
        'Failed to fetch sale items',
      );
    }
  }

  // Get sale items by product ID
  async findByProduct(
    productId: number,
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.SaleItemWhereInput;
    },
  ) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      const where: Prisma.SaleItemWhereInput = {
        productId,
        ...params?.where,
      };

      return await this.prisma.saleItem.findMany({
        skip: params?.skip,
        take: params?.take,
        where,
        include: {
          sale: {
            include: {
              branch: true,
              customer: true,
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          product: {
            include: {
              category: true,
              brand: true,
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
        this.saleItemErrorOptions,
        'Failed to fetch product sale items',
      );
    }
  }

  // Update a sale item
  async update(
    id: number,
    data: {
      quantity?: number;
      unitPrice?: number;
    },
  ) {
    try {
      const saleItem = await this.prisma.saleItem.findUnique({
        where: { id },
      });

      if (!saleItem) {
        throw new NotFoundException(`Sale item with ID ${id} not found`);
      }

      // Check stock if quantity is being updated
      if (data.quantity !== undefined) {
        const sale = await this.prisma.sale.findUnique({
          where: { id: saleItem.saleId },
        });

        // const currentStock = await this.prisma.stock.findUnique({
        //   where: {
        //     productId_branchId: {
        //       productId: saleItem.productId,
        //       branchId: sale.branchId,
        //     },
        //   },
        // });

        // const quantityChange = data.quantity - saleItem.quantity;
        // if (currentStock.quantity < quantityChange) {
        //   throw new BadRequestException(
        //     `Insufficient stock. Available: ${currentStock.quantity}, Change requires: ${quantityChange}`,
        //   );
        // }
      }

      const updateData: any = {};
      if (data.quantity !== undefined) updateData.quantity = data.quantity;
      if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice;

      // Recalculate subtotal if quantity or unitPrice changes
      if (data.quantity !== undefined || data.unitPrice !== undefined) {
        const finalQuantity =
          data.quantity !== undefined ? data.quantity : saleItem.quantity;
        const finalUnitPrice =
          data.unitPrice !== undefined
            ? Number(data.unitPrice)
            : Number(saleItem.unitPrice);
        updateData.subtotal = finalQuantity * finalUnitPrice;
      }

      return await this.prisma.$transaction(async (tx) => {
        const updatedItem = await tx.saleItem.update({
          where: { id },
          data: updateData,
          include: {
            sale: true,
            product: true,
          },
        });

        // Update sale totals if quantity or price changed
        if (data.quantity !== undefined || data.unitPrice !== undefined) {
          const saleItems = await tx.saleItem.findMany({
            where: { saleId: saleItem.saleId },
          });

          const totalAmount = saleItems.reduce(
            (sum, item) => sum + Number(item.subtotal),
            0,
          );
          const sale = await tx.sale.findUnique({
            where: { id: saleItem.saleId },
          });

          //   const grandTotal =
          //     totalAmount - Number(sale.discount) + Number(sale.tax);
          //   const dueAmount = grandTotal - Number(sale.paidAmount);

          //   await tx.sale.update({
          //     where: { id: saleItem.saleId },
          //     data: {
          //       totalAmount: totalAmount,
          //       grandTotal: grandTotal,
          //       dueAmount: dueAmount,
          //     },
          //   });
        }

        // Update stock if quantity changed
        if (data.quantity !== undefined) {
          const quantityChange = data.quantity - saleItem.quantity;
          const sale = await tx.sale.findUnique({
            where: { id: saleItem.saleId },
          });

          //   await tx.stock.update({
          //     where: {
          //       productId_branchId: {
          //         productId: saleItem.productId,
          //         branchId: sale.branchId,
          //       },
          //     },
          //     data: {
          //       quantity: {
          //         decrement: quantityChange,
          //       },
          //     },
          //   });

          // Create inventory log for adjustment
          //   await tx.inventoryLog.create({
          //     data: {
          //       productId: saleItem.productId,
          //       branchId: sale.branchId,
          //       type: 'ADJUSTMENT',
          //       quantity: -quantityChange,
          //       referenceId: saleItem.saleId,
          //       referenceType: 'SALE',
          //       remarks: `Sale item quantity updated from ${saleItem.quantity} to ${data.quantity}`,
          //     },
          //   });
        }

        return updatedItem;
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
        this.saleItemErrorOptions,
        `Failed to update sale item with ID ${id}`,
      );
    }
  }

  // Delete a sale item
  async remove(id: number) {
    try {
      const saleItem = await this.prisma.saleItem.findUnique({
        where: { id },
      });

      if (!saleItem) {
        throw new NotFoundException(`Sale item with ID ${id} not found`);
      }

      return await this.prisma.$transaction(async (tx) => {
        const deletedItem = await tx.saleItem.delete({
          where: { id },
        });

        // Update sale totals
        const saleItems = await tx.saleItem.findMany({
          where: { saleId: saleItem.saleId },
        });

        const totalAmount = saleItems.reduce(
          (sum, item) => sum + Number(item.subtotal),
          0,
        );
        const sale = await tx.sale.findUnique({
          where: { id: saleItem.saleId },
        });

        // const grandTotal =
        //   totalAmount - Number(sale.discount) + Number(sale.tax);
        // const dueAmount = grandTotal - Number(sale.paidAmount);

        // await tx.sale.update({
        //   where: { id: saleItem.saleId },
        //   data: {
        //     totalAmount: totalAmount,
        //     grandTotal: grandTotal,
        //     dueAmount: dueAmount,
        //   },
        // });

        // Restore stock
        const saleData = await tx.sale.findUnique({
          where: { id: saleItem.saleId },
        });

        // await tx.stock.update({
        //   where: {
        //     productId_branchId: {
        //       productId: saleItem.productId,
        //       branchId: saleData.branchId,
        //     },
        //   },
        //   data: {
        //     quantity: {
        //       increment: saleItem.quantity,
        //     },
        //   },
        // });

        // Create inventory log for removal
        // await tx.inventoryLog.create({
        //   data: {
        //     productId: saleItem.productId,
        //     branchId: saleData.branchId,
        //     type: 'ADJUSTMENT',
        //     quantity: saleItem.quantity,
        //     referenceId: saleItem.saleId,
        //     referenceType: 'SALE',
        //     remarks: `Sale item removed from sale`,
        //   },
        // });

        return deletedItem;
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.saleItemErrorOptions,
        `Failed to delete sale item with ID ${id}`,
      );
    }
  }

  // Get sale item statistics
  async getProductSaleStats(
    productId: number,
    startDate?: Date,
    endDate?: Date,
  ) {
    try {
      const where: Prisma.SaleItemWhereInput = {
        productId,
        sale: {
          //   status: { not: 'CANCELLED' },
          ...(startDate &&
            endDate && {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            }),
        },
      };

      const saleItems = await this.prisma.saleItem.findMany({
        where,
        include: {
          sale: true,
        },
      });

      const totalQuantity = saleItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      const totalAmount = saleItems.reduce(
        (sum, item) => sum + Number(item.subtotal),
        0,
      );
      const averageUnitPrice =
        totalQuantity > 0 ? totalAmount / totalQuantity : 0;

      // Get sales frequency by month
      const monthlyStats = await this.prisma.saleItem.groupBy({
        by: ['productId'],
        where,
        _sum: {
          quantity: true,
          subtotal: true,
        },
        _count: {
          id: true,
        },
      });

      return {
        productId,
        totalQuantity,
        totalAmount,
        averageUnitPrice,
        saleCount: saleItems.length,
        monthlyStats: monthlyStats[0] || null,
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.saleItemErrorOptions,
        'Failed to fetch sale item statistics',
      );
    }
  }

  // Get top selling products
  async getTopSellingProducts(
    branchId?: number,
    limit: number = 10,
    startDate?: Date,
    endDate?: Date,
  ) {
    try {
      const where: Prisma.SaleItemWhereInput = {
        sale: {
          //   status: { not: 'CANCELLED' },
          ...(branchId && { branchId }),
          ...(startDate &&
            endDate && {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            }),
        },
      };

      const topProducts = await this.prisma.saleItem.groupBy({
        by: ['productId'],
        where,
        _sum: {
          quantity: true,
          subtotal: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: limit,
      });

      // Get product details for the top products
      const productIds = topProducts.map((item) => item.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
          category: true,
          brand: true,
        },
      });

      return topProducts.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          product,
          totalQuantity: item._sum.quantity,
          totalRevenue: item._sum.subtotal,
          saleCount: item._count.id,
        };
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.saleItemErrorOptions,
        'Failed to fetch top selling products',
      );
    }
  }

  // Get sales performance by product category
  async getSalesByCategory(
    branchId?: number,
    startDate?: Date,
    endDate?: Date,
  ) {
    try {
      const where: Prisma.SaleItemWhereInput = {
        sale: {
          //   status: { not: 'CANCELLED' },
          ...(branchId && { branchId }),
          ...(startDate &&
            endDate && {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            }),
        },
      };

      const categorySales = await this.prisma.saleItem.groupBy({
        by: ['productId'],
        where,
        _sum: {
          quantity: true,
          subtotal: true,
        },
      });

      // Get product categories
      const productIds = categorySales.map((item) => item.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
          category: true,
        },
      });

      // Group by category
      const categoryStats = categorySales.reduce((acc, item) => {
        const product = products.find((p) => p.id === item.productId);
        const categoryName = product?.category?.name || 'Uncategorized';

        if (!acc[categoryName]) {
          acc[categoryName] = {
            totalQuantity: 0,
            totalRevenue: 0,
            productCount: 0,
          };
        }

        acc[categoryName].totalQuantity += item._sum.quantity;
        acc[categoryName].totalRevenue += Number(item._sum.subtotal);
        acc[categoryName].productCount += 1;

        return acc;
      }, {});

      return categoryStats;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.saleItemErrorOptions,
        'Failed to fetch sales by category',
      );
    }
  }
}
