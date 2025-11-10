import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from '../prisma/prisma-error.utils';

@Injectable()
export class PurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  // Purchase-specific error configuration
  private readonly purchaseErrorOptions = {
    entity: 'purchase',
    uniqueFieldMap: {
      invoiceNo: 'Invoice number already exists',
    },
    foreignKeyMap: {
      supplierId: 'Supplier does not exist',
      branchId: 'Branch does not exist',
      createdById: 'User does not exist',
    },
    customMessages: {
      P2003: 'Referenced supplier, branch, or user does not exist',
      P2002: 'Invoice number must be unique',
    },
  };

  // Create a new purchase with items
  async create(data: {
    supplierId: number;
    branchId: number;
    invoiceNo: string;
    purchaseDate: Date;
    discount?: number;
    tax?: number;
    paymentMethod?: string;
    createdById: number;
    items: Array<{
      productId: number;
      quantity: number;
      unitCost: number;
      total: number;
    }>;
  }) {
    try {
      // Calculate totals
      const itemsTotal = data.items.reduce(
        (sum, item) => sum + Number(item.total),
        0,
      );
      const discountAmount = Number(data.discount) || 0;
      const taxAmount = Number(data.tax) || 0;
      const grandTotal = itemsTotal - discountAmount + taxAmount;

      return await this.prisma.$transaction(async (tx) => {
        // Create purchase
        const purchase = await tx.purchase.create({
          data: {
            supplierId: data.supplierId,
            branchId: data.branchId,
            invoiceNo: data.invoiceNo,
            purchaseDate: data.purchaseDate,
            totalAmount: itemsTotal,
            discount: discountAmount,
            tax: taxAmount,
            grandTotal: grandTotal,
            paymentMethod: data.paymentMethod as any,
            createdById: data.createdById,
            // purchaseItems: {
            //   create: data.items.map((item) => ({
            //     productId: item.productId,
            //     quantity: item.quantity,
            //     unitCost: item.unitCost,
            //     total: item.total,
            //   })),
            // },
          },
          include: {
            supplier: true,
            branch: true,
            createdBy: true,
            purchaseItems: {
              include: {
                product: {
                  include: {
                    category: true,
                  },
                },
              },
            },
          },
        });

        // Update stock quantities
        for (const item of data.items) {
          await tx.stock.upsert({
            where: {
              productId_branchId: {
                productId: item.productId,
                branchId: data.branchId,
              },
            },
            update: {
              quantity: {
                increment: item.quantity,
              },
            },
            create: {
              productId: item.productId,
              branchId: data.branchId,
              quantity: item.quantity,
            },
          });

          // Create inventory log
          //   await tx.inventoryLog.create({
          //     data: {
          //       productId: item.productId,
          //       branchId: data.branchId,
          //       type: 'PURCHASE',
          //       quantity: item.quantity,
          //       referenceId: purchase.id,
          //       referenceType: 'PURCHASE',
          //       remarks: `Purchase - Invoice: ${data.invoiceNo}`,
          //     },
          //   });
        }

        return purchase;
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.purchaseErrorOptions,
        'Failed to create purchase',
      );
    }
  }

  // Get all purchases with filters
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.PurchaseWhereInput;
    orderBy?: Prisma.PurchaseOrderByWithRelationInput;
  }) {
    try {
      const { skip, take, where, orderBy } = params;
      return await this.prisma.purchase.findMany({
        skip,
        take,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
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
          purchaseItems: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
          _count: {
            select: {
              purchaseItems: true,
            },
          },
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.purchaseErrorOptions,
        'Failed to fetch purchases',
      );
    }
  }

  // Get a single purchase by ID
  async findOne(id: number) {
    try {
      const purchase = await this.prisma.purchase.findUnique({
        where: { id },
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
          purchaseItems: {
            include: {
              product: {
                include: {
                  category: true,
                  brand: true,
                },
              },
            },
          },
          inventoryLogs: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!purchase) {
        throw new NotFoundException(`Purchase with ID ${id} not found`);
      }

      return purchase;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.purchaseErrorOptions,
        `Failed to fetch purchase with ID ${id}`,
      );
    }
  }

  // Get purchase by invoice number
  async findByInvoice(invoiceNo: string) {
    try {
      const purchase = await this.prisma.purchase.findUnique({
        where: { invoiceNo },
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
          purchaseItems: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      });

      if (!purchase) {
        throw new NotFoundException(
          `Purchase with invoice number ${invoiceNo} not found`,
        );
      }

      return purchase;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.purchaseErrorOptions,
        `Failed to fetch purchase with invoice ${invoiceNo}`,
      );
    }
  }

  // Update purchase status
  async updateStatus(id: number, status: string, paymentStatus?: string) {
    try {
      const purchase = await this.prisma.purchase.findUnique({
        where: { id },
      });

      if (!purchase) {
        throw new NotFoundException(`Purchase with ID ${id} not found`);
      }

      const updateData: any = { status: status as any };
      if (paymentStatus) {
        updateData.paymentStatus = paymentStatus as any;
      }

      return await this.prisma.purchase.update({
        where: { id },
        data: updateData,
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
          purchaseItems: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
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
        this.purchaseErrorOptions,
        `Failed to update purchase status with ID ${id}`,
      );
    }
  }

  // Update payment status
  async updatePaymentStatus(
    id: number,
    paymentStatus: string,
    paymentMethod?: string,
  ) {
    try {
      const purchase = await this.prisma.purchase.findUnique({
        where: { id },
      });

      if (!purchase) {
        throw new NotFoundException(`Purchase with ID ${id} not found`);
      }

      const updateData: any = { paymentStatus: paymentStatus as any };
      if (paymentMethod) {
        updateData.paymentMethod = paymentMethod as any;
      }

      return await this.prisma.purchase.update({
        where: { id },
        data: updateData,
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
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.purchaseErrorOptions,
        `Failed to update payment status with ID ${id}`,
      );
    }
  }

  // Delete purchase (soft delete by status change)
  async remove(id: number) {
    try {
      const purchase = await this.prisma.purchase.findUnique({
        where: { id },
      });

      if (!purchase) {
        throw new NotFoundException(`Purchase with ID ${id} not found`);
      }

      // Instead of deleting, mark as cancelled
      return await this.prisma.purchase.update({
        where: { id },
        data: {
          status: 'CANCELLED' as any,
          paymentStatus: 'CANCELLED' as any,
        },
        include: {
          supplier: true,
          branch: true,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.purchaseErrorOptions,
        `Failed to cancel purchase with ID ${id}`,
      );
    }
  }

  // Get purchases by supplier
  async findBySupplier(
    supplierId: number,
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.PurchaseWhereInput;
    },
  ) {
    try {
      const where: Prisma.PurchaseWhereInput = {
        supplierId,
        ...params?.where,
      };

      return await this.prisma.purchase.findMany({
        skip: params?.skip,
        take: params?.take,
        where,
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
          purchaseItems: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
        orderBy: { purchaseDate: 'desc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.purchaseErrorOptions,
        'Failed to fetch supplier purchases',
      );
    }
  }

  // Get purchases by branch
  async findByBranch(
    branchId: number,
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.PurchaseWhereInput;
    },
  ) {
    try {
      const where: Prisma.PurchaseWhereInput = {
        branchId,
        ...params?.where,
      };

      return await this.prisma.purchase.findMany({
        skip: params?.skip,
        take: params?.take,
        where,
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
          purchaseItems: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
        orderBy: { purchaseDate: 'desc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.purchaseErrorOptions,
        'Failed to fetch branch purchases',
      );
    }
  }

  // Get purchase statistics
  async getStats(branchId?: number, startDate?: Date, endDate?: Date) {
    try {
      const where: Prisma.PurchaseWhereInput = {
        ...(branchId && { branchId }),
        ...(startDate &&
          endDate && {
            purchaseDate: {
              gte: startDate,
              lte: endDate,
            },
          }),
        // status: { not: 'CANCELLED' },
      };

      const purchases = await this.prisma.purchase.findMany({
        where,
        include: {
          purchaseItems: true,
        },
      });

      const totalPurchases = purchases.length;
      const totalAmount = purchases.reduce(
        (sum, purchase) => sum + Number(purchase.grandTotal),
        0,
      );
      const totalItems = purchases.reduce(
        (sum, purchase) =>
          sum +
          purchase.purchaseItems.reduce(
            (itemSum, item) => itemSum + item.quantity,
            0,
          ),
        0,
      );

      // Group by payment status
      const paymentStats = purchases.reduce((acc, purchase) => {
        acc[purchase.paymentStatus] = (acc[purchase.paymentStatus] || 0) + 1;
        return acc;
      }, {});

      // Group by supplier
      const supplierStats = await this.prisma.purchase.groupBy({
        by: ['supplierId'],
        where,
        _count: {
          id: true,
        },
        _sum: {
          grandTotal: true,
        },
      });

      return {
        totalPurchases,
        totalAmount,
        totalItems,
        averagePurchase: totalPurchases > 0 ? totalAmount / totalPurchases : 0,
        paymentStats,
        supplierStats,
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.purchaseErrorOptions,
        'Failed to fetch purchase statistics',
      );
    }
  }

  // Get recent purchases
  async findRecent(limit: number = 10) {
    try {
      return await this.prisma.purchase.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
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
          purchaseItems: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.purchaseErrorOptions,
        'Failed to fetch recent purchases',
      );
    }
  }

  // Add to PurchaseService class

  // Add item to existing purchase
  async addItemToPurchase(
    purchaseId: number,
    data: {
      productId: number;
      quantity: number;
      unitCost: number;
    },
  ) {
    try {
      const purchase = await this.prisma.purchase.findUnique({
        where: { id: purchaseId },
      });

      if (!purchase) {
        throw new NotFoundException(`Purchase with ID ${purchaseId} not found`);
      }

      const subtotal = Number(data.unitCost) * data.quantity;

      return await this.prisma.$transaction(async (tx) => {
        // Add purchase item
        const purchaseItem = await tx.purchaseItem.create({
          data: {
            purchaseId,
            productId: data.productId,
            quantity: data.quantity,
            unitCost: data.unitCost,
            subtotal: subtotal,
          },
        });

        // Update purchase totals
        const newTotalAmount = Number(purchase.totalAmount) + subtotal;
        const newGrandTotal =
          newTotalAmount - Number(purchase.discount) + Number(purchase.tax);

        await tx.purchase.update({
          where: { id: purchaseId },
          data: {
            totalAmount: newTotalAmount,
            grandTotal: newGrandTotal,
          },
        });

        // Update stock
        await tx.stock.upsert({
          where: {
            productId_branchId: {
              productId: data.productId,
              branchId: purchase.branchId,
            },
          },
          update: {
            quantity: {
              increment: data.quantity,
            },
          },
          create: {
            productId: data.productId,
            branchId: purchase.branchId,
            quantity: data.quantity,
          },
        });

        // Create inventory log
        //   await tx.inventoryLog.create({
        //     data: {
        //       productId: data.productId,
        //       branchId: purchase.branchId,
        //       type: 'PURCHASE',
        //       quantity: data.quantity,
        //       referenceId: purchaseId,
        //       referenceType: 'PURCHASE',
        //       remarks: `Purchase item added - Invoice: ${purchase.invoiceNo}`,
        //     },
        //   });

        return purchaseItem;
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.purchaseErrorOptions,
        'Failed to add item to purchase',
      );
    }
  }

  // Remove item from purchase
  async removeItemFromPurchase(purchaseId: number, itemId: number) {
    try {
      const purchase = await this.prisma.purchase.findUnique({
        where: { id: purchaseId },
      });

      if (!purchase) {
        throw new NotFoundException(`Purchase with ID ${purchaseId} not found`);
      }

      const purchaseItem = await this.prisma.purchaseItem.findUnique({
        where: { id: itemId },
      });

      if (!purchaseItem || purchaseItem.purchaseId !== purchaseId) {
        throw new NotFoundException(
          `Purchase item with ID ${itemId} not found in purchase ${purchaseId}`,
        );
      }

      return await this.prisma.$transaction(async (tx) => {
        // Remove purchase item
        const deletedItem = await tx.purchaseItem.delete({
          where: { id: itemId },
        });

        // Update purchase totals
        const newTotalAmount =
          Number(purchase.totalAmount) - Number(purchaseItem.subtotal);
        const newGrandTotal =
          newTotalAmount - Number(purchase.discount) + Number(purchase.tax);

        await tx.purchase.update({
          where: { id: purchaseId },
          data: {
            totalAmount: newTotalAmount,
            grandTotal: newGrandTotal,
          },
        });

        // Update stock (decrement)
        await tx.stock.update({
          where: {
            productId_branchId: {
              productId: purchaseItem.productId,
              branchId: purchase.branchId,
            },
          },
          data: {
            quantity: {
              decrement: purchaseItem.quantity,
            },
          },
        });

        // Create inventory log for removal
        //   await tx.inventoryLog.create({
        //     data: {
        //       productId: purchaseItem.productId,
        //       branchId: purchase.branchId,
        //       type: 'ADJUSTMENT',
        //       quantity: -purchaseItem.quantity,
        //       referenceId: purchaseId,
        //       referenceType: 'PURCHASE',
        //       remarks: `Purchase item removed - Invoice: ${purchase.invoiceNo}`,
        //     },
        //   });

        return deletedItem;
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.purchaseErrorOptions,
        'Failed to remove item from purchase',
      );
    }
  }

  // Add this method to your existing PurchaseService

  // Manual inventory log creation for purchases
  async createPurchaseInventoryLog(
    purchaseId: number,
    data: {
      productId: number;
      quantity: number;
      createdById: number;
    },
  ) {
    try {
      const purchase = await this.prisma.purchase.findUnique({
        where: { id: purchaseId },
        include: {
          purchaseItems: true,
        },
      });

      if (!purchase) {
        throw new NotFoundException(`Purchase with ID ${purchaseId} not found`);
      }

      const stock = await this.prisma.stock.findUnique({
        where: {
          productId_branchId: {
            productId: data.productId,
            branchId: purchase.branchId,
          },
        },
      });

      const previousStock = stock?.quantity || 0;
      const newStock = previousStock + data.quantity;

      // return await this.prisma.inventoryLog.create({
      //   data: {
      //     productId: data.productId,
      //     branchId: purchase.branchId,
      //     changeType: 'PURCHASE',
      //     quantityChange: data.quantity,
      //     previousStock,
      //     newStock,
      //     referenceType: 'PURCHASE',
      //     referenceId: purchaseId,
      //     createdById: data.createdById,
      //   },
      //   include: {
      //     product: true,
      //     branch: true,
      //     createdBy: {
      //       select: {
      //         id: true,
      //         name: true,
      //         email: true,
      //       },
      //     },
      //   },
      // });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.purchaseErrorOptions,
        'Failed to create purchase inventory log',
      );
    }
  }
}
