import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { TreesService } from './trees.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('trees')
export class TreesController {
    constructor(private readonly treesService: TreesService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Request() req: any, @Body() createTreeDto: { title: string }) {
        return this.treesService.create(req.user.id, createTreeDto.title);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/generate')
    generate(@Request() req: any, @Param('id') id: string, @Body() body: { prompt: string }) {
        if (req.user?.isGuest) {
            throw new ForbiddenException('Guest users cannot use AI features.');
        }
        return this.treesService.generateSkillTree(req.user.id, id, body.prompt);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(@Request() req: any) {
        return this.treesService.findAllByUser(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.treesService.findOne(req.user.id, id);
    }

    @Get('shared/:token')
    findBySharedToken(@Param('token') token: string) {
        return this.treesService.findBySharedToken(token);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    update(@Request() req: any, @Param('id') id: string, @Body() updateTreeDto: { title: string }) {
        return this.treesService.update(req.user.id, id, updateTreeDto.title);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    remove(@Request() req: any, @Param('id') id: string) {
        return this.treesService.remove(req.user.id, id);
    }
}
