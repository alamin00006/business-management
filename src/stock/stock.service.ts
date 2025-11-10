import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from '../prisma/prisma-error.utils';

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  // Stock-specific error configuration
  private readonly stockErrorOptions = {
    entity: 'stock',
    uniqueFieldMap: {
      productId_branchId:
        'Stock record for this product and branch already exists',
    },
    foreignKeyMap: {
      productId: 'Product does not exist',
      branchId: 'Branch does not exist',
    },
    customMessages: {
      P2003: 'Referenced product or branch does not exist',
      P2002:
        'Stock record for this product and branch combination already exists',
    },
  };

  // Create or update stock
  async upsert(data: {
    productId: number;
    branchId: number;
    quantity: number;
  }) {
    try {
      return await this.prisma.stock.upsert({
        where: {
          productId_branchId: {
            productId: data.productId,
            branchId: data.branchId,
          },
        },
        update: {
          quantity: data.quantity,
        },
        create: {
          productId: data.productId,
          branchId: data.branchId,
          quantity: data.quantity,
        },
        include: {
          product: true,
          branch: true,
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.stockErrorOptions,
        'Failed to update stock',
      );
    }
  }

  // Increment stock quantity
  async increment(data: {
    productId: number;
    branchId: number;
    quantity: number;
  }) {
    try {
      return await this.prisma.stock.upsert({
        where: {
          productId_branchId: {
            productId: data.productId,
            branchId: data.branchId,
          },
        },
        update: {
          quantity: {
            increment: data.quantity,
          },
        },
        create: {
          productId: data.productId,
          branchId: data.branchId,
          quantity: data.quantity,
        },
        include: {
          product: true,
          branch: true,
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.stockErrorOptions,
        'Failed to increment stock',
      );
    }
  }

  // Decrement stock quantity
  async decrement(data: {
    productId: number;
    branchId: number;
    quantity: number;
  }) {
    try {
      const stock = await this.prisma.stock.findUnique({
        where: {
          productId_branchId: {
            productId: data.productId,
            branchId: data.branchId,
          },
        },
      });

      if (!stock) {
        throw new NotFoundException('Stock record not found');
      }

      if (stock.quantity < data.quantity) {
        throw new BadRequestException('Insufficient stock quantity');
      }

      return await this.prisma.stock.update({
        where: {
          productId_branchId: {
            productId: data.productId,
            branchId: data.branchId,
          },
        },
        data: {
          quantity: {
            decrement: data.quantity,
          },
        },
        include: {
          product: true,
          branch: true,
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
        this.stockErrorOptions,
        'Failed to decrement stock',
      );
    }
  }

  // Get all stocks with filters
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.StockWhereInput;
    orderBy?: Prisma.StockOrderByWithRelationInput;
  }) {
    try {
      const { skip, take, where, orderBy } = params;
      return await this.prisma.stock.findMany({
        skip,
        take,
        where,
        orderBy: orderBy || { updatedAt: 'desc' },
        include: {
          product: {
            include: {
              category: true,
              supplier: true,
              brand: true,
            },
          },
          branch: true,
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.stockErrorOptions,
        'Failed to fetch stocks',
      );
    }
  }

  // Get stock by ID
  async findOne(id: number) {
    try {
      const stock = await this.prisma.stock.findUnique({
        where: { id },
        include: {
          product: {
            include: {
              category: true,
              supplier: true,
              brand: true,
            },
          },
          branch: true,
        },
      });

      if (!stock) {
        throw new NotFoundException(`Stock with ID ${id} not found`);
      }

      return stock;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.stockErrorOptions,
        `Failed to fetch stock with ID ${id}`,
      );
    }
  }

  // Get stock by product and branch
  async findByProductAndBranch(productId: number, branchId: number) {
    try {
      const stock = await this.prisma.stock.findUnique({
        where: {
          productId_branchId: {
            productId,
            branchId,
          },
        },
        include: {
          product: {
            include: {
              category: true,
              supplier: true,
              brand: true,
            },
          },
          branch: true,
        },
      });

      if (!stock) {
        throw new NotFoundException(
          `Stock not found for product ${productId} in branch ${branchId}`,
        );
      }

      return stock;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.stockErrorOptions,
        'Failed to fetch stock',
      );
    }
  }

  // Get stocks by branch
  async findByBranch(
    branchId: number,
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.StockWhereInput;
    },
  ) {
    try {
      const where: Prisma.StockWhereInput = {
        branchId,
        ...params?.where,
      };

      return await this.prisma.stock.findMany({
        skip: params?.skip,
        take: params?.take,
        where,
        include: {
          product: {
            include: {
              category: true,
              supplier: true,
              brand: true,
            },
          },
          branch: true,
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.stockErrorOptions,
        'Failed to fetch branch stocks',
      );
    }
  }

  // Get stocks by product
  async findByProduct(productId: number) {
    try {
      return await this.prisma.stock.findMany({
        where: { productId },
        include: {
          product: {
            include: {
              category: true,
              supplier: true,
              brand: true,
            },
          },
          branch: true,
        },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.stockErrorOptions,
        'Failed to fetch product stocks',
      );
    }
  }

  // Update stock quantity
  async update(id: number, data: Prisma.StockUpdateInput) {
    try {
      const stockExists = await this.prisma.stock.findUnique({
        where: { id },
      });

      if (!stockExists) {
        throw new NotFoundException(`Stock with ID ${id} not found`);
      }

      return await this.prisma.stock.update({
        where: { id },
        data,
        include: {
          product: true,
          branch: true,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.stockErrorOptions,
        `Failed to update stock with ID ${id}`,
      );
    }
  }

  // Delete stock
  async remove(id: number) {
    try {
      const stock = await this.prisma.stock.findUnique({
        where: { id },
      });

      if (!stock) {
        throw new NotFoundException(`Stock with ID ${id} not found`);
      }

      return await this.prisma.stock.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.stockErrorOptions,
        `Failed to delete stock with ID ${id}`,
      );
    }
  }

  // Get low stock items for a branch
  async findLowStock(branchId: number) {
    try {
      return await this.prisma.stock.findMany({
        where: {
          branchId,
          quantity: {
            lte: this.prisma.stock.fields.quantity, // This won't work directly, need alternative
          },
        },
        include: {
          product: {
            include: {
              category: true,
              supplier: true,
              brand: true,
            },
          },
          branch: true,
        },
        orderBy: { quantity: 'asc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.stockErrorOptions,
        'Failed to fetch low stock items',
      );
    }
  }

  // Get total stock value for a branch
  async getBranchStockValue(branchId: number) {
    try {
      const stocks = await this.prisma.stock.findMany({
        where: { branchId },
        include: {
          product: true,
        },
      });

      const totalValue = stocks.reduce((sum, stock) => {
        return sum + stock.quantity * Number(stock.product.costPrice);
      }, 0);

      return {
        branchId,
        totalValue,
        totalItems: stocks.length,
        totalQuantity: stocks.reduce((sum, stock) => sum + stock.quantity, 0),
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.stockErrorOptions,
        'Failed to calculate stock value',
      );
    }
  }

  // Bulk update stocks (for imports or bulk operations)
  async bulkUpdate(
    stocks: Array<{
      productId: number;
      branchId: number;
      quantity: number;
    }>,
  ) {
    try {
      const transactions = stocks.map((stock) =>
        this.prisma.stock.upsert({
          where: {
            productId_branchId: {
              productId: stock.productId,
              branchId: stock.branchId,
            },
          },
          update: {
            quantity: stock.quantity,
          },
          create: {
            productId: stock.productId,
            branchId: stock.branchId,
            quantity: stock.quantity,
          },
        }),
      );

      return await this.prisma.$transaction(transactions);
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.stockErrorOptions,
        'Failed to bulk update stocks',
      );
    }
  }
}
