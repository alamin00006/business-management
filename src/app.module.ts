import { Module } from '@nestjs/common';

import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { SocketService } from './socket.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    UserModule,
    PrismaModule,
  ],
  // controllers: [AppController],
  providers: [SocketService],
})
export class AppModule {}
