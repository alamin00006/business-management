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
import { ExpenseService } from './expense.service';
import { Prisma } from '@prisma/client';

@Controller('expenses')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  create(
    @Body()
    data: {
      branchId: number;
      category: string;
      amount: number;
      description?: string;
      expenseDate: Date;
      createdById: number;
      paymentMethod?: string;
      referenceNo?: string;
    },
  ) {
    return this.expenseService.create(data);
  }

  @Post('bulk')
  bulkCreate(
    @Body()
    expenses: Array<{
      branchId: number;
      category: string;
      amount: number;
      description?: string;
      expenseDate: Date;
      createdById: number;
      paymentMethod?: string;
      referenceNo?: string;
    }>,
  ) {
    return this.expenseService.bulkCreate(expenses);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
    @Query('branchId') branchId?: string,
    @Query('category') category?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
  ) {
    const where: Prisma.ExpenseWhereInput = {};

    if (branchId) where.branchId = parseInt(branchId);
    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (paymentMethod) where.paymentMethod = paymentMethod as any;

    if (startDate && endDate) {
      where.expenseDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = parseFloat(minAmount);
      if (maxAmount) where.amount.lte = parseFloat(maxAmount);
    }

    return this.expenseService.findAll({
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
    return this.expenseService.getStats(
      branchId ? parseInt(branchId) : undefined,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('categories')
  getCategories(@Query('branchId') branchId?: string) {
    return this.expenseService.getCategories(
      branchId ? parseInt(branchId) : undefined,
    );
  }

  @Get('recent')
  findRecent(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('branchId') branchId?: string,
  ) {
    return this.expenseService.findRecent(
      limit,
      branchId ? parseInt(branchId) : undefined,
    );
  }

  @Get('summary')
  getSummaryByPeriod(
    @Query('branchId') branchId?: string,
    @Query('period') period?: 'daily' | 'weekly' | 'monthly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.expenseService.getSummaryByPeriod(
      branchId ? parseInt(branchId) : undefined,
      period,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('search')
  search(
    @Query('q') query: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
  ) {
    return this.expenseService.search(query, { skip, take });
  }

  @Get('branch/:branchId')
  findByBranch(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
  ) {
    return this.expenseService.findByBranch(branchId, { skip, take });
  }

  @Get('category/:category')
  findByCategory(
    @Param('category') category: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.expenseService.findByCategory(
      category,
      branchId ? parseInt(branchId) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.expenseService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    data: {
      category?: string;
      amount?: number;
      description?: string;
      expenseDate?: Date;
      paymentMethod?: string;
      referenceNo?: string;
    },
  ) {
    return this.expenseService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.expenseService.remove(id);
  }
}
