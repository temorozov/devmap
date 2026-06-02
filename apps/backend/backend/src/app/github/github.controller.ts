import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-request';
import { GitHubSyncService } from './github-sync.service';

@Controller('github')
export class GitHubController {
  constructor(private readonly syncService: GitHubSyncService) {}

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async syncDevMap(@Req() req: AuthenticatedRequest) {
    return this.syncService.syncUserDevMap(req.user.id);
  }
}
