import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
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
        if (req.user?.isGuest) {
            throw new ForbiddenException('Guest users cannot use AI features.');
        }
        return this.treesService.generateSkillTree(req.user.id, id, body.prompt);
    }

    @UseGuards(JwtAuthGuard, ThrottlerGuard)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post(':id/batch/descriptions')
    queueDescriptionBatch(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: BatchDescriptionsDto) {
        if (req.user?.isGuest) {
            throw new ForbiddenException('Guest users cannot use AI features.');
        }
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
    @Get(':id')
    findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
        return this.treesService.findOne(req.user.id, id);
    }

    @Get('shared/:token')
    findBySharedToken(@Param('token') token: string) {
        return this.treesService.findBySharedToken(token);
    }

    @Get('profile/:handle')
    getPublicProfile(@Param('handle') handle: string) {
        return this.treesService.getPublicProfile(handle);
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
