import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from '../prisma/prisma-error.utils';

@Injectable()
export class PurchaseItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  // Purchase item-specific error configuration
  private readonly purchaseItemErrorOptions = {
    entity: 'purchase item',
    foreignKeyMap: {
      purchaseId: 'Purchase does not exist',
      productId: 'Product does not exist',
    },
    customMessages: {
      P2003: 'Referenced purchase or product does not exist',
    },
  };

  // Create a purchase item
  async create(data: {
    purchaseId: number;
    productId: number;
    quantity: number;
    unitCost: number;
  }) {
    try {
      const subtotal = Number(data.unitCost) * data.quantity;

      return await this.prisma.purchaseItem.create({
        data: {
          purchaseId: data.purchaseId,
          productId: data.productId,
          quantity: data.quantity,
          unitCost: data.unitCost,
          subtotal: subtotal,
        },
        include: {
          purchase: {
            include: {
              supplier: true,
              branch: true,
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
        this.purchaseItemErrorOptions,
        'Failed to create purchase item',
      );
    }
  }

  // Get all purchase items with filters
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.PurchaseItemWhereInput;
    orderBy?: Prisma.PurchaseItemOrderByWithRelationInput;
  }) {
    try {
      const { skip, take, where, orderBy } = params;
      return await this.prisma.purchaseItem.findMany({
        skip,
        take,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
        include: {
          purchase: {
            include: {
              supplier: true,
              branch: true,
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
        this.purchaseItemErrorOptions,
        'Failed to fetch purchase items',
      );
    }
  }

  // Get a single purchase item by ID
  async findOne(id: number) {
    try {
      const purchaseItem = await this.prisma.purchaseItem.findUnique({
        where: { id },
        include: {
          purchase: {
            include: {
              supplier: true,
              branch: true,
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

      if (!purchaseItem) {
        throw new NotFoundException(`Purchase item with ID ${id} not found`);
      }

      return purchaseItem;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.purchaseItemErrorOptions,
        `Failed to fetch purchase item with ID ${id}`,
      );
    }
  }

  // Get purchase items by purchase ID
  async findByPurchase(purchaseId: number) {
    try {
      const purchase = await this.prisma.purchase.findUnique({
        where: { id: purchaseId },
      });

      if (!purchase) {
        throw new NotFoundException(`Purchase with ID ${purchaseId} not found`);
      }

      return await this.prisma.purchaseItem.findMany({
        where: { purchaseId },
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
        this.purchaseItemErrorOptions,
        'Failed to fetch purchase items',
      );
    }
  }

  // Get purchase items by product ID
  async findByProduct(
    productId: number,
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.PurchaseItemWhereInput;
    },
  ) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      const where: Prisma.PurchaseItemWhereInput = {
        productId,
        ...params?.where,
      };

      return await this.prisma.purchaseItem.findMany({
        skip: params?.skip,
        take: params?.take,
        where,
        include: {
          purchase: {
            include: {
              supplier: true,
              branch: true,
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
        this.purchaseItemErrorOptions,
        'Failed to fetch product purchase items',
      );
    }
  }

  // Update a purchase item
  async update(
    id: number,
    data: {
      quantity?: number;
      unitCost?: number;
    },
  ) {
    try {
      const purchaseItem = await this.prisma.purchaseItem.findUnique({
        where: { id },
      });

      if (!purchaseItem) {
        throw new NotFoundException(`Purchase item with ID ${id} not found`);
      }

      const updateData: any = {};
      if (data.quantity !== undefined) updateData.quantity = data.quantity;
      if (data.unitCost !== undefined) updateData.unitCost = data.unitCost;

      // Recalculate subtotal if quantity or unitCost changes
      if (data.quantity !== undefined || data.unitCost !== undefined) {
        const finalQuantity =
          data.quantity !== undefined ? data.quantity : purchaseItem.quantity;
        const finalUnitCost =
          data.unitCost !== undefined
            ? Number(data.unitCost)
            : Number(purchaseItem.unitCost);
        updateData.subtotal = finalQuantity * finalUnitCost;
      }

      return await this.prisma.purchaseItem.update({
        where: { id },
        data: updateData,
        include: {
          purchase: {
            include: {
              supplier: true,
              branch: true,
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
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.purchaseItemErrorOptions,
        `Failed to update purchase item with ID ${id}`,
      );
    }
  }

  // Delete a purchase item
  async remove(id: number) {
    try {
      const purchaseItem = await this.prisma.purchaseItem.findUnique({
        where: { id },
      });

      if (!purchaseItem) {
        throw new NotFoundException(`Purchase item with ID ${id} not found`);
      }

      return await this.prisma.purchaseItem.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.purchaseItemErrorOptions,
        `Failed to delete purchase item with ID ${id}`,
      );
    }
  }

  // Get purchase item statistics
  async getProductPurchaseStats(
    productId: number,
    startDate?: Date,
    endDate?: Date,
  ) {
    try {
      const where: Prisma.PurchaseItemWhereInput = {
        productId,
        purchase: {
          //   status: { not: 'CANCELLED' },
          ...(startDate &&
            endDate && {
              purchaseDate: {
                gte: startDate,
                lte: endDate,
              },
            }),
        },
      };

      const purchaseItems = await this.prisma.purchaseItem.findMany({
        where,
        include: {
          purchase: true,
        },
      });

      const totalQuantity = purchaseItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      const totalAmount = purchaseItems.reduce(
        (sum, item) => sum + Number(item.subtotal),
        0,
      );
      const averageUnitCost =
        totalQuantity > 0 ? totalAmount / totalQuantity : 0;

      // Get purchase frequency by month
      const monthlyStats = await this.prisma.purchaseItem.groupBy({
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
        averageUnitCost,
        purchaseCount: purchaseItems.length,
        monthlyStats: monthlyStats[0] || null,
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.purchaseItemErrorOptions,
        'Failed to fetch purchase item statistics',
      );
    }
  }

  // Get top purchased products
  async getTopPurchasedProducts(
    branchId?: number,
    limit: number = 10,
    startDate?: Date,
    endDate?: Date,
  ) {
    try {
      const where: Prisma.PurchaseItemWhereInput = {
        purchase: {
          //   status: { not: 'CANCELLED' },
          ...(branchId && { branchId }),
          ...(startDate &&
            endDate && {
              purchaseDate: {
                gte: startDate,
                lte: endDate,
              },
            }),
        },
      };

      const topProducts = await this.prisma.purchaseItem.groupBy({
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
          totalAmount: item._sum.subtotal,
          purchaseCount: item._count.id,
        };
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.purchaseItemErrorOptions,
        'Failed to fetch top purchased products',
      );
    }
  }
}
