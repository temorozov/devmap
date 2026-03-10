import { Controller, Post, Body, UseGuards, Request, Get, HttpCode, HttpStatus, Req, Res, UnauthorizedException, BadRequestException } from '@nestjs/common';
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
            throw new UnauthorizedException('Invalid credentials');
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
            throw new BadRequestException('Email and password are required');
        }
        return await this.authService.registerUser(req.email, req.password);
    }

    @Post('confirm-email')
    async confirmEmail(@Body('token') token: string) {
        if (!token) {
            throw new BadRequestException('Token is required');
        }
        return await this.authService.confirmEmail(token);
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
