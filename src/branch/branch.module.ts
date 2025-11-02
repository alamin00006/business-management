import { Module } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';

@Module({
  controllers: [BranchController],
  providers: [BranchService, PrismaService, PrismaErrorHandler],
})
export class BranchModule {}
