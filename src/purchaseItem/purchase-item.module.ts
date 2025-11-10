import { Module } from '@nestjs/common';
import { PurchaseItemService } from './purchase-item.service';
import { PurchaseItemController } from './purchase-item.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PurchaseItemController],
  providers: [PurchaseItemService],
  exports: [PurchaseItemService],
})
export class PurchaseItemModule {}
