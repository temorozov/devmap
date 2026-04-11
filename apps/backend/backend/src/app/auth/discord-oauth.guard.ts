import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isDiscordOAuthEnabled } from './oauth-provider.config';

@Injectable()
export class DiscordOauthGuard extends AuthGuard('discord') {
  canActivate(context: ExecutionContext) {
    if (!isDiscordOAuthEnabled()) {
      throw new ServiceUnavailableException('Discord OAuth is not configured');
    }

    return super.canActivate(context);
  }
}
