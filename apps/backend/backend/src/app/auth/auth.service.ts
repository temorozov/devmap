import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService
    ) { }

    // Basic auth logic removed

    async validateGoogleUser(profile: { googleId: string; email: string; name: string }): Promise<any> {
        let user = profile.googleId ? await this.prisma.user.findFirst({ where: { googleId: profile.googleId } }) : null;

        if (!user && profile.email) {
            user = await this.prisma.user.findUnique({ where: { email: profile.email } });
            if (user) {
                // Link account
                user = await this.prisma.user.update({
                    where: { email: profile.email },
                    data: { googleId: profile.googleId, name: user.name || profile.name },
                });
            }
        }

        if (!user) {
            // Create new account
            user = await this.prisma.user.create({
                data: {
                    googleId: profile.googleId,
                    email: profile.email,
                    name: profile.name,
                },
            });
        }

        return user;
    }

    async validateDiscordUser(profile: { discordId: string; email: string; name: string }): Promise<any> {
        let user = profile.discordId ? await this.prisma.user.findFirst({ where: { discordId: profile.discordId } }) : null;

        if (!user && profile.email) {
            user = await this.prisma.user.findUnique({ where: { email: profile.email } });
            if (user) {
                // Link account
                user = await this.prisma.user.update({
                    where: { email: profile.email },
                    data: { discordId: profile.discordId, name: user.name || profile.name },
                });
            }
        }

        if (!user) {
            // Create new account
            user = await this.prisma.user.create({
                data: {
                    discordId: profile.discordId,
                    email: profile.email,
                    name: profile.name,
                },
            });
        }

        return user;
    }

    async login(user: any) {
        const payload = { sub: user.id, isGuest: user.isGuest };
        return {
            access_token: this.jwtService.sign(payload),
            user,
        };
    }

    async registerGuest() {
        const user = await this.prisma.user.create({
            data: {
                isGuest: true,
            },
        });

        const payload = { sub: user.id, isGuest: true };
        return {
            access_token: this.jwtService.sign(payload),
            user,
        };
    }
}
