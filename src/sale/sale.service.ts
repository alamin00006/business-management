import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from '../prisma/prisma-error.utils';

@Injectable()
export class SaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  // Sale-specific error configuration
  private readonly saleErrorOptions = {
    entity: 'sale',
    uniqueFieldMap: {
      invoiceNo: 'Invoice number already exists',
    },
    foreignKeyMap: {
      branchId: 'Branch does not exist',
      customerId: 'Customer does not exist',
      createdById: 'User does not exist',
    },
    customMessages: {
      P2003: 'Referenced branch, customer, or user does not exist',
      P2002: 'Invoice number must be unique',
    },
  };

  // Create a new sale with items
  async create(data: {
    branchId: number;
    customerId?: number;
    invoiceNo: string;
    discount?: number;
    tax?: number;
    paymentMethod: string;
    createdById: number;
    items: Array<{
      productId: number;
      quantity: number;
      unitPrice: number;
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
        // Check stock availability first
        for (const item of data.items) {
          const stock = await tx.stock.findUnique({
            where: {
              productId_branchId: {
                productId: item.productId,
                branchId: data.branchId,
              },
            },
          });

          if (!stock || stock.quantity < item.quantity) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
            });
            throw new BadRequestException(
              `Insufficient stock for ${product?.name}. Available: ${stock?.quantity || 0}, Requested: ${item.quantity}`,
            );
          }
        }

        // Create sale
        const sale = await tx.sale.create({
          data: {
            branchId: data.branchId,
            customerId: data.customerId,
            invoiceNo: data.invoiceNo,
            totalAmount: itemsTotal,
            discount: discountAmount,
            tax: taxAmount,
            grandTotal: grandTotal,
            paidAmount: grandTotal, // Assuming full payment for now
            dueAmount: 0,
            paymentMethod: data.paymentMethod as any,
            createdById: data.createdById,
            // saleItems: {
            //   create: data.items.map((item) => ({
            //     productId: item.productId,
            //     quantity: item.quantity,
            //     unitPrice: item.unitPrice,
            //     total: item.total,
            //   })),
            // },
          },
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
        });

        // Update stock quantities and create inventory logs
        for (const item of data.items) {
          await tx.stock.update({
            where: {
              productId_branchId: {
                productId: item.productId,
                branchId: data.branchId,
              },
            },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          });

          // Create inventory log
          //   await tx.inventoryLog.create({
          //     data: {
          //       productId: item.productId,
          //       branchId: data.branchId,
          //       type: 'SALE',
          //       quantity: -item.quantity, // Negative for sales
          //       referenceId: sale.id,
          //       referenceType: 'SALE',
          //       remarks: `Sale - Invoice: ${data.invoiceNo}`,
          //     },
          //   });
        }

        return sale;
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.saleErrorOptions,
        'Failed to create sale',
      );
    }
  }

  // Get all sales with filters
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.SaleWhereInput;
    orderBy?: Prisma.SaleOrderByWithRelationInput;
  }) {
    try {
      const { skip, take, where, orderBy } = params;
      return await this.prisma.sale.findMany({
        skip,
        take,
        where,
        orderBy: orderBy || { createdAt: 'desc' },
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
          saleItems: {
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
              saleItems: true,
              saleReturns: true,
            },
          },
        },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.saleErrorOptions,
        'Failed to fetch sales',
      );
    }
  }

  // Get a single sale by ID
  async findOne(id: number) {
    try {
      const sale = await this.prisma.sale.findUnique({
        where: { id },
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
          saleItems: {
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
          saleReturns: {
            // include: {
            //   saleItems: true,
            // },
          },
        },
      });

      if (!sale) {
        throw new NotFoundException(`Sale with ID ${id} not found`);
      }

      return sale;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.saleErrorOptions,
        `Failed to fetch sale with ID ${id}`,
      );
    }
  }

  // Get sale by invoice number
  async findByInvoice(invoiceNo: string) {
    try {
      const sale = await this.prisma.sale.findUnique({
        where: { invoiceNo },
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
      });

      if (!sale) {
        throw new NotFoundException(
          `Sale with invoice number ${invoiceNo} not found`,
        );
      }

      return sale;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.saleErrorOptions,
        `Failed to fetch sale with invoice ${invoiceNo}`,
      );
    }
  }

  // Update sale payment
  async updatePayment(
    id: number,
    data: {
      paidAmount: number;
      paymentMethod?: string;
    },
  ) {
    try {
      const sale = await this.prisma.sale.findUnique({
        where: { id },
      });

      if (!sale) {
        throw new NotFoundException(`Sale with ID ${id} not found`);
      }

      const paidAmount = Number(data.paidAmount);
      const dueAmount = Number(sale.grandTotal) - paidAmount;

      if (paidAmount < 0 || paidAmount > Number(sale.grandTotal)) {
        throw new BadRequestException('Invalid payment amount');
      }

      const updateData: any = {
        paidAmount: paidAmount,
        dueAmount: dueAmount,
      };

      if (data.paymentMethod) {
        updateData.paymentMethod = data.paymentMethod as any;
      }

      // Update status based on payment
      if (dueAmount === 0) {
        updateData.status = 'COMPLETED';
      } else if (paidAmount > 0) {
        updateData.status = 'PARTIAL';
      } else {
        updateData.status = 'PENDING';
      }

      return await this.prisma.sale.update({
        where: { id },
        data: updateData,
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
        this.saleErrorOptions,
        `Failed to update sale payment with ID ${id}`,
      );
    }
  }

  // Update sale status
  async updateStatus(id: number, status: string) {
    try {
      const sale = await this.prisma.sale.findUnique({
        where: { id },
      });

      if (!sale) {
        throw new NotFoundException(`Sale with ID ${id} not found`);
      }

      return await this.prisma.sale.update({
        where: { id },
        data: { status: status as any },
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
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.saleErrorOptions,
        `Failed to update sale status with ID ${id}`,
      );
    }
  }

  // Delete sale (soft delete by status change)
  async remove(id: number) {
    try {
      const sale = await this.prisma.sale.findUnique({
        where: { id },
      });

      if (!sale) {
        throw new NotFoundException(`Sale with ID ${id} not found`);
      }

      // Instead of deleting, mark as cancelled and restore stock
      return await this.prisma.$transaction(async (tx) => {
        // Restore stock quantities
        const saleItems = await tx.saleItem.findMany({
          where: { saleId: id },
        });

        for (const item of saleItems) {
          await tx.stock.update({
            where: {
              productId_branchId: {
                productId: item.productId,
                branchId: sale.branchId,
              },
            },
            data: {
              quantity: {
                increment: item.quantity,
              },
            },
          });

          // Create inventory log for cancellation
          //   await tx.inventoryLog.create({
          //     data: {
          //       productId: item.productId,
          //       branchId: sale.branchId,
          //       type: 'ADJUSTMENT',
          //       quantity: item.quantity,
          //       referenceId: id,
          //       referenceType: 'SALE',
          //       remarks: `Sale cancelled - Invoice: ${sale.invoiceNo}`,
          //     },
          //   });
        }

        // Update sale status
        return await tx.sale.update({
          where: { id },
          data: {
            // status: 'CANCELLED',
          },
          include: {
            branch: true,
            customer: true,
          },
        });
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.saleErrorOptions,
        `Failed to cancel sale with ID ${id}`,
      );
    }
  }

  // Get sales by branch
  async findByBranch(
    branchId: number,
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.SaleWhereInput;
    },
  ) {
    try {
      const where: Prisma.SaleWhereInput = {
        branchId,
        ...params?.where,
      };

      return await this.prisma.sale.findMany({
        skip: params?.skip,
        take: params?.take,
        where,
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
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.saleErrorOptions,
        'Failed to fetch branch sales',
      );
    }
  }

  // Get sales by customer
  async findByCustomer(
    customerId: number,
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.SaleWhereInput;
    },
  ) {
    try {
      const where: Prisma.SaleWhereInput = {
        customerId,
        ...params?.where,
      };

      return await this.prisma.sale.findMany({
        skip: params?.skip,
        take: params?.take,
        where,
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
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.saleErrorOptions,
        'Failed to fetch customer sales',
      );
    }
  }

  // Get sale statistics
  async getStats(branchId?: number, startDate?: Date, endDate?: Date) {
    try {
      const where: Prisma.SaleWhereInput = {
        ...(branchId && { branchId }),
        ...(startDate &&
          endDate && {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        // status: { not: 'CANCELLED' },
      };

      const sales = await this.prisma.sale.findMany({
        where,
        include: {
          saleItems: true,
        },
      });

      const totalSales = sales.length;
      const totalAmount = sales.reduce(
        (sum, sale) => sum + Number(sale.grandTotal),
        0,
      );
      const totalPaid = sales.reduce(
        (sum, sale) => sum + Number(sale.paidAmount),
        0,
      );
      const totalDue = sales.reduce(
        (sum, sale) => sum + Number(sale.dueAmount),
        0,
      );
      const totalItems = sales.reduce(
        (sum, sale) =>
          sum +
          sale.saleItems.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0,
      );

      // Group by payment status
      const statusStats = sales.reduce((acc, sale) => {
        acc[sale.status] = (acc[sale.status] || 0) + 1;
        return acc;
      }, {});

      // Group by payment method
      const paymentMethodStats = sales.reduce((acc, sale) => {
        acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + 1;
        return acc;
      }, {});

      // Daily sales for chart
      const dailySales = await this.prisma.sale.groupBy({
        by: ['createdAt'],
        where: {
          ...where,
          createdAt: {
            gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days if no date
            lte: endDate || new Date(),
          },
        },
        _sum: {
          grandTotal: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return {
        totalSales,
        totalAmount,
        totalPaid,
        totalDue,
        totalItems,
        averageSale: totalSales > 0 ? totalAmount / totalSales : 0,
        statusStats,
        paymentMethodStats,
        dailySales: dailySales.map((day) => ({
          date: day.createdAt,
          amount: day._sum.grandTotal,
        })),
      };
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.saleErrorOptions,
        'Failed to fetch sale statistics',
      );
    }
  }

  // Get recent sales
  async findRecent(limit: number = 10) {
    try {
      return await this.prisma.sale.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.saleErrorOptions,
        'Failed to fetch recent sales',
      );
    }
  }

  // Get sales with due payments
  async findDueSales(branchId?: number) {
    try {
      const where: Prisma.SaleWhereInput = {
        dueAmount: { gt: 0 },
        // status: { not: 'CANCELLED' },
        ...(branchId && { branchId }),
      };

      return await this.prisma.sale.findMany({
        where,
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
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.saleErrorOptions,
        'Failed to fetch due sales',
      );
    }
  }

  // Add to SaleService class

  // Add item to existing sale
  async addItemToSale(
    saleId: number,
    data: {
      productId: number;
      quantity: number;
      unitPrice: number;
    },
  ) {
    try {
      const sale = await this.prisma.sale.findUnique({
        where: { id: saleId },
      });

      if (!sale) {
        throw new NotFoundException(`Sale with ID ${saleId} not found`);
      }

      // Check stock availability
      const stock = await this.prisma.stock.findUnique({
        where: {
          productId_branchId: {
            productId: data.productId,
            branchId: sale.branchId,
          },
        },
      });

      if (!stock || stock.quantity < data.quantity) {
        const product = await this.prisma.product.findUnique({
          where: { id: data.productId },
        });
        throw new BadRequestException(
          `Insufficient stock for ${product?.name}. Available: ${stock?.quantity || 0}, Requested: ${data.quantity}`,
        );
      }

      const subtotal = Number(data.unitPrice) * data.quantity;

      return await this.prisma.$transaction(async (tx) => {
        // Add sale item
        const saleItem = await tx.saleItem.create({
          data: {
            saleId,
            productId: data.productId,
            quantity: data.quantity,
            unitPrice: data.unitPrice,
            subtotal: subtotal,
          },
        });

        // Update sale totals
        const newTotalAmount = Number(sale.totalAmount) + subtotal;
        const newGrandTotal =
          newTotalAmount - Number(sale.discount) + Number(sale.tax);
        const newDueAmount = newGrandTotal - Number(sale.paidAmount);

        await tx.sale.update({
          where: { id: saleId },
          data: {
            totalAmount: newTotalAmount,
            grandTotal: newGrandTotal,
            dueAmount: newDueAmount,
          },
        });

        // Update stock
        await tx.stock.update({
          where: {
            productId_branchId: {
              productId: data.productId,
              branchId: sale.branchId,
            },
          },
          data: {
            quantity: {
              decrement: data.quantity,
            },
          },
        });

        // Create inventory log
        //   await tx.inventoryLog.create({
        //     data: {
        //       productId: data.productId,
        //       branchId: sale.branchId,
        //       type: 'SALE',
        //       quantity: -data.quantity,
        //       referenceId: saleId,
        //       referenceType: 'SALE',
        //       remarks: `Sale item added - Invoice: ${sale.invoiceNo}`,
        //     },
        //   });

        return saleItem;
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
        this.saleErrorOptions,
        'Failed to add item to sale',
      );
    }
  }

  // Remove item from sale
  async removeItemFromSale(saleId: number, itemId: number) {
    try {
      const sale = await this.prisma.sale.findUnique({
        where: { id: saleId },
      });

      if (!sale) {
        throw new NotFoundException(`Sale with ID ${saleId} not found`);
      }

      const saleItem = await this.prisma.saleItem.findUnique({
        where: { id: itemId },
      });

      if (!saleItem || saleItem.saleId !== saleId) {
        throw new NotFoundException(
          `Sale item with ID ${itemId} not found in sale ${saleId}`,
        );
      }

      return await this.prisma.$transaction(async (tx) => {
        // Remove sale item
        const deletedItem = await tx.saleItem.delete({
          where: { id: itemId },
        });

        // Update sale totals
        const newTotalAmount =
          Number(sale.totalAmount) - Number(saleItem.subtotal);
        const newGrandTotal =
          newTotalAmount - Number(sale.discount) + Number(sale.tax);
        const newDueAmount = newGrandTotal - Number(sale.paidAmount);

        await tx.sale.update({
          where: { id: saleId },
          data: {
            totalAmount: newTotalAmount,
            grandTotal: newGrandTotal,
            dueAmount: newDueAmount,
          },
        });

        // Update stock (restore)
        await tx.stock.update({
          where: {
            productId_branchId: {
              productId: saleItem.productId,
              branchId: sale.branchId,
            },
          },
          data: {
            quantity: {
              increment: saleItem.quantity,
            },
          },
        });

        // Create inventory log for removal
        //   await tx.inventoryLog.create({
        //     data: {
        //       productId: saleItem.productId,
        //       branchId: sale.branchId,
        //       type: 'ADJUSTMENT',
        //       quantity: saleItem.quantity,
        //       referenceId: saleId,
        //       referenceType: 'SALE',
        //       remarks: `Sale item removed - Invoice: ${sale.invoiceNo}`,
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
        this.saleErrorOptions,
        'Failed to remove item from sale',
      );
    }
  }

  // Add this method to your existing SaleService

  // Manual inventory log creation for sales
  async createSaleInventoryLog(
    saleId: number,
    data: {
      productId: number;
      quantity: number;
      createdById: number;
    },
  ) {
    try {
      const sale = await this.prisma.sale.findUnique({
        where: { id: saleId },
        include: {
          saleItems: true,
        },
      });

      if (!sale) {
        throw new NotFoundException(`Sale with ID ${saleId} not found`);
      }

      const stock = await this.prisma.stock.findUnique({
        where: {
          productId_branchId: {
            productId: data.productId,
            branchId: sale.branchId,
          },
        },
      });

      const previousStock = stock?.quantity || 0;
      const newStock = previousStock - data.quantity;

      if (newStock < 0) {
        throw new BadRequestException('Insufficient stock for this operation');
      }

      // return await this.prisma.inventoryLog.create({
      //   data: {
      //     productId: data.productId,
      //     branchId: sale.branchId,
      //     changeType: 'SALE',
      //     quantityChange: -data.quantity, // Negative for sales
      //     previousStock,
      //     newStock,
      //     referenceType: 'SALE',
      //     referenceId: saleId,
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
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.saleErrorOptions,
        'Failed to create sale inventory log',
      );
    }
  }
}
