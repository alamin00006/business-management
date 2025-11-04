// src/product-categories/product-categories.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ValidationPipe,
  UsePipes,
  ParseBoolPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ProductCategoriesService } from './product-categories.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategoryResponseDto } from './dto/product-category-response.dto';
import { CategoryStatus } from './dto/create-product-category.dto';
import { CategoryReorderDto } from './dto/category-reorder.dto';

@Controller('product-categories')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ProductCategoriesController {
  constructor(private readonly categoriesService: ProductCategoriesService) {}

  @Post()
  async create(
    @Body() createCategoryDto: CreateProductCategoryDto,
  ): Promise<ProductCategoryResponseDto> {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  async findAll(
    @Query('includeProducts', new DefaultValuePipe(false), ParseBoolPipe)
    includeProducts: boolean,
  ): Promise<ProductCategoryResponseDto[]> {
    return this.categoriesService.findAll(includeProducts);
  }

  @Get('with-counts')
  async findAllWithCounts(): Promise<ProductCategoryResponseDto[]> {
    return this.categoriesService.findAllWithCounts();
  }

  @Get('search')
  async search(
    @Query('q') query: string,
  ): Promise<ProductCategoryResponseDto[]> {
    return this.categoriesService.search(query);
  }

  @Get('status/:status')
  async findByStatus(
    @Param('status') status: CategoryStatus,
  ): Promise<ProductCategoryResponseDto[]> {
    return this.categoriesService.findByStatus(status);
  }

  @Get('slug/:slug')
  async findBySlug(
    @Param('slug') slug: string,
  ): Promise<ProductCategoryResponseDto> {
    return this.categoriesService.findBySlug(slug);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProductCategoryResponseDto> {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateProductCategoryDto,
  ): Promise<ProductCategoryResponseDto> {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  async reorder(@Body() reorderDto: CategoryReorderDto): Promise<void> {
    return this.categoriesService.reorder(reorderDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.categoriesService.remove(id);
  }
}
