import { Module } from '@nestjs/common';
import { SaleItemService } from './sale-item.service';
import { SaleItemController } from './sale-item.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SaleItemController],
  providers: [SaleItemService],
  exports: [SaleItemService],
})
export class SaleItemModule {}
