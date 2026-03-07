import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly emailService: EmailService
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (user && user.passwordHash) {
            const isMatch = await bcrypt.compare(pass, user.passwordHash);
            if (isMatch) {
                if (!user.isEmailConfirmed) {
                    throw new UnauthorizedException('Please confirm your email address before logging in.');
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { passwordHash, ...result } = user;
                return result;
            }
        }
        return null;
    }

    async registerUser(email: string, pass: string): Promise<any> {
        const existingUser = await this.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new ConflictException('User already exists');
        }

        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(pass, salt);
        const emailConfirmationToken = randomBytes(32).toString('hex');

        const user = await this.prisma.user.create({
            data: { 
                email, 
                passwordHash,
                isEmailConfirmed: false,
                emailConfirmationToken
            },
        });

        await this.emailService.sendConfirmationEmail(email, emailConfirmationToken);

        return {
            status: 200,
            message: 'Registration successful. Please check your email to confirm your account.',
        };
    }

    async confirmEmail(token: string) {
        const user = await this.prisma.user.findFirst({ where: { emailConfirmationToken: token } });
        if (!user) {
            throw new UnauthorizedException('Invalid or expired confirmation token');
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: { isEmailConfirmed: true, emailConfirmationToken: null },
        });

        return { message: 'Email confirmed successfully' };
    }

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
