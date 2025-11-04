import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategoryResponseDto } from './dto/product-category-response.dto';
import { CategoryStatus } from './dto/create-product-category.dto';
import { CategoryReorderDto } from './dto/category-reorder.dto';

@Injectable()
export class ProductCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  private readonly categoryErrorOptions = {
    entity: 'product category',
    uniqueFieldMap: {
      slug: 'Category with this slug already exists',
      name: 'Category with this name already exists',
    },
    customMessages: {
      P2003: 'Referenced entity does not exist',
      P2025: 'Category not found',
    },
  };

  private toResponseDto(category: any): ProductCategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      sortOrder: category.sortOrder,
      status: category.status as CategoryStatus,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      productCount: category._count?.products,
      products: category.products?.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        status: product.status,
        price: product.price,
        images: product.images,
      })),
    };
  }

  // Create a new category
  async create(
    createCategoryDto: CreateProductCategoryDto,
  ): Promise<ProductCategoryResponseDto> {
    try {
      // Get max sortOrder to place new category at the end
      const maxSortOrder = await this.prisma.productCategory.aggregate({
        _max: { sortOrder: true },
      });

      const category = await this.prisma.productCategory.create({
        data: {
          ...createCategoryDto,
          sortOrder:
            createCategoryDto.sortOrder ??
            (maxSortOrder._max.sortOrder || 0) + 1,
          status: createCategoryDto.status || CategoryStatus.ACTIVE,
        },
      });

      return this.toResponseDto(category);
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        'Failed to create product category',
      );
    }
  }

  // Get all categories
  async findAll(
    includeProducts: boolean = false,
  ): Promise<ProductCategoryResponseDto[]> {
    try {
      const categories = await this.prisma.productCategory.findMany({
        include: {
          products: includeProducts
            ? {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                },
                where: { status: 'active' },
              }
            : false,
          _count: {
            select: {
              products: {
                where: { status: 'active' },
              },
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      });

      return categories.map((category) => this.toResponseDto(category));
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        'Failed to fetch product categories',
      );
    }
  }

  // Get categories with product counts
  async findAllWithCounts(): Promise<ProductCategoryResponseDto[]> {
    try {
      const categories = await this.prisma.productCategory.findMany({
        include: {
          _count: {
            select: {
              products: {
                where: { status: 'active' },
              },
            },
          },
          products: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
            where: { status: 'active' },
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      });

      return categories.map((category) => this.toResponseDto(category));
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        'Failed to fetch product categories with counts',
      );
    }
  }

  // Get a single category by ID
  async findOne(id: number): Promise<ProductCategoryResponseDto> {
    try {
      const category = await this.prisma.productCategory.findUnique({
        where: { id },
        include: {
          products: {
            select: {
              id: true,
              name: true,
              slug: true,
              //   price: true,
              status: true,
              //   images: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              products: true,
            },
          },
        },
      });

      if (!category) {
        throw new NotFoundException(`Product category with ID ${id} not found`);
      }

      return this.toResponseDto(category);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        `Failed to fetch product category with ID ${id}`,
      );
    }
  }

  // Get category by slug
  async findBySlug(slug: string): Promise<ProductCategoryResponseDto> {
    try {
      const category = await this.prisma.productCategory.findUnique({
        where: { slug },
        include: {
          products: {
            where: { status: 'active' },
            select: {
              id: true,
              name: true,
              slug: true,
              //   price: true,
              //   images: true,
              description: true,
              brand: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              products: {
                where: { status: 'active' },
              },
            },
          },
        },
      });

      if (!category) {
        throw new NotFoundException(
          `Product category with slug ${slug} not found`,
        );
      }

      return this.toResponseDto(category);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        `Failed to fetch product category with slug ${slug}`,
      );
    }
  }

  // Update category details
  async update(
    id: number,
    updateCategoryDto: UpdateProductCategoryDto,
  ): Promise<ProductCategoryResponseDto> {
    try {
      // Check if category exists
      const categoryExists = await this.prisma.productCategory.findUnique({
        where: { id },
      });

      if (!categoryExists) {
        throw new NotFoundException(`Product category with ID ${id} not found`);
      }

      const category = await this.prisma.productCategory.update({
        where: { id },
        data: {
          ...updateCategoryDto,
          updatedAt: new Date(),
        },
      });

      return this.toResponseDto(category);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        `Failed to update product category with ID ${id}`,
      );
    }
  }

  // Delete category
  async remove(id: number): Promise<void> {
    try {
      // Check if category exists
      const category = await this.prisma.productCategory.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      });

      if (!category) {
        throw new NotFoundException(`Product category with ID ${id} not found`);
      }

      // Check if category has products
      if (category._count.products > 0) {
        throw new ConflictException(
          `Cannot delete category with products. Please reassign or delete the products first.`,
        );
      }

      await this.prisma.productCategory.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        `Failed to delete product category with ID ${id}`,
      );
    }
  }

  // Reorder categories
  async reorder(reorderDto: CategoryReorderDto): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const item of reorderDto.categories) {
          await tx.productCategory.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
          });
        }
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        'Failed to reorder categories',
      );
    }
  }

  // Search categories
  async search(query: string): Promise<ProductCategoryResponseDto[]> {
    try {
      const categories = await this.prisma.productCategory.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { slug: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          _count: {
            select: {
              products: {
                where: { status: 'active' },
              },
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      });

      return categories.map((category) => this.toResponseDto(category));
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        'Failed to search product categories',
      );
    }
  }

  // Get categories by status
  async findByStatus(
    status: CategoryStatus,
  ): Promise<ProductCategoryResponseDto[]> {
    try {
      const categories = await this.prisma.productCategory.findMany({
        where: { status },
        include: {
          _count: {
            select: {
              products: {
                where: { status: 'active' },
              },
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      });

      return categories.map((category) => this.toResponseDto(category));
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.categoryErrorOptions,
        `Failed to fetch ${status} product categories`,
      );
    }
  }

  // Get active categories only (convenience method)
  async findActive(): Promise<ProductCategoryResponseDto[]> {
    return this.findByStatus(CategoryStatus.ACTIVE);
  }
}
