import { Module } from '@nestjs/common';

import { RoleController } from './role.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoleService } from './role.service';

@Module({
  controllers: [RoleController],
  providers: [RoleService, PrismaService],
})
export class RoleModule {}
