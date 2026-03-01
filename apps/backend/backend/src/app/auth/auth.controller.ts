import { Controller, Post, Body, UseGuards, Request, Get, HttpCode, HttpStatus, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() req: any) {
        const user = await this.authService.validateUser(req.email, req.password);
        if (!user) {
            return { status: 401, message: 'Invalid credentials' };
        }
        return this.authService.login(user);
    }

    @Post('guest')
    async createGuest() {
        return this.authService.registerGuest();
    }

    @Post('register')
    async register(@Body() req: any) {
        if (!req.email || !req.password) {
            return { status: 400, message: 'Email and password are required' };
        }
        try {
            return await this.authService.registerUser(req.email, req.password);
        } catch (error: any) {
            return { status: HttpStatus.CONFLICT, message: error.message };
        }
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
        // Redirect to frontend with token
        res.redirect(`http://localhost:4200/login?token=${result.access_token}`);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req: any) {
        return req.user;
    }
}
