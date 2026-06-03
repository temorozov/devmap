import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { VerifyCallback } from 'passport-oauth2';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import { getEnv } from '../config/env';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
    constructor(private authService: AuthService) {
        super({
            clientID: getEnv('GITHUB_CLIENT_ID'),
            clientSecret: getEnv('GITHUB_CLIENT_SECRET'),
            callbackURL: getEnv('GITHUB_CALLBACK_URL'),
            scope: ['read:user', 'user:email', 'public_repo', 'admin:repo_hook'],
        });
    }

    async validate(accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback): Promise<void> {
        const { id, username, emails, displayName } = profile;
        const email = emails && emails.length > 0 ? emails[0].value : '';
        try {
            const user = await this.authService.validateGitHubUser({
                githubId: id,
                githubUsername: username ?? '',
                githubAccessToken: accessToken,
                email,
                name: displayName || username || '',
            });
            done(null, user);
        } catch (err) {
            done(err as Error);
        }
    }
}
