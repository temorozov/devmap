import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-discord';
import { VerifyCallback } from 'passport-oauth2';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import { getEnv } from '../config/env';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
    constructor(private authService: AuthService) {
        super({
            clientID: getEnv('DISCORD_CLIENT_ID'),
            clientSecret: getEnv('DISCORD_CLIENT_SECRET'),
            callbackURL: getEnv('DISCORD_CALLBACK_URL'),
            scope: ['identify', 'email'],
        });
    }

    async validate(accessToken: string, refreshToken: string, profile: Strategy.Profile, done: VerifyCallback): Promise<void> {
        const { id, email, username } = profile;
        try {
            const user = await this.authService.validateDiscordUser({
                discordId: id,
                email: email ?? '',
                name: username,
            });
            done(null, user);
        } catch (err) {
            done(err as Error);
        }
    }
}
