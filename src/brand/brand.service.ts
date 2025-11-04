import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandResponseDto } from './dto/brand-response.dto';
import { BrandStatus } from './dto/create-brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  // Brand-specific error configuration
  private readonly brandErrorOptions = {
    entity: 'brand',
    uniqueFieldMap: {
      slug: 'Brand with this slug already exists',
      name: 'Brand with this name already exists',
    },
    customMessages: {
      P2003: 'Referenced entity does not exist',
      P2025: 'Brand not found',
    },
  };

  private toResponseDto(brand: any): BrandResponseDto {
    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      description: brand.description,
      logo: brand.logo,
      status: brand.status as BrandStatus,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
    };
  }

  // Create a new brand
  async create(createBrandDto: CreateBrandDto): Promise<BrandResponseDto> {
    try {
      const brand = await this.prisma.brand.create({
        data: {
          ...createBrandDto,
          status: createBrandDto.status || BrandStatus.ACTIVE,
        },
      });

      return this.toResponseDto(brand);
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        'Failed to create brand',
      );
    }
  }

  // Get all brands
  async findAll(): Promise<BrandResponseDto[]> {
    try {
      const brands = await this.prisma.brand.findMany({
        include: {
          products: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return brands.map((brand) => this.toResponseDto(brand));
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        'Failed to fetch brands',
      );
    }
  }

  // Get a single brand by ID
  async findOne(id: number): Promise<BrandResponseDto> {
    try {
      const brand = await this.prisma.brand.findUnique({
        where: { id },
        include: {
          products: {
            select: {
              id: true,
              name: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10, // Limit to recent products
          },
        },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with ID ${id} not found`);
      }

      return this.toResponseDto(brand);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        `Failed to fetch brand with ID ${id}`,
      );
    }
  }

  // Get brand by slug
  async findBySlug(slug: string): Promise<BrandResponseDto> {
    try {
      const brand = await this.prisma.brand.findUnique({
        where: { slug },
        include: {
          products: {
            where: { status: 'active' },
            select: {
              id: true,
              name: true,
              slug: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with slug ${slug} not found`);
      }

      return this.toResponseDto(brand);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        `Failed to fetch brand with slug ${slug}`,
      );
    }
  }

  // Update brand details
  async update(
    id: number,
    updateBrandDto: UpdateBrandDto,
  ): Promise<BrandResponseDto> {
    try {
      // Check if brand exists
      const brandExists = await this.prisma.brand.findUnique({
        where: { id },
      });

      if (!brandExists) {
        throw new NotFoundException(`Brand with ID ${id} not found`);
      }

      const brand = await this.prisma.brand.update({
        where: { id },
        data: {
          ...updateBrandDto,
          updatedAt: new Date(),
        },
      });

      return this.toResponseDto(brand);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        `Failed to update brand with ID ${id}`,
      );
    }
  }

  // Delete brand
  async remove(id: number): Promise<void> {
    try {
      // Check if brand exists
      const brand = await this.prisma.brand.findUnique({
        where: { id },
      });

      if (!brand) {
        throw new NotFoundException(`Brand with ID ${id} not found`);
      }

      await this.prisma.brand.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        `Failed to delete brand with ID ${id}`,
      );
    }
  }

  // Search brands
  async search(query: string): Promise<BrandResponseDto[]> {
    try {
      const brands = await this.prisma.brand.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { slug: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      return brands.map((brand) => this.toResponseDto(brand));
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        'Failed to search brands',
      );
    }
  }

  // Get brands by status
  async findByStatus(status: BrandStatus): Promise<BrandResponseDto[]> {
    try {
      const brands = await this.prisma.brand.findMany({
        where: { status },
        orderBy: { createdAt: 'desc' },
      });

      return brands.map((brand) => this.toResponseDto(brand));
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.brandErrorOptions,
        `Failed to fetch ${status} brands`,
      );
    }
  }
}
