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
import { SaleReturnService } from './sale-return.service';
import { Prisma } from '@prisma/client';

@Controller('sale-returns')
export class SaleReturnController {
  constructor(private readonly saleReturnService: SaleReturnService) {}

  @Post()
  create(
    @Body()
    data: {
      saleId: number;
      productId: number;
      quantity: number;
      reason: string;
      refundAmount: number;
      processedById?: number;
    },
  ) {
    return this.saleReturnService.create(data);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
    @Query('saleId') saleId?: string,
    @Query('productId') productId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const where: Prisma.SaleReturnWhereInput = {};

    if (saleId) where.saleId = parseInt(saleId);
    if (productId) where.productId = parseInt(productId);
    if (status) where.status = status as any;

    if (customerId) {
      where.sale = {
        customerId: parseInt(customerId),
      };
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    return this.saleReturnService.findAll({
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
    return this.saleReturnService.getStats(
      branchId ? parseInt(branchId) : undefined,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('recent')
  findRecent(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('branchId') branchId?: string,
  ) {
    return this.saleReturnService.findRecent(
      limit,
      branchId ? parseInt(branchId) : undefined,
    );
  }

  @Get('search')
  search(
    @Query('q') query: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
  ) {
    return this.saleReturnService.search(query, { skip, take });
  }

  @Get('validate/:saleId/:productId/:quantity')
  validateReturn(
    @Param('saleId', ParseIntPipe) saleId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Param('quantity', ParseIntPipe) quantity: number,
  ) {
    return this.saleReturnService.validateReturn(saleId, productId, quantity);
  }

  @Get('sale/:saleId')
  findBySale(@Param('saleId', ParseIntPipe) saleId: number) {
    return this.saleReturnService.findBySale(saleId);
  }

  @Get('product/:productId')
  findByProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
  ) {
    return this.saleReturnService.findByProduct(productId, { skip, take });
  }

  @Get('customer/:customerId')
  findByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
  ) {
    return this.saleReturnService.findByCustomer(customerId, { skip, take });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.saleReturnService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { status: string; processedById: number },
  ) {
    return this.saleReturnService.updateStatus(
      id,
      data.status,
      data.processedById,
    );
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    data: {
      quantity?: number;
      reason?: string;
      refundAmount?: number;
    },
  ) {
    return this.saleReturnService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.saleReturnService.remove(id);
  }
}
