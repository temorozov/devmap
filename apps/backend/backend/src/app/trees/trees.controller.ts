import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ForbiddenException, Req, Res, Header, NotFoundException, Put, Query } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { createHash } from 'crypto';
import { Request as ExpressRequest, Response } from 'express';
import { TreesService } from './trees.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BatchGenerationService } from './batch-generation.service';
import { AuthenticatedRequest } from '../auth/authenticated-request';
import { CreateTreeDto } from './dto/create-tree.dto';
import { UpdateTreeDto } from './dto/update-tree.dto';
import { GenerateTreeDto } from './dto/generate-tree.dto';
import { BatchDescriptionsDto } from './dto/batch-descriptions.dto';

@Controller('trees')
export class TreesController {
    constructor(
        private readonly treesService: TreesService,
        private readonly batchGenerationService: BatchGenerationService,
    ) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Request() req: AuthenticatedRequest, @Body() createTreeDto: CreateTreeDto) {
        return this.treesService.create(req.user.id, createTreeDto.title);
    }

    @UseGuards(JwtAuthGuard, ThrottlerGuard)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post(':id/generate')
    generate(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: GenerateTreeDto) {
        if (req.user?.isGuest) throw new ForbiddenException('Guest users cannot use AI features.');
        return this.treesService.generateSkillTree(req.user.id, id, body.prompt);
    }

    @UseGuards(JwtAuthGuard, ThrottlerGuard)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post(':id/batch/descriptions')
    queueDescriptionBatch(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: BatchDescriptionsDto) {
        if (req.user?.isGuest) throw new ForbiddenException('Guest users cannot use AI features.');
        return this.batchGenerationService.queueNodeDescriptionGeneration(req.user.id, id, body?.nodeIds);
    }

    @UseGuards(JwtAuthGuard)
    @Get('batch-jobs/:jobId')
    getBatchJob(@Request() req: AuthenticatedRequest, @Param('jobId') jobId: string) {
        return this.batchGenerationService.getBatchJob(req.user.id, jobId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('batch-jobs/:jobId/sync')
    syncBatchJob(@Request() req: AuthenticatedRequest, @Param('jobId') jobId: string) {
        return this.batchGenerationService.syncBatchJob(req.user.id, jobId);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(@Request() req: AuthenticatedRequest) {
        return this.treesService.findAllByUser(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('my/view-stats')
    getMyViewStats(@Request() req: AuthenticatedRequest) {
        return this.treesService.getProfileViewStats(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('my/skills')
    getMySkills(@Request() req: AuthenticatedRequest) {
        return this.treesService.getMyVerifiedSkills(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Put('my/target-role')
    setTargetRole(@Request() req: AuthenticatedRequest, @Body() body: { roleKey: string }) {
        return this.treesService.setTargetRole(req.user.id, body.roleKey ?? '');
    }

    @UseGuards(JwtAuthGuard)
    @Post('my/jd-match')
    matchJobDescription(@Request() req: AuthenticatedRequest, @Body() body: { text: string }) {
        if (!body?.text?.trim()) return { required: 0, matched: [], missing: [], score: 0 };
        return this.treesService.matchJobDescription(req.user.id, body.text);
    }

    @Get('explore')
    getExploreProfiles() {
        return this.treesService.getExploreProfiles();
    }

    @Get('compare/:handleA/:handleB')
    compareProfiles(@Param('handleA') handleA: string, @Param('handleB') handleB: string) {
        return this.treesService.compareProfiles(handleA, handleB);
    }

    @Get('badge/:handle')
    @Header('Cache-Control', 'public, max-age=3600, s-maxage=3600')
    async getBadge(
        @Param('handle') handle: string,
        @Query('theme') theme: string,
        @Res() res: Response,
    ) {
        const data = await this.treesService.getBadgeData(handle);
        if (!data) throw new NotFoundException('Profile not found');
        const t = theme === 'light' ? 'light' : 'dark';
        const svg = this.treesService.buildSkillCardSvg(data.displayHandle, data.skills, data.totalCount, data.repoCount, t);
        res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
        res.send(svg);
    }

    @Get('og/:handle')
    @Header('Cache-Control', 'public, max-age=300')
    async getOgPage(@Param('handle') handle: string, @Res() res: Response) {
        const data = await this.treesService.getBadgeData(handle);
        if (!data) throw new NotFoundException('Profile not found');
        const backendUrl = (process.env['BACKEND_URL'] ?? process.env['FRONTEND_URL'] ?? 'https://devmap.app').replace(/\/$/, '');
        const frontendUrl = (process.env['FRONTEND_URL'] ?? 'https://devmap.app').replace(/\/$/, '');
        const profileUrl = `${frontendUrl}/u/${handle}`;
        const cardUrl = `${backendUrl}/api/badge/${data.displayHandle}?theme=dark`;
        const title = `@${data.displayHandle} — ${data.totalCount} GitHub-verified skills | DevMap`;
        const skillNames = data.skills.slice(0, 5).map(s => s.title);
        const description = skillNames.length > 0
            ? `${skillNames.join(', ')}${data.totalCount > 5 ? ` +${data.totalCount - 5} more` : ''} · verified from ${data.repoCount} GitHub repos`
            : `${data.totalCount} GitHub-verified developer skills on DevMap.`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(`<!DOCTYPE html><html><head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${cardUrl}">
<meta property="og:image:width" content="495">
<meta property="og:url" content="${profileUrl}">
<meta property="og:type" content="profile">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${cardUrl}">
<meta http-equiv="refresh" content="0;url=${profileUrl}">
</head><body></body></html>`);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
        return this.treesService.findOne(req.user.id, id);
    }

    @Get('shared/:token')
    findBySharedToken(@Param('token') token: string) {
        return this.treesService.findBySharedToken(token);
    }

    @Get('profile/:handle')
    getPublicProfile(@Param('handle') handle: string, @Req() req: ExpressRequest) {
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
            ?? req.socket?.remoteAddress
            ?? '';
        const ipHash = ip ? createHash('sha256').update(ip).digest('hex').slice(0, 16) : undefined;
        return this.treesService.getPublicProfile(handle, ipHash);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    update(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() updateTreeDto: UpdateTreeDto) {
        return this.treesService.update(req.user.id, id, updateTreeDto.title);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
        return this.treesService.remove(req.user.id, id);
    }
}
