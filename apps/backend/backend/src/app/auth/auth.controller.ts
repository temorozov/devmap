import { Controller, Post, UseGuards, Request, Get, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Response as ExpressResponse } from 'express';
import { getEnv } from '../config/env';
import { GoogleOauthGuard } from './google-oauth.guard';
import { DiscordOauthGuard } from './discord-oauth.guard';
import { AuthenticatedRequest } from './authenticated-request';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    // Removed basic auth endpoints

    @Post('guest')
    async createGuest() {
        return this.authService.registerGuest();
    }

    @Get('google')
    @UseGuards(GoogleOauthGuard)
    async googleAuth() {
        // Initiates the Google OAuth flow
    }

    @Get('google/callback')
    @UseGuards(GoogleOauthGuard)
    async googleAuthRedirect(@Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
        const result = await this.authService.login(req.user);
        const frontendUrl = getEnv('FRONTEND_URL');
        res.redirect(`${frontendUrl}/login?token=${result.access_token}`);
    }

    @Get('discord')
    @UseGuards(DiscordOauthGuard)
    async discordAuth() {
        // Initiates the Discord OAuth flow
    }

    @Get('discord/callback')
    @UseGuards(DiscordOauthGuard)
    async discordAuthRedirect(@Req() req: AuthenticatedRequest, @Res() res: ExpressResponse) {
        const result = await this.authService.login(req.user);
        const frontendUrl = getEnv('FRONTEND_URL');
        res.redirect(`${frontendUrl}/login?token=${result.access_token}`);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req: AuthenticatedRequest) {
        return req.user;
    }
}
