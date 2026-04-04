import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-discord';
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

    async validate(accessToken: string, refreshToken: string, profile: any, done: any): Promise<any> {
        const { id, email, username } = profile;
        try {
            const user = await this.authService.validateDiscordUser({
                discordId: id,
                email: email,
                name: username,
            });
            done(null, user);
        } catch (err) {
            done(err, false);
        }
    }
}
