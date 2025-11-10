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
import { ProductService } from './product.service';
import { Prisma } from '@prisma/client';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  create(@Body() data: Prisma.ProductCreateInput) {
    return this.productService.create(data);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
    @Query('categoryId') categoryId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('brandId') brandId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const where: Prisma.ProductWhereInput = {};

    if (categoryId) where.categoryId = parseInt(categoryId);
    if (supplierId) where.supplierId = parseInt(supplierId);
    if (brandId) where.brandId = parseInt(brandId);
    if (status) where.status = status as any;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.productService.findAll({
      skip,
      take,
      where,
    });
  }

  @Get('low-stock')
  findLowStock(@Query('branchId') branchId?: string) {
    return this.productService.findLowStock(
      branchId ? parseInt(branchId) : undefined,
    );
  }

  @Get('search')
  search(@Query('q') query: string, @Query('branchId') branchId?: string) {
    return this.productService.search(
      query,
      branchId ? parseInt(branchId) : undefined,
    );
  }

  @Get('count')
  getCount(
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
  ) {
    const where: Prisma.ProductWhereInput = {};
    if (categoryId) where.categoryId = parseInt(categoryId);
    if (status) where.status = status as any;

    return this.productService.getCount(where);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.productService.findBySlug(slug);
  }

  @Get('sku/:sku')
  findBySku(@Param('sku') sku: string) {
    return this.productService.findBySku(sku);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.ProductUpdateInput,
  ) {
    return this.productService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productService.remove(id);
  }
}
