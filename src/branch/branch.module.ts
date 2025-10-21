import { Module } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';

@Module({
  controllers: [BranchController],
  providers: [BranchService, PrismaService],
})
export class BranchModule {}
