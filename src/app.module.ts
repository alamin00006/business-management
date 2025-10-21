import { Module } from '@nestjs/common';

import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { SocketService } from './socket.service';
import { PrismaModule } from './prisma/prisma.module';
import { RoleModule } from './role/role.module';
import { BranchModule } from './branch/branch.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    UserModule,
    RoleModule,
    BranchModule,
  ],
  // controllers: [AppController],
  providers: [SocketService],
})
export class AppModule {}
