import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TreesModule } from './trees/trees.module';
import { NodesModule } from './nodes/nodes.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // In Docker, env vars are injected via docker-compose env_file — skip file loading.
      // Locally, load from .env or .env.production as before.
      ignoreEnvFile: Boolean(process.env['DOCKER_ENV']),
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
    }),
    PrismaModule, AuthModule, TreesModule, NodesModule, EmailModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
