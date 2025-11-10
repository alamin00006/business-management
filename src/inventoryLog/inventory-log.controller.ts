import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { InventoryLogService } from './inventory-log.service';
import { Prisma } from '@prisma/client';

@Controller('inventory-logs')
export class InventoryLogController {
  constructor(private readonly inventoryLogService: InventoryLogService) {}

  @Post()
  create(
    @Body()
    data: {
      productId: number;
      branchId: number;
      changeType: string;
      quantityChange: number;
      previousStock: number;
      newStock: number;
      referenceType: string;
      referenceId?: number;
      createdById: number;
    },
  ) {
    return this.inventoryLogService.create(data);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take?: number,
    @Query('productId') productId?: string,
    @Query('branchId') branchId?: string,
    @Query('changeType') changeType?: string,
    @Query('referenceType') referenceType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const where: Prisma.InventoryLogWhereInput = {};

    if (productId) where.productId = parseInt(productId);
    if (branchId) where.branchId = parseInt(branchId);
    if (changeType) where.changeType = changeType as any;
    if (referenceType) where.referenceType = referenceType as any;

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    return this.inventoryLogService.findAll({
      skip,
      take,
      where,
    });
  }

  @Get('product/:productId')
  findByProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take?: number,
  ) {
    return this.inventoryLogService.findByProduct(productId, { skip, take });
  }

  @Get('branch/:branchId')
  findByBranch(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take?: number,
  ) {
    return this.inventoryLogService.findByBranch(branchId, { skip, take });
  }

  @Get('reference/:referenceType/:referenceId')
  findByReference(
    @Param('referenceType') referenceType: string,
    @Param('referenceId', ParseIntPipe) referenceId: number,
  ) {
    return this.inventoryLogService.findByReference(referenceType, referenceId);
  }

  @Get('movement-summary/product/:productId/branch/:branchId')
  getMovementSummary(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('branchId', ParseIntPipe) branchId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryLogService.getMovementSummary(
      productId,
      branchId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('stock-history/product/:productId/branch/:branchId')
  getStockHistory(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('branchId', ParseIntPipe) branchId: number,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number,
  ) {
    return this.inventoryLogService.getStockHistory(productId, branchId, days);
  }

  @Get('low-stock-alerts')
  getLowStockAlerts(
    @Query('branchId') branchId?: string,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days?: number,
  ) {
    return this.inventoryLogService.getLowStockAlerts(
      branchId ? parseInt(branchId) : undefined,
      days,
    );
  }

  @Get('valuation-changes/branch/:branchId')
  getValuationChanges(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.inventoryLogService.getValuationChanges(
      branchId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('audit-report')
  getAuditReport(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryLogService.getAuditReport(
      branchId ? parseInt(branchId) : undefined,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryLogService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryLogService.remove(id);
  }
}
