import { Module } from '@nestjs/common';
import { LoyaltyTransactionService } from './loyalty-transaction.service';
import { LoyaltyTransactionController } from './loyalty-transaction.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LoyaltyTransactionController],
  providers: [LoyaltyTransactionService],
  exports: [LoyaltyTransactionService],
})
export class LoyaltyTransactionModule {}
