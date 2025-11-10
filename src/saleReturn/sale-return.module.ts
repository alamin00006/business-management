import { Module } from '@nestjs/common';
import { SaleReturnService } from './sale-return.service';
import { SaleReturnController } from './sale-return.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SaleReturnController],
  providers: [SaleReturnService],
  exports: [SaleReturnService],
})
export class SaleReturnModule {}
