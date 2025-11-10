import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from '../prisma/prisma-error.utils';

@Injectable()
export class InventoryLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  // Inventory log-specific error configuration
  private readonly inventoryLogErrorOptions = {
    entity: 'inventory log',
    foreignKeyMap: {
      productId: 'Product does not exist',
      branchId: 'Branch does not exist',
      createdById: 'User does not exist',
    },
    customMessages: {
      P2003: 'Referenced product, branch, or user does not exist',
    },
  };

  // Create an inventory log entry
  async create(data: {
    productId: number;
    branchId: number;
    changeType: string;
    quantityChange: number;
    previousStock: number;
    newStock: number;
    referenceType: string;
    referenceId?: number;
    createdById: number;
    remarks?: string;
  }) {
    try {
      return await this.prisma.inventoryLog.create({
        data: {
          productId: data.productId,
          branchId: data.branchId,
          changeType: data.changeType as any,
          quantityChange: data.quantityChange,
          previousStock: data.previousStock,
          newStock: data.newStock,
          referenceType: data.referenceType as any,
          referenceId: data.referenceId,
          createdById: data.createdById,
        },
        include: {
          product: {
            include: {
              category: true,
              brand: true,
            },
          },
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
        this.inventoryLogErrorOptions,
        'Failed to create inventory log',
      );
    }
  }

  // Get all inventory logs with filters
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.InventoryLogWhereInput;
    orderBy?: Prisma.InventoryLogOrderByWithRelationInput;
  }) {
    try {
      const { skip, take, where, orderBy } = params;
      return await this.prisma.inventoryLog.findMany({
        skip,
        take,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
        include: {
          product: {
            include: {
              category: true,
              brand: true,
            },
          },
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
        this.inventoryLogErrorOptions,
        'Failed to fetch inventory logs',
      );
    }
  }

  // Get a single inventory log by ID
  async findOne(id: number) {
    try {
      const inventoryLog = await this.prisma.inventoryLog.findUnique({
        where: { id },
        include: {
          product: {
            include: {
              category: true,
              brand: true,
              supplier: true,
            },
          },
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

      if (!inventoryLog) {
        throw new NotFoundException(`Inventory log with ID ${id} not found`);
      }

      return inventoryLog;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.inventoryLogErrorOptions,
        `Failed to fetch inventory log with ID ${id}`,
      );
    }
  }

  // Get inventory logs by product
  async findByProduct(
    productId: number,
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.InventoryLogWhereInput;
    },
  ) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      const where: Prisma.InventoryLogWhereInput = {
        productId,
        ...params?.where,
      };

      return await this.prisma.inventoryLog.findMany({
        skip: params?.skip,
        take: params?.take,
        where,
        include: {
          product: {
            include: {
              category: true,
              brand: true,
            },
          },
          branch: true,
          createdBy: {
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
        this.inventoryLogErrorOptions,
        'Failed to fetch product inventory logs',
      );
    }
  }

  // Get inventory logs by branch
  async findByBranch(
    branchId: number,
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.InventoryLogWhereInput;
    },
  ) {
    try {
      const branch = await this.prisma.branch.findUnique({
        where: { id: branchId },
      });

      if (!branch) {
        throw new NotFoundException(`Branch with ID ${branchId} not found`);
      }

      const where: Prisma.InventoryLogWhereInput = {
        branchId,
        ...params?.where,
      };

      return await this.prisma.inventoryLog.findMany({
        skip: params?.skip,
        take: params?.take,
        where,
        include: {
          product: {
            include: {
              category: true,
              brand: true,
            },
          },
          branch: true,
          createdBy: {
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
        this.inventoryLogErrorOptions,
        'Failed to fetch branch inventory logs',
      );
    }
  }

  // Get inventory logs by reference (purchase, sale, adjustment, etc.)
  async findByReference(referenceType: string, referenceId: number) {
    try {
      return await this.prisma.inventoryLog.findMany({
        where: {
          referenceType: referenceType as any,
          referenceId,
        },
        include: {
          product: {
            include: {
              category: true,
              brand: true,
            },
          },
          branch: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.inventoryLogErrorOptions,
        'Failed to fetch reference inventory logs',
      );
    }
  }

  // Get inventory movement summary
  async getMovementSummary(
    productId: number,
    branchId: number,
    startDate?: Date,
    endDate?: Date,
  ) {
    try {
      const where: Prisma.InventoryLogWhereInput = {
        productId,
        branchId,
        ...(startDate &&
          endDate && {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
      };

      const logs = await this.prisma.inventoryLog.findMany({
        where,
        orderBy: { createdAt: 'asc' },
      });

      const summary = {
        productId,
        branchId,
        totalIn: 0,
        totalOut: 0,
        netChange: 0,
        startStock: 0,
        endStock: 0,
        movementCount: logs.length,
        byType: {} as Record<string, { count: number; quantity: number }>,
        byReference: {} as Record<string, { count: number; quantity: number }>,
      };

      if (logs.length > 0) {
        summary.startStock = logs[0].previousStock;
        summary.endStock = logs[logs.length - 1].newStock;

        logs.forEach((log) => {
          // Calculate totals
          if (log.quantityChange > 0) {
            summary.totalIn += log.quantityChange;
          } else {
            summary.totalOut += Math.abs(log.quantityChange);
          }
          summary.netChange += log.quantityChange;

          // Group by change type
          if (!summary.byType[log.changeType]) {
            summary.byType[log.changeType] = { count: 0, quantity: 0 };
          }
          summary.byType[log.changeType].count++;
          summary.byType[log.changeType].quantity += log.quantityChange;

          // Group by reference type
          if (log.referenceType) {
            if (!summary.byReference[log.referenceType]) {
              summary.byReference[log.referenceType] = {
                count: 0,
                quantity: 0,
              };
            }
            summary.byReference[log.referenceType].count++;
            summary.byReference[log.referenceType].quantity +=
              log.quantityChange;
          }
        });
      }

      return summary;
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.inventoryLogErrorOptions,
        'Failed to fetch inventory movement summary',
      );
    }
  }

  // Get stock level history for a product
  async getStockHistory(
    productId: number,
    branchId: number,
    days: number = 30,
  ) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      return await this.prisma.inventoryLog.findMany({
        where: {
          productId,
          branchId,
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          id: true,
          changeType: true,
          quantityChange: true,
          previousStock: true,
          newStock: true,
          referenceType: true,
          referenceId: true,
          createdAt: true,
          createdBy: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.inventoryLogErrorOptions,
        'Failed to fetch stock history',
      );
    }
  }

  // Get low stock alerts history
  async getLowStockAlerts(branchId?: number, days: number = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where: Prisma.InventoryLogWhereInput = {
        // changeType: 'ADJUSTMENT',
        newStock: {
          lt: this.prisma.inventoryLog.fields.previousStock, // This indicates stock decrease
        },
        createdAt: {
          gte: startDate,
        },
        ...(branchId && { branchId }),
      };

      return await this.prisma.inventoryLog.findMany({
        where,
        include: {
          product: {
            include: {
              category: true,
            },
          },
          branch: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.inventoryLogErrorOptions,
        'Failed to fetch low stock alerts',
      );
    }
  }

  // Get inventory valuation changes
  async getValuationChanges(branchId: number, startDate: Date, endDate: Date) {
    try {
      const logs = await this.prisma.inventoryLog.findMany({
        where: {
          branchId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          product: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      // Group by product and calculate value changes
      const productValuations = new Map();

      logs.forEach((log) => {
        const productId = log.productId;
        if (!productValuations.has(productId)) {
          productValuations.set(productId, {
            product: log.product,
            quantityChange: 0,
            valueChange: 0,
            costPrice: Number(log.product.costPrice),
          });
        }

        const valuation = productValuations.get(productId);
        valuation.quantityChange += log.quantityChange;
        valuation.valueChange += log.quantityChange * valuation.costPrice;
      });

      return Array.from(productValuations.values());
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.inventoryLogErrorOptions,
        'Failed to fetch valuation changes',
      );
    }
  }

  // Get inventory audit report
  async getAuditReport(branchId?: number, startDate?: Date, endDate?: Date) {
    try {
      const where: Prisma.InventoryLogWhereInput = {
        ...(branchId && { branchId }),
        ...(startDate &&
          endDate && {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
      };

      const logs = await this.prisma.inventoryLog.findMany({
        where,
        include: {
          product: {
            include: {
              category: true,
            },
          },
          branch: true,
          createdBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const report = {
        totalMovements: logs.length,
        totalProducts: new Set(logs.map((log) => log.productId)).size,
        totalIn: logs
          .filter((log) => log.quantityChange > 0)
          .reduce((sum, log) => sum + log.quantityChange, 0),
        totalOut: logs
          .filter((log) => log.quantityChange < 0)
          .reduce((sum, log) => sum + Math.abs(log.quantityChange), 0),
        movementsByType: {} as Record<string, number>,
        movementsByUser: {} as Record<string, number>,
        movementsByProduct: {} as Record<string, number>,
      };

      logs.forEach((log) => {
        // Count by type
        report.movementsByType[log.changeType] =
          (report.movementsByType[log.changeType] || 0) + 1;

        // Count by user
        const userName = log.createdBy.name;
        report.movementsByUser[userName] =
          (report.movementsByUser[userName] || 0) + 1;

        // Count by product
        const productName = log.product.name;
        report.movementsByProduct[productName] =
          (report.movementsByProduct[productName] || 0) + 1;
      });

      return {
        summary: report,
        details: logs,
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.inventoryLogErrorOptions,
        'Failed to generate audit report',
      );
    }
  }

  // Delete inventory log (should be used carefully - mainly for admin purposes)
  async remove(id: number) {
    try {
      const inventoryLog = await this.prisma.inventoryLog.findUnique({
        where: { id },
      });

      if (!inventoryLog) {
        throw new NotFoundException(`Inventory log with ID ${id} not found`);
      }

      return await this.prisma.inventoryLog.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.inventoryLogErrorOptions,
        `Failed to delete inventory log with ID ${id}`,
      );
    }
  }
}
