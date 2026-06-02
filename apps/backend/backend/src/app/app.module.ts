import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TreesModule } from './trees/trees.module';
import { NodesModule } from './nodes/nodes.module';
import { EmailModule } from './email/email.module';
import { GitHubModule } from './github/github.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule, AuthModule, TreesModule, NodesModule, EmailModule, GitHubModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
