import { Module } from '@nestjs/common';
import { TreesService } from './trees.service';
import { TreesController } from './trees.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiService } from './ai.service';
import { GitHubModule } from '../github/github.module';

@Module({
  imports: [PrismaModule, GitHubModule],
  controllers: [TreesController],
  providers: [TreesService, AiService],
  exports: [TreesService]
})
export class TreesModule { }
