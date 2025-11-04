import { Module } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';
import { BrandsController } from './brand.controller';
import { BrandsService } from './brand.service';

@Module({
  controllers: [BrandsController],
  providers: [BrandsService, PrismaService, PrismaErrorHandler],
})
export class BranchModule {}
