import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function isAutoSyncedHandle(user: User): boolean {
    if (!user.handle || !user.githubUsername) return true;
    return user.handle.toLowerCase() === user.githubUsername.toLowerCase();
}

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
        if (user) {
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: providerUpdate(user),
            });
        }

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
                handle: isAutoSyncedHandle(existingUser) ? profile.githubUsername : existingUser.handle,
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

    async getMe(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, handle: true, githubUsername: true, email: true, isGuest: true },
        });
        return user;
    }

    async login(user: User) {
        const payload = {
            sub: user.id,
            isGuest: user.isGuest,
            handle: user.handle ?? null,
            githubUsername: user.githubUsername ?? null,
        };
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
