import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { Prisma } from '@prisma/client';

@Controller('stocks')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('upsert')
  upsert(
    @Body() data: { productId: number; branchId: number; quantity: number },
  ) {
    return this.stockService.upsert(data);
  }

  @Post('increment')
  increment(
    @Body() data: { productId: number; branchId: number; quantity: number },
  ) {
    return this.stockService.increment(data);
  }

  @Post('decrement')
  decrement(
    @Body() data: { productId: number; branchId: number; quantity: number },
  ) {
    return this.stockService.decrement(data);
  }

  @Post('bulk')
  bulkUpdate(
    @Body()
    data: Array<{ productId: number; branchId: number; quantity: number }>,
  ) {
    return this.stockService.bulkUpdate(data);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
    @Query('productId') productId?: string,
    @Query('branchId') branchId?: string,
    @Query('minQuantity') minQuantity?: string,
    @Query('maxQuantity') maxQuantity?: string,
  ) {
    const where: Prisma.StockWhereInput = {};

    if (productId) where.productId = parseInt(productId);
    if (branchId) where.branchId = parseInt(branchId);

    if (minQuantity || maxQuantity) {
      where.quantity = {};
      if (minQuantity) where.quantity.gte = parseInt(minQuantity);
      if (maxQuantity) where.quantity.lte = parseInt(maxQuantity);
    }

    return this.stockService.findAll({
      skip,
      take,
      where,
    });
  }

  @Get('branch/:branchId')
  findByBranch(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
  ) {
    return this.stockService.findByBranch(branchId, { skip, take });
  }

  @Get('product/:productId')
  findByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.stockService.findByProduct(productId);
  }

  @Get('branch/:branchId/low-stock')
  findLowStock(@Param('branchId', ParseIntPipe) branchId: number) {
    return this.stockService.findLowStock(branchId);
  }

  @Get('branch/:branchId/value')
  getBranchStockValue(@Param('branchId', ParseIntPipe) branchId: number) {
    return this.stockService.getBranchStockValue(branchId);
  }

  @Get('product/:productId/branch/:branchId')
  findByProductAndBranch(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('branchId', ParseIntPipe) branchId: number,
  ) {
    return this.stockService.findByProductAndBranch(productId, branchId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.StockUpdateInput,
  ) {
    return this.stockService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.remove(id);
  }
}
