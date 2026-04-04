import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import { getEnv } from '../config/env';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(private authService: AuthService) {
        super({
            clientID: getEnv('GOOGLE_CLIENT_ID'),
            clientSecret: getEnv('GOOGLE_CLIENT_SECRET'),
            callbackURL: getEnv('GOOGLE_CALLBACK_URL'),
            scope: ['email', 'profile'],
        });
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
        const { id, emails, displayName } = profile;
        const email = emails && emails.length > 0 ? emails[0].value : null;
        try {
            const user = await this.authService.validateGoogleUser({
                googleId: id,
                email: email,
                name: displayName,
            });
            done(null, user);
        } catch (err) {
            done(err, false);
        }
    }
}
