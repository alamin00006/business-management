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
import { SaleItemService } from './sale-item.service';

@Controller('sale-items')
export class SaleItemController {
  constructor(private readonly saleItemService: SaleItemService) {}

  @Post()
  create(
    @Body()
    data: {
      saleId: number;
      productId: number;
      quantity: number;
      unitPrice: number;
    },
  ) {
    return this.saleItemService.create(data);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
    @Query('saleId') saleId?: string,
    @Query('productId') productId?: string,
  ) {
    const where: any = {};
    if (saleId) where.saleId = parseInt(saleId);
    if (productId) where.productId = parseInt(productId);

    return this.saleItemService.findAll({
      skip,
      take,
      where,
    });
  }

  @Get('sale/:saleId')
  findBySale(@Param('saleId', ParseIntPipe) saleId: number) {
    return this.saleItemService.findBySale(saleId);
  }

  @Get('product/:productId')
  findByProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
  ) {
    return this.saleItemService.findByProduct(productId, { skip, take });
  }

  @Get('stats/product/:productId')
  getProductSaleStats(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.saleItemService.getProductSaleStats(
      productId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('top-products')
  getTopSellingProducts(
    @Query('branchId') branchId?: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.saleItemService.getTopSellingProducts(
      branchId ? parseInt(branchId) : undefined,
      limit,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('sales-by-category')
  getSalesByCategory(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.saleItemService.getSalesByCategory(
      branchId ? parseInt(branchId) : undefined,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.saleItemService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { quantity?: number; unitPrice?: number },
  ) {
    return this.saleItemService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.saleItemService.remove(id);
  }
}
