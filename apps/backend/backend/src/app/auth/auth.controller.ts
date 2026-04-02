import { Controller, Post, Body, UseGuards, Request, Get, HttpCode, HttpStatus, Req, Res, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    // Removed basic auth endpoints

    @Post('guest')
    async createGuest() {
        return this.authService.registerGuest();
    }

    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth(@Req() req: ExpressRequest) {
        // Initiates the Google OAuth flow
    }

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthRedirect(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
        const result = await this.authService.login((req as any).user);
        res.redirect(`http://localhost:4200/login?token=${result.access_token}`);
    }

    @Get('discord')
    @UseGuards(AuthGuard('discord'))
    async discordAuth(@Req() req: ExpressRequest) {
        // Initiates the Discord OAuth flow
    }

    @Get('discord/callback')
    @UseGuards(AuthGuard('discord'))
    async discordAuthRedirect(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
        const result = await this.authService.login((req as any).user);
        res.redirect(`http://localhost:4200/login?token=${result.access_token}`);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req: any) {
        return req.user;
    }
}
