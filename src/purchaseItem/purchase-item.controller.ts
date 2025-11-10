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
import { PurchaseItemService } from './purchase-item.service';

@Controller('purchase-items')
export class PurchaseItemController {
  constructor(private readonly purchaseItemService: PurchaseItemService) {}

  @Post()
  create(
    @Body()
    data: {
      purchaseId: number;
      productId: number;
      quantity: number;
      unitCost: number;
    },
  ) {
    return this.purchaseItemService.create(data);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
    @Query('purchaseId') purchaseId?: string,
    @Query('productId') productId?: string,
  ) {
    const where: any = {};
    if (purchaseId) where.purchaseId = parseInt(purchaseId);
    if (productId) where.productId = parseInt(productId);

    return this.purchaseItemService.findAll({
      skip,
      take,
      where,
    });
  }

  @Get('purchase/:purchaseId')
  findByPurchase(@Param('purchaseId', ParseIntPipe) purchaseId: number) {
    return this.purchaseItemService.findByPurchase(purchaseId);
  }

  @Get('product/:productId')
  findByProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
  ) {
    return this.purchaseItemService.findByProduct(productId, { skip, take });
  }

  @Get('stats/product/:productId')
  getProductPurchaseStats(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.purchaseItemService.getProductPurchaseStats(
      productId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('top-products')
  getTopPurchasedProducts(
    @Query('branchId') branchId?: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.purchaseItemService.getTopPurchasedProducts(
      branchId ? parseInt(branchId) : undefined,
      limit,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseItemService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { quantity?: number; unitCost?: number },
  ) {
    return this.purchaseItemService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseItemService.remove(id);
  }
}
