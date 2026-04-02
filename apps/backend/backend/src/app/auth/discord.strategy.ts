import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-discord';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
    constructor(private authService: AuthService) {
        super({
            clientID: process.env['DISCORD_CLIENT_ID'] || 'placeholder-client-id',
            clientSecret: process.env['DISCORD_CLIENT_SECRET'] || 'placeholder-client-secret',
            callbackURL: process.env['DISCORD_CALLBACK_URL'] || 'http://localhost:3000/api/auth/discord/callback',
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
