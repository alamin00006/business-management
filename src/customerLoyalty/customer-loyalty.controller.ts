import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { CustomerLoyaltyService } from './customer-loyalty.service';

@Controller('customer-loyalty')
export class CustomerLoyaltyController {
  constructor(
    private readonly customerLoyaltyService: CustomerLoyaltyService,
  ) {}

  @Post('initialize/:customerId')
  initialize(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.customerLoyaltyService.initialize(customerId);
  }

  @Post('add-points/:customerId')
  addPoints(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() data: { points: number; reason: string; referenceId?: number },
  ) {
    return this.customerLoyaltyService.addPoints(
      customerId,
      data.points,
      data.reason,
      data.referenceId,
    );
  }

  @Post('redeem-points/:customerId')
  redeemPoints(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() data: { points: number; reason: string; referenceId?: number },
  ) {
    return this.customerLoyaltyService.redeemPoints(
      customerId,
      data.points,
      data.reason,
      data.referenceId,
    );
  }

  @Post('adjust-points/:customerId')
  adjustPoints(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() data: { points: number; reason: string },
  ) {
    return this.customerLoyaltyService.adjustPoints(
      customerId,
      data.points,
      data.reason,
    );
  }

  @Post('process-sale-points/:saleId')
  processSalePoints(@Param('saleId', ParseIntPipe) saleId: number) {
    return this.customerLoyaltyService.processSalePoints(saleId);
  }

  @Post('reset-account/:customerId')
  resetAccount(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() data: { reason: string },
  ) {
    return this.customerLoyaltyService.resetAccount(customerId, data.reason);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
    @Query('minPoints') minPoints?: string,
  ) {
    const where: any = {};
    if (minPoints) {
      where.pointsBalance = {
        gte: parseInt(minPoints),
      };
    }

    return this.customerLoyaltyService.findAll({
      skip,
      take,
      where,
    });
  }

  @Get('stats')
  getStats() {
    return this.customerLoyaltyService.getStats();
  }

  @Get('top-customers')
  getTopCustomers(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    return this.customerLoyaltyService.getTopCustomers(limit);
  }

  @Get('customer/:customerId')
  findByCustomer(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.customerLoyaltyService.findByCustomer(customerId);
  }

  @Get('customer/:customerId/history')
  getCustomerHistory(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take?: number,
  ) {
    return this.customerLoyaltyService.getCustomerHistory(customerId, {
      skip,
      take,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customerLoyaltyService.findOne(id);
  }
}
