import { Module } from '@nestjs/common';
import { GitHubService } from './github.service';
import { GitHubSyncService } from './github-sync.service';
import { GitHubController } from './github.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [GitHubController],
  providers: [GitHubService, GitHubSyncService],
  exports: [GitHubService, GitHubSyncService],
})
export class GitHubModule {}
