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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
import { SupplierStatus } from './dto/create-supplier.dto';
import { SupplierStatsResponseDto } from './dto/supplier-stats.dto';

@Controller('suppliers')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  async create(
    @Body() createSupplierDto: CreateSupplierDto,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.create(createSupplierDto);
  }

  @Get()
  async findAll(
    @Query('includeDetails', new DefaultValuePipe(false), ParseBoolPipe)
    includeDetails: boolean,
  ): Promise<SupplierResponseDto[]> {
    return this.suppliersService.findAll(includeDetails);
  }

  @Get('with-counts')
  async findAllWithCounts(): Promise<SupplierResponseDto[]> {
    return this.suppliersService.findAllWithCounts();
  }

  @Get('stats')
  async getStats(): Promise<SupplierStatsResponseDto> {
    return this.suppliersService.getStats();
  }

  @Get('active')
  async findActive(): Promise<SupplierResponseDto[]> {
    return this.suppliersService.findActive();
  }

  @Get('search')
  async search(@Query('q') query: string): Promise<SupplierResponseDto[]> {
    return this.suppliersService.search(query);
  }

  @Get('status/:status')
  async findByStatus(
    @Param('status') status: SupplierStatus,
  ): Promise<SupplierResponseDto[]> {
    return this.suppliersService.findByStatus(status);
  }

  @Get('code/:code')
  async findByCode(@Param('code') code: string): Promise<SupplierResponseDto> {
    return this.suppliersService.findByCode(code);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.suppliersService.remove(id);
  }
}
