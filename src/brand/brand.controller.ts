// src/brands/brands.controller.ts
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
} from '@nestjs/common';

import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandResponseDto } from './dto/brand-response.dto';
import { BrandStatus } from './dto/create-brand.dto';
import { BrandsService } from './brand.service';

@Controller('brands')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  async create(
    @Body() createBrandDto: CreateBrandDto,
  ): Promise<BrandResponseDto> {
    return this.brandsService.create(createBrandDto);
  }

  @Get()
  async findAll(): Promise<BrandResponseDto[]> {
    return this.brandsService.findAll();
  }

  @Get('search')
  async search(@Query('q') query: string): Promise<BrandResponseDto[]> {
    return this.brandsService.search(query);
  }

  @Get('status/:status')
  async findByStatus(
    @Param('status') status: BrandStatus,
  ): Promise<BrandResponseDto[]> {
    return this.brandsService.findByStatus(status);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string): Promise<BrandResponseDto> {
    return this.brandsService.findBySlug(slug);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BrandResponseDto> {
    return this.brandsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBrandDto: UpdateBrandDto,
  ): Promise<BrandResponseDto> {
    return this.brandsService.update(id, updateBrandDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.brandsService.remove(id);
  }
}
