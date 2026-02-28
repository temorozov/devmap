import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('nodes')
export class NodesController {
    constructor(private readonly nodesService: NodesService) { }

    @Post()
    create(@Request() req: any, @Body() createNodeDto: any) {
        return this.nodesService.create(req.user.id, createNodeDto);
    }

    @Get('tree/:treeId')
    findAllByTree(@Request() req: any, @Param('treeId') treeId: string) {
        return this.nodesService.findAllByTree(req.user.id, treeId);
    }

    @Patch(':id')
    update(@Request() req: any, @Param('id') id: string, @Body() updateNodeDto: any) {
        return this.nodesService.update(req.user.id, id, updateNodeDto);
    }

    @Delete(':id')
    remove(@Request() req: any, @Param('id') id: string) {
        return this.nodesService.remove(req.user.id, id);
    }
}
