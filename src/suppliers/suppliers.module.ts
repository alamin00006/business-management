import { Module } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';

import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService, PrismaService, PrismaErrorHandler],
})
export class SupplierModule {}
