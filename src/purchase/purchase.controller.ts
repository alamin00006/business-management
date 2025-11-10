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
import { PurchaseService } from './purchase.service';
import { Prisma } from '@prisma/client';

@Controller('purchases')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post()
  create(
    @Body()
    data: {
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
    },
  ) {
    return this.purchaseService.create(data);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
    @Query('supplierId') supplierId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const where: Prisma.PurchaseWhereInput = {};

    if (supplierId) where.supplierId = parseInt(supplierId);
    if (branchId) where.branchId = parseInt(branchId);
    if (status) where.status = status as any;
    if (paymentStatus) where.paymentStatus = paymentStatus as any;

    if (startDate && endDate) {
      where.purchaseDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    return this.purchaseService.findAll({
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
    return this.purchaseService.getStats(
      branchId ? parseInt(branchId) : undefined,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('recent')
  findRecent(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    return this.purchaseService.findRecent(limit);
  }

  @Get('supplier/:supplierId')
  findBySupplier(
    @Param('supplierId', ParseIntPipe) supplierId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
  ) {
    return this.purchaseService.findBySupplier(supplierId, { skip, take });
  }

  @Get('branch/:branchId')
  findByBranch(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
  ) {
    return this.purchaseService.findByBranch(branchId, { skip, take });
  }

  @Get('invoice/:invoiceNo')
  findByInvoice(@Param('invoiceNo') invoiceNo: string) {
    return this.purchaseService.findByInvoice(invoiceNo);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { status: string; paymentStatus?: string },
  ) {
    return this.purchaseService.updateStatus(
      id,
      data.status,
      data.paymentStatus,
    );
  }

  @Patch(':id/payment')
  updatePaymentStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { paymentStatus: string; paymentMethod?: string },
  ) {
    return this.purchaseService.updatePaymentStatus(
      id,
      data.paymentStatus,
      data.paymentMethod,
    );
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseService.remove(id);
  }

  @Post(':purchaseId/items')
  addItemToPurchase(
    @Param('purchaseId', ParseIntPipe) purchaseId: number,
    @Body()
    data: {
      productId: number;
      quantity: number;
      unitCost: number;
    },
  ) {
    return this.purchaseService.addItemToPurchase(purchaseId, data);
  }

  @Delete(':purchaseId/items/:itemId')
  removeItemFromPurchase(
    @Param('purchaseId', ParseIntPipe) purchaseId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.purchaseService.removeItemFromPurchase(purchaseId, itemId);
  }
}
