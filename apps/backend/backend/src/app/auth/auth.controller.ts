import { Controller, Post, UseGuards, Request, Get, Req, Res } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Response as ExpressResponse } from 'express';
import { getEnv } from '../config/env';
import { GitHubOauthGuard } from './github-oauth.guard';
import { AuthenticatedRequest } from './authenticated-request';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @UseGuards(ThrottlerGuard)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Post('guest')
    async createGuest() {
        return this.authService.registerGuest();
    }

    @Get('github')
    @UseGuards(GitHubOauthGuard)
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    githubAuth() {}

    @Get('github/callback')
    @UseGuards(GitHubOauthGuard)
    async githubAuthRedirect(@Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
        const result = await this.authService.login(req.user);
        const frontendUrl = getEnv('FRONTEND_URL');
        // Pass scan=1 so the dashboard auto-triggers GitHub scan for new GitHub connections
        res.redirect(`${frontendUrl}/login?token=${result.access_token}&scan=1`);
    }

    // Returns current authenticated user's profile info (fresh from DB, not just JWT)
    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Request() req: AuthenticatedRequest) {
        return this.authService.getMe(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req: AuthenticatedRequest) {
        return req.user;
    }
}
