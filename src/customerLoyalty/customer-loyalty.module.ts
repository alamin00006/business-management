import { Module } from '@nestjs/common';
import { CustomerLoyaltyService } from './customer-loyalty.service';
import { CustomerLoyaltyController } from './customer-loyalty.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerLoyaltyController],
  providers: [CustomerLoyaltyService],
  exports: [CustomerLoyaltyService],
})
export class CustomerLoyaltyModule {}
