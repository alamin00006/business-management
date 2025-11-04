// src/suppliers/suppliers.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import {
  SupplierResponseDto,
  SupplierProductDto,
  SupplierPurchaseDto,
} from './dto/supplier-response.dto';
import { SupplierStatus } from './dto/create-supplier.dto';
import { SupplierStatsResponseDto } from './dto/supplier-stats.dto';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  // Supplier-specific error configuration
  private readonly supplierErrorOptions = {
    entity: 'supplier',
    uniqueFieldMap: {
      supplierCode: 'Supplier with this code already exists',
      email: 'Supplier with this email already exists',
      phone: 'Supplier with this phone number already exists',
      gstNumber: 'Supplier with this GST number already exists',
    },
    customMessages: {
      P2003: 'Referenced entity does not exist',
      P2025: 'Supplier not found',
    },
  };

  private toResponseDto(supplier: any): SupplierResponseDto {
    return {
      id: supplier.id,
      supplierCode: supplier.supplierCode,
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      gstNumber: supplier.gstNumber,
      paymentTerms: supplier.paymentTerms,
      status: supplier.status as SupplierStatus,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
      productCount: supplier._count?.products,
      purchaseCount: supplier._count?.purchases,
      products: supplier.products?.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        status: product.status,
        price: product.price,
      })),
      recentPurchases: supplier.purchases?.map((purchase) => ({
        id: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        totalAmount: purchase.totalAmount,
        status: purchase.status,
        purchaseDate: purchase.purchaseDate,
      })),
    };
  }

  // Create a new supplier
  async create(
    createSupplierDto: CreateSupplierDto,
  ): Promise<SupplierResponseDto> {
    try {
      const supplier = await this.prisma.supplier.create({
        data: {
          ...createSupplierDto,
          status: createSupplierDto.status || SupplierStatus.ACTIVE,
        },
      });

      return this.toResponseDto(supplier);
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.supplierErrorOptions,
        'Failed to create supplier',
      );
    }
  }

  // Get all suppliers
  async findAll(
    includeDetails: boolean = false,
  ): Promise<SupplierResponseDto[]> {
    try {
      const suppliers = await this.prisma.supplier.findMany({
        include: {
          products: includeDetails
            ? {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  status: true,
                },
                take: 5,
                orderBy: { createdAt: 'desc' },
              }
            : false,
          purchases: includeDetails
            ? {
                select: {
                  id: true,

                  totalAmount: true,
                  status: true,
                  purchaseDate: true,
                },
                take: 5,
                orderBy: { purchaseDate: 'desc' },
              }
            : false,
          _count: {
            select: {
              products: true,
              purchases: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return suppliers.map((supplier) => this.toResponseDto(supplier));
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.supplierErrorOptions,
        'Failed to fetch suppliers',
      );
    }
  }

  // Get suppliers with detailed counts
  async findAllWithCounts(): Promise<SupplierResponseDto[]> {
    try {
      const suppliers = await this.prisma.supplier.findMany({
        include: {
          _count: {
            select: {
              products: true,
              purchases: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return suppliers.map((supplier) => this.toResponseDto(supplier));
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.supplierErrorOptions,
        'Failed to fetch suppliers with counts',
      );
    }
  }

  // Get a single supplier by ID
  async findOne(id: number): Promise<SupplierResponseDto> {
    try {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id },
        include: {
          products: {
            select: {
              id: true,
              name: true,
              sku: true,
              status: true,

              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          purchases: {
            select: {
              id: true,

              totalAmount: true,
              status: true,
              purchaseDate: true,
              //   items: {
              //     select: {
              //       id: true,
              //       product: {
              //         select: {
              //           name: true,
              //           sku: true,
              //         },
              //       },
              //       quantity: true,
              //       unitPrice: true,
              //     },
              //   },
            },
            orderBy: { purchaseDate: 'desc' },
            take: 10,
          },
          _count: {
            select: {
              products: true,
              purchases: true,
            },
          },
        },
      });

      if (!supplier) {
        throw new NotFoundException(`Supplier with ID ${id} not found`);
      }

      return this.toResponseDto(supplier);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.supplierErrorOptions,
        `Failed to fetch supplier with ID ${id}`,
      );
    }
  }

  // Get supplier by code
  async findByCode(supplierCode: string): Promise<SupplierResponseDto> {
    try {
      const supplier = await this.prisma.supplier.findUnique({
        where: { supplierCode },
        include: {
          products: {
            where: { status: 'active' },
            select: {
              id: true,
              name: true,
              sku: true,
              //   price: true,
              //   images: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              products: {
                where: { status: 'active' },
              },
              purchases: true,
            },
          },
        },
      });

      if (!supplier) {
        throw new NotFoundException(
          `Supplier with code ${supplierCode} not found`,
        );
      }

      return this.toResponseDto(supplier);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.supplierErrorOptions,
        `Failed to fetch supplier with code ${supplierCode}`,
      );
    }
  }

  // Update supplier details
  async update(
    id: number,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<SupplierResponseDto> {
    try {
      // Check if supplier exists
      const supplierExists = await this.prisma.supplier.findUnique({
        where: { id },
      });

      if (!supplierExists) {
        throw new NotFoundException(`Supplier with ID ${id} not found`);
      }

      const supplier = await this.prisma.supplier.update({
        where: { id },
        data: {
          ...updateSupplierDto,
          updatedAt: new Date(),
        },
      });

      return this.toResponseDto(supplier);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.supplierErrorOptions,
        `Failed to update supplier with ID ${id}`,
      );
    }
  }

  // Delete supplier
  async remove(id: number): Promise<void> {
    try {
      // Check if supplier exists
      const supplier = await this.prisma.supplier.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              products: true,
              purchases: true,
            },
          },
        },
      });

      if (!supplier) {
        throw new NotFoundException(`Supplier with ID ${id} not found`);
      }

      // Check if supplier has related records
      if (supplier._count.products > 0 || supplier._count.purchases > 0) {
        throw new ConflictException(
          `Cannot delete supplier with associated products or purchases. Please reassign or delete the related records first.`,
        );
      }

      await this.prisma.supplier.delete({
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
        this.supplierErrorOptions,
        `Failed to delete supplier with ID ${id}`,
      );
    }
  }

  // Search suppliers
  async search(query: string): Promise<SupplierResponseDto[]> {
    try {
      const suppliers = await this.prisma.supplier.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { supplierCode: { contains: query, mode: 'insensitive' } },
            { contactPerson: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          _count: {
            select: {
              products: true,
              purchases: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return suppliers.map((supplier) => this.toResponseDto(supplier));
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.supplierErrorOptions,
        'Failed to search suppliers',
      );
    }
  }

  // Get suppliers by status
  async findByStatus(status: SupplierStatus): Promise<SupplierResponseDto[]> {
    try {
      const suppliers = await this.prisma.supplier.findMany({
        where: { status },
        include: {
          _count: {
            select: {
              products: true,
              purchases: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return suppliers.map((supplier) => this.toResponseDto(supplier));
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.supplierErrorOptions,
        `Failed to fetch ${status} suppliers`,
      );
    }
  }

  // Get supplier statistics
  async getStats(): Promise<SupplierStatsResponseDto> {
    try {
      const [
        totalSuppliers,
        activeSuppliers,
        inactiveSuppliers,
        suppliersWithProducts,
        topSuppliers,
      ] = await Promise.all([
        this.prisma.supplier.count(),
        this.prisma.supplier.count({
          where: { status: SupplierStatus.ACTIVE },
        }),
        this.prisma.supplier.count({
          where: { status: SupplierStatus.INACTIVE },
        }),
        this.prisma.supplier.count({
          where: {
            products: {
              some: {},
            },
          },
        }),
        this.prisma.supplier.findMany({
          include: {
            _count: {
              select: {
                products: true,
              },
            },
            purchases: {
              select: {
                totalAmount: true,
              },
            },
          },
          orderBy: {
            products: {
              _count: 'desc',
            },
          },
          take: 5,
        }),
      ]);

      const topSuppliersMapped = topSuppliers.map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
        supplierCode: supplier.supplierCode,
        productCount: supplier._count.products,
        totalPurchaseAmount: supplier.purchases.reduce(
          (sum, purchase) => sum + Number(purchase.totalAmount),
          0,
        ),
      }));

      return {
        totalSuppliers,
        activeSuppliers,
        inactiveSuppliers,
        suppliersWithProducts,
        topSuppliers: topSuppliersMapped,
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.supplierErrorOptions,
        'Failed to fetch supplier statistics',
      );
    }
  }

  // Get active suppliers only (convenience method)
  async findActive(): Promise<SupplierResponseDto[]> {
    return this.findByStatus(SupplierStatus.ACTIVE);
  }
}
