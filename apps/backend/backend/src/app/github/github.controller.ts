import { Controller, Post, UseGuards, Req, RawBodyRequest, Headers, HttpCode, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-request';
import { GitHubSyncService } from './github-sync.service';
import { getOptionalEnv } from '../config/env';

@Controller('github')
export class GitHubController {
  private readonly logger = new Logger(GitHubController.name);
  private readonly webhookSecret = getOptionalEnv('GITHUB_WEBHOOK_SECRET');

  constructor(private readonly syncService: GitHubSyncService) {}

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async syncDevMap(@Req() req: AuthenticatedRequest) {
    return this.syncService.syncUserDevMap(req.user.id);
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-event') event: string,
  ) {
    if (!this.webhookSecret) {
      throw new ServiceUnavailableException('Webhooks not configured');
    }

    const rawBody = req.rawBody;

    if (!rawBody) {
      throw new BadRequestException('No raw body');
    }

    // Verify HMAC signature
    const expected = 'sha256=' + createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    const sigBuf = Buffer.from(signature ?? '');
    const expBuf = Buffer.from(expected);

    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      this.logger.warn('Invalid webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    if (event !== 'push') {
      return { ok: true };
    }

    const payload = JSON.parse(rawBody.toString('utf-8'));
    const repoFullName: string = payload?.repository?.full_name;

    if (!repoFullName) return { ok: true };

    this.logger.log(`Push event for repo: ${repoFullName}`);

    // Find user who owns this repo (has it in their webhook table)
    await this.syncService.syncByRepo(repoFullName);

    return { ok: true };
  }
}
