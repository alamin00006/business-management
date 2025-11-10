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
import { LoyaltyTransactionService } from './loyalty-transaction.service';
import { Prisma } from '@prisma/client';

@Controller('loyalty-transactions')
export class LoyaltyTransactionController {
  constructor(
    private readonly loyaltyTransactionService: LoyaltyTransactionService,
  ) {}

  @Post()
  create(
    @Body()
    data: {
      customerId: number;
      type: string;
      points: number;
      balanceAfter: number;
      reason: string;
      referenceType?: string;
      referenceId?: number;
    },
  ) {
    return this.loyaltyTransactionService.create(data);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take?: number,
    @Query('customerId') customerId?: string,
    @Query('type') type?: string,
    @Query('referenceType') referenceType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const where: Prisma.LoyaltyTransactionWhereInput = {};

    if (customerId) where.customerId = parseInt(customerId);
    if (type) where.type = type as any;
    if (referenceType) where.referenceType = referenceType as any;

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    return this.loyaltyTransactionService.findAll({
      skip,
      take,
      where,
    });
  }

  @Get('stats/program')
  getProgramStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.loyaltyTransactionService.getProgramStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('recent')
  findRecent(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('customerId') customerId?: string,
  ) {
    return this.loyaltyTransactionService.findRecent(
      limit,
      customerId ? parseInt(customerId) : undefined,
    );
  }

  @Get('search')
  search(
    @Query('q') query: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
  ) {
    return this.loyaltyTransactionService.search(query, { skip, take });
  }

  @Get('customer/:customerId')
  findByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take?: number,
  ) {
    return this.loyaltyTransactionService.findByCustomer(customerId, {
      skip,
      take,
    });
  }

  @Get('customer/:customerId/summary')
  getCustomerSummary(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.loyaltyTransactionService.getCustomerSummary(
      customerId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('type/:type')
  findByType(
    @Param('type') type: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take?: number,
  ) {
    return this.loyaltyTransactionService.findByType(type, { skip, take });
  }

  @Get('reference/:referenceType/:referenceId')
  findByReference(
    @Param('referenceType') referenceType: string,
    @Param('referenceId', ParseIntPipe) referenceId: number,
  ) {
    return this.loyaltyTransactionService.findByReference(
      referenceType,
      referenceId,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyTransactionService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.loyaltyTransactionService.remove(id);
  }
}
