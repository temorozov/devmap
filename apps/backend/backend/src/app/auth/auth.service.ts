import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (user && user.passwordHash) {
            const isMatch = await bcrypt.compare(pass, user.passwordHash);
            if (isMatch) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { passwordHash, ...result } = user;
                return result;
            }
        }
        return null;
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

        const tree = await this.prisma.tree.create({
            data: {
                title: 'Guest Skill Tree',
                userId: user.id,
                sharedToken: randomBytes(16).toString('hex'),
            },
        });

        const payload = { sub: user.id, isGuest: true };
        return {
            access_token: this.jwtService.sign(payload),
            user,
            treeId: tree.id,
        };
    }
}
