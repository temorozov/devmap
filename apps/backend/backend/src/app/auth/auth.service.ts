import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService
    ) { }

    private async upsertOAuthUser(
        findByProvider: () => Promise<User | null>,
        providerUpdate: (existingUser: User) => Prisma.UserUpdateInput,
        createData: Prisma.UserCreateInput,
    ): Promise<User> {
        let user = await findByProvider();

        if (!user && createData.email) {
            user = await this.prisma.user.findUnique({ where: { email: createData.email as string } });
            if (user) {
                user = await this.prisma.user.update({
                    where: { email: createData.email as string },
                    data: providerUpdate(user),
                });
            }
        }

        if (!user) {
            user = await this.prisma.user.create({ data: createData });
        }

        return user;
    }

    async validateGoogleUser(profile: { googleId: string; email: string; name: string }): Promise<User> {
        return this.upsertOAuthUser(
            () => profile.googleId ? this.prisma.user.findFirst({ where: { googleId: profile.googleId } }) : Promise.resolve(null),
            (existingUser) => ({ googleId: profile.googleId, name: existingUser.name || profile.name }),
            { googleId: profile.googleId, email: profile.email, name: profile.name },
        );
    }

    async validateDiscordUser(profile: { discordId: string; email: string; name: string }): Promise<User> {
        return this.upsertOAuthUser(
            () => profile.discordId ? this.prisma.user.findFirst({ where: { discordId: profile.discordId } }) : Promise.resolve(null),
            (existingUser) => ({ discordId: profile.discordId, name: existingUser.name || profile.name }),
            { discordId: profile.discordId, email: profile.email, name: profile.name },
        );
    }

    async validateGitHubUser(profile: {
        githubId: string;
        githubUsername: string;
        githubAccessToken: string;
        email: string;
        name: string;
    }): Promise<User> {
        return this.upsertOAuthUser(
            () => profile.githubId ? this.prisma.user.findFirst({ where: { githubId: profile.githubId } }) : Promise.resolve(null),
            (existingUser) => ({
                githubId: profile.githubId,
                githubUsername: profile.githubUsername,
                githubAccessToken: profile.githubAccessToken,
                name: existingUser.name || profile.name,
            }),
            {
                githubId: profile.githubId,
                githubUsername: profile.githubUsername,
                githubAccessToken: profile.githubAccessToken,
                email: profile.email || undefined,
                name: profile.name,
                handle: profile.githubUsername || undefined,
            },
        );
    }

    async login(user: User) {
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
