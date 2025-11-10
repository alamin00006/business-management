import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from '../prisma/prisma-error.utils';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  // Customer-specific error configuration
  private readonly customerErrorOptions = {
    entity: 'customer',
    uniqueFieldMap: {
      customerCode: 'Customer code already exists',
      email: 'Email already registered',
      phone: 'Phone number already registered',
    },
    customMessages: {
      P2002: 'Customer with this email, phone, or customer code already exists',
    },
  };

  // Create a new customer
  async create(data: {
    customerCode: string;
    name: string;
    email: string;
    phone: string;
    password: string;
    address?: any;
    profilePicture?: string;
    profileCloudinaryId?: string;
    customerType?: string;
  }) {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 12);

      return await this.prisma.customer.create({
        data: {
          customerCode: data.customerCode,
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          password: hashedPassword,
          address: data.address,
          profilePicture: data.profilePicture,
          profileCloudinaryId: data.profileCloudinaryId,
          customerType: data.customerType as any,
        },
        include: {
          loyalty: true,
          _count: {
            select: {
              sales: true,
              saleReturns: true,
            },
          },
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.customerErrorOptions,
        'Failed to create customer',
      );
    }
  }

  // Get all customers with filters
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.CustomerWhereInput;
    orderBy?: Prisma.CustomerOrderByWithRelationInput;
  }) {
    try {
      const { skip, take, where, orderBy } = params;
      return await this.prisma.customer.findMany({
        skip,
        take,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
        include: {
          loyalty: true,
          _count: {
            select: {
              sales: true,
              saleReturns: true,
            },
          },
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.customerErrorOptions,
        'Failed to fetch customers',
      );
    }
  }

  // Get a single customer by ID
  async findOne(id: number) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id },
        include: {
          loyalty: true,
          sales: {
            include: {
              branch: true,
              saleItems: {
                include: {
                  product: {
                    include: {
                      category: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          saleReturns: {
            include: {
              sale: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          _count: {
            select: {
              sales: true,
              saleReturns: true,
            },
          },
        },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      return customer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.customerErrorOptions,
        `Failed to fetch customer with ID ${id}`,
      );
    }
  }

  // Get customer by email
  async findByEmail(email: string) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          loyalty: true,
          _count: {
            select: {
              sales: true,
              saleReturns: true,
            },
          },
        },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with email ${email} not found`);
      }

      return customer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.customerErrorOptions,
        `Failed to fetch customer with email ${email}`,
      );
    }
  }

  // Get customer by phone
  async findByPhone(phone: string) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { phone },
        include: {
          loyalty: true,
          _count: {
            select: {
              sales: true,
              saleReturns: true,
            },
          },
        },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with phone ${phone} not found`);
      }

      return customer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.customerErrorOptions,
        `Failed to fetch customer with phone ${phone}`,
      );
    }
  }

  // Get customer by customer code
  async findByCustomerCode(customerCode: string) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { customerCode },
        include: {
          loyalty: true,
          sales: {
            include: {
              branch: true,
              saleItems: {
                include: {
                  product: {
                    include: {
                      category: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          _count: {
            select: {
              sales: true,
              saleReturns: true,
            },
          },
        },
      });

      if (!customer) {
        throw new NotFoundException(
          `Customer with code ${customerCode} not found`,
        );
      }

      return customer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.customerErrorOptions,
        `Failed to fetch customer with code ${customerCode}`,
      );
    }
  }

  // Update customer details
  async update(
    id: number,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      address?: any;
      profilePicture?: string;
      profileCloudinaryId?: string;
      customerType?: string;
      status?: string;
    },
  ) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.email) updateData.email = data.email.toLowerCase();
      if (data.phone) updateData.phone = data.phone;
      if (data.address) updateData.address = data.address;
      if (data.profilePicture) updateData.profilePicture = data.profilePicture;
      if (data.profileCloudinaryId)
        updateData.profileCloudinaryId = data.profileCloudinaryId;
      if (data.customerType) updateData.customerType = data.customerType as any;
      if (data.status) updateData.status = data.status as any;

      return await this.prisma.customer.update({
        where: { id },
        data: updateData,
        include: {
          loyalty: true,
          _count: {
            select: {
              sales: true,
              saleReturns: true,
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
        this.customerErrorOptions,
        `Failed to update customer with ID ${id}`,
      );
    }
  }

  // Update customer password
  async updatePassword(
    id: number,
    currentPassword: string,
    newPassword: string,
  ) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        customer.password,
      );
      if (!isPasswordValid) {
        throw new ConflictException('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      return await this.prisma.customer.update({
        where: { id },
        data: { password: hashedPassword },
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
        this.customerErrorOptions,
        `Failed to update customer password with ID ${id}`,
      );
    }
  }

  // Reset customer password (admin function)
  async resetPassword(id: number, newPassword: string) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      return await this.prisma.customer.update({
        where: { id },
        data: { password: hashedPassword },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.customerErrorOptions,
        `Failed to reset customer password with ID ${id}`,
      );
    }
  }

  // Delete customer (soft delete by status change)
  async remove(id: number) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      return await this.prisma.customer.update({
        where: { id },
        data: {
          //   status: 'INACTIVE',
          email: `deleted_${Date.now()}_${customer.email}`, // Prevent email reuse
          phone: `deleted_${Date.now()}_${customer.phone}`, // Prevent phone reuse
        },
        include: {
          loyalty: true,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.customerErrorOptions,
        `Failed to delete customer with ID ${id}`,
      );
    }
  }

  // Verify customer email
  async verifyEmail(id: number) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }

      return await this.prisma.customer.update({
        where: { id },
        data: {
          emailVerifiedAt: new Date(),
        },
        include: {
          loyalty: true,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.customerErrorOptions,
        `Failed to verify customer email with ID ${id}`,
      );
    }
  }

  // Get customer statistics
  async getStats() {
    try {
      const totalCustomers = await this.prisma.customer.count();
      const activeCustomers = await this.prisma.customer.count({
        // where: { status: 'ACTIVE' },
      });
      const verifiedCustomers = await this.prisma.customer.count({
        where: { emailVerifiedAt: { not: null } },
      });

      // Customer type distribution
      const typeStats = await this.prisma.customer.groupBy({
        by: ['customerType'],
        _count: {
          id: true,
        },
      });

      // Recent customers (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentCustomers = await this.prisma.customer.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      });

      return {
        totalCustomers,
        activeCustomers,
        inactiveCustomers: totalCustomers - activeCustomers,
        verifiedCustomers,
        unverifiedCustomers: totalCustomers - verifiedCustomers,
        typeStats,
        recentCustomers,
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.customerErrorOptions,
        'Failed to fetch customer statistics',
      );
    }
  }

  // Search customers
  async search(
    query: string,
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.CustomerWhereInput;
    },
  ) {
    try {
      const where: Prisma.CustomerWhereInput = {
        ...params?.where,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { customerCode: { contains: query, mode: 'insensitive' } },
        ],
      };

      return await this.prisma.customer.findMany({
        skip: params?.skip,
        take: params?.take,
        where,
        include: {
          loyalty: true,
          _count: {
            select: {
              sales: true,
              saleReturns: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.customerErrorOptions,
        'Failed to search customers',
      );
    }
  }

  // Get top customers by sales
  async getTopCustomersBySales(
    limit: number = 10,
    startDate?: Date,
    endDate?: Date,
  ) {
    try {
      const where: Prisma.SaleWhereInput = {
        // status: { not: 'CANCELLED' },
        ...(startDate &&
          endDate && {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
      };

      const customerSales = await this.prisma.sale.groupBy({
        by: ['customerId'],
        where,
        _sum: {
          grandTotal: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            grandTotal: 'desc',
          },
        },
        take: limit,
      });

      // Get customer details
      const customerIds = customerSales
        .map((item) => item.customerId)
        .filter((id) => id !== null);
      const customers = await this.prisma.customer.findMany({
        where: { id: { in: customerIds as number[] } },
        include: {
          loyalty: true,
        },
      });

      return customerSales.map((item) => {
        const customer = customers.find((c) => c.id === item.customerId);
        return {
          customer,
          totalSales: item._sum.grandTotal,
          saleCount: item._count.id,
        };
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.customerErrorOptions,
        'Failed to fetch top customers by sales',
      );
    }
  }

  // Customer login
  async login(email: string, password: string) {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          loyalty: true,
        },
      });

      if (!customer) {
        throw new NotFoundException('Invalid email or password');
      }

      //   if (customer.status !== 'ACTIVE') {
      //     throw new ConflictException('Customer account is inactive');
      //   }

      const isPasswordValid = await bcrypt.compare(password, customer.password);
      if (!isPasswordValid) {
        throw new ConflictException('Invalid email or password');
      }

      // Remove password from response
      const { password: _, ...customerWithoutPassword } = customer;
      return customerWithoutPassword;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.customerErrorOptions,
        'Failed to login customer',
      );
    }
  }
}
