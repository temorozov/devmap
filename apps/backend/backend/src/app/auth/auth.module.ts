import { Logger, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { DiscordStrategy } from './discord.strategy';
import { GitHubStrategy } from './github.strategy';
import { getEnv } from '../config/env';
import { GoogleOauthGuard } from './google-oauth.guard';
import { DiscordOauthGuard } from './discord-oauth.guard';
import { GitHubOauthGuard } from './github-oauth.guard';
import {
  isDiscordOAuthEnabled,
  isGoogleOAuthEnabled,
  isGitHubOAuthEnabled,
} from './oauth-provider.config';

const googleOAuthEnabled = isGoogleOAuthEnabled();
const discordOAuthEnabled = isDiscordOAuthEnabled();
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
    GoogleOauthGuard,
    DiscordOauthGuard,
    GitHubOauthGuard,
    ...(googleOAuthEnabled ? [GoogleStrategy] : []),
    ...(discordOAuthEnabled ? [DiscordStrategy] : []),
    ...(gitHubOAuthEnabled ? [GitHubStrategy] : []),
  ],
  exports: [AuthService]
})
export class AuthModule {
  private readonly logger = new Logger(AuthModule.name);

  constructor() {
    if (!googleOAuthEnabled) {
      this.logger.warn(
        'Google OAuth is disabled because required environment variables are missing.',
      );
    }

    if (!discordOAuthEnabled) {
      this.logger.warn(
        'Discord OAuth is disabled because required environment variables are missing.',
      );
    }

    if (!gitHubOAuthEnabled) {
      this.logger.warn(
        'GitHub OAuth is disabled because required environment variables are missing.',
      );
    }
  }
}
