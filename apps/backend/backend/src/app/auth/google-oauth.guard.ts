import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isGoogleOAuthEnabled } from './oauth-provider.config';

@Injectable()
export class GoogleOauthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    if (!isGoogleOAuthEnabled()) {
      throw new ServiceUnavailableException('Google OAuth is not configured');
    }

    return super.canActivate(context);
  }
}
