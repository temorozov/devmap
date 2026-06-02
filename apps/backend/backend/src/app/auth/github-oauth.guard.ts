import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isGitHubOAuthEnabled } from './oauth-provider.config';

@Injectable()
export class GitHubOauthGuard extends AuthGuard('github') {
  canActivate(context: ExecutionContext) {
    if (!isGitHubOAuthEnabled()) {
      throw new ServiceUnavailableException('GitHub OAuth is not configured');
    }

    return super.canActivate(context);
  }
}
