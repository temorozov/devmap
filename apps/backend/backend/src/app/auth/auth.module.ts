import { Logger, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtStrategy } from './jwt.strategy';
import { GitHubStrategy } from './github.strategy';
import { getEnv } from '../config/env';
import { GitHubOauthGuard } from './github-oauth.guard';
import { isGitHubOAuthEnabled } from './oauth-provider.config';

const gitHubOAuthEnabled = isGitHubOAuthEnabled();

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: getEnv('JWT_SECRET'),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GitHubOauthGuard,
    ...(gitHubOAuthEnabled ? [GitHubStrategy] : []),
  ],
  exports: [AuthService]
})
export class AuthModule {
  private readonly logger = new Logger(AuthModule.name);

  constructor() {
    if (!gitHubOAuthEnabled) {
      this.logger.warn(
        'GitHub OAuth is disabled because required environment variables are missing.',
      );
    }
  }
}
