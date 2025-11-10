import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { SaleService } from './sale.service';
import { Prisma } from '@prisma/client';

@Controller('sales')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @Post()
  create(
    @Body()
    data: {
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
    },
  ) {
    return this.saleService.create(data);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
    @Query('branchId') branchId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const where: Prisma.SaleWhereInput = {};

    if (branchId) where.branchId = parseInt(branchId);
    if (customerId) where.customerId = parseInt(customerId);
    if (status) where.status = status as any;
    if (paymentMethod) where.paymentMethod = paymentMethod as any;

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    return this.saleService.findAll({
      skip,
      take,
      where,
    });
  }

  @Get('stats')
  getStats(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.saleService.getStats(
      branchId ? parseInt(branchId) : undefined,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('recent')
  findRecent(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    return this.saleService.findRecent(limit);
  }

  @Get('due')
  findDueSales(@Query('branchId') branchId?: string) {
    return this.saleService.findDueSales(
      branchId ? parseInt(branchId) : undefined,
    );
  }

  @Get('branch/:branchId')
  findByBranch(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
  ) {
    return this.saleService.findByBranch(branchId, { skip, take });
  }

  @Get('customer/:customerId')
  findByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
  ) {
    return this.saleService.findByCustomer(customerId, { skip, take });
  }

  @Get('invoice/:invoiceNo')
  findByInvoice(@Param('invoiceNo') invoiceNo: string) {
    return this.saleService.findByInvoice(invoiceNo);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.saleService.findOne(id);
  }

  @Patch(':id/payment')
  updatePayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { paidAmount: number; paymentMethod?: string },
  ) {
    return this.saleService.updatePayment(id, data);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { status: string },
  ) {
    return this.saleService.updateStatus(id, data.status);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.saleService.remove(id);
  }

  // Add to SaleController class

  @Post(':saleId/items')
  addItemToSale(
    @Param('saleId', ParseIntPipe) saleId: number,
    @Body()
    data: {
      productId: number;
      quantity: number;
      unitPrice: number;
    },
  ) {
    return this.saleService.addItemToSale(saleId, data);
  }

  @Delete(':saleId/items/:itemId')
  removeItemFromSale(
    @Param('saleId', ParseIntPipe) saleId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.saleService.removeItemFromSale(saleId, itemId);
  }
}
