import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from '../prisma/prisma-error.utils';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  // Product-specific error configuration
  private readonly productErrorOptions = {
    entity: 'product',
    uniqueFieldMap: {
      slug: 'Product slug already exists',
      sku: 'Product SKU already exists',
      name: 'Product name already exists',
    },
    foreignKeyMap: {
      categoryId: 'Product category does not exist',
      supplierId: 'Supplier does not exist',
      brandId: 'Brand does not exist',
    },
    customMessages: {
      P2003: 'Referenced category, supplier, or brand does not exist',
    },
  };

  // Create a new product
  async create(data: Prisma.ProductCreateInput) {
    try {
      return await this.prisma.product.create({
        data,
        include: {
          category: true,
          supplier: true,
          brand: true,
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        'Failed to create product',
      );
    }
  }

  // Get all products with pagination and filters
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ProductWhereInput;
    orderBy?: Prisma.ProductOrderByWithRelationInput;
  }) {
    try {
      const { skip, take, where, orderBy } = params;
      return await this.prisma.product.findMany({
        skip,
        take,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
        include: {
          category: true,
          supplier: true,
          brand: true,
          stocks: {
            include: {
              branch: true,
            },
          },
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        'Failed to fetch products',
      );
    }
  }

  // Get a single product by ID
  async findOne(id: number) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
          supplier: true,
          brand: true,
          stocks: {
            include: {
              branch: true,
            },
          },
          purchaseItems: {
            include: {
              purchase: true,
            },
          },
          saleItems: {
            include: {
              sale: true,
            },
          },
          inventoryLogs: true,
          saleReturns: true,
        },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      return product;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        `Failed to fetch product with ID ${id}`,
      );
    }
  }

  // Get product by slug
  async findBySlug(slug: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { slug },
        include: {
          category: true,
          supplier: true,
          brand: true,
          stocks: {
            include: {
              branch: true,
            },
          },
        },
      });

      if (!product) {
        throw new NotFoundException(`Product with slug ${slug} not found`);
      }

      return product;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        `Failed to fetch product with slug ${slug}`,
      );
    }
  }

  // Get product by SKU
  async findBySku(sku: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { sku },
        include: {
          category: true,
          supplier: true,
          brand: true,
          stocks: {
            include: {
              branch: true,
            },
          },
        },
      });

      if (!product) {
        throw new NotFoundException(`Product with SKU ${sku} not found`);
      }

      return product;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        `Failed to fetch product with SKU ${sku}`,
      );
    }
  }

  // Update product details
  async update(id: number, data: Prisma.ProductUpdateInput) {
    try {
      // Check if product exists
      const productExists = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!productExists) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      return await this.prisma.product.update({
        where: { id },
        data,
        include: {
          category: true,
          supplier: true,
          brand: true,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        `Failed to update product with ID ${id}`,
      );
    }
  }

  // Delete product
  async remove(id: number) {
    try {
      // Check if product exists
      const product = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      return await this.prisma.product.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        `Failed to delete product with ID ${id}`,
      );
    }
  }

  // Get low stock products (below stock alert quantity)
  async findLowStock(branchId?: number) {
    try {
      const where: Prisma.ProductWhereInput = {
        stocks: {
          some: {
            // quantity: {
            //   lte: this.prisma.product.fields.stockAlertQuantity,
            // },
            ...(branchId && { branchId }),
          },
        },
      };

      return await this.prisma.product.findMany({
        where,
        include: {
          category: true,
          supplier: true,
          brand: true,
          stocks: {
            where: branchId ? { branchId } : undefined,
            include: {
              branch: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        'Failed to fetch low stock products',
      );
    }
  }

  // Search products by name, SKU, or barcode
  async search(query: string, branchId?: number) {
    try {
      const where: Prisma.ProductWhereInput = {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
          { barcode: { contains: query, mode: 'insensitive' } },
        ],
        ...(branchId && {
          stocks: {
            some: { branchId },
          },
        }),
      };

      return await this.prisma.product.findMany({
        where,
        include: {
          category: true,
          supplier: true,
          brand: true,
          stocks: {
            where: branchId ? { branchId } : undefined,
            include: {
              branch: true,
            },
          },
        },
        take: 20,
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        'Failed to search products',
      );
    }
  }

  // Get product count for dashboard
  async getCount(where?: Prisma.ProductWhereInput) {
    try {
      return await this.prisma.product.count({ where });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.productErrorOptions,
        'Failed to get product count',
      );
    }
  }
}
