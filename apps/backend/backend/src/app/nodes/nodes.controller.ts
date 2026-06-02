import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-request';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';

@UseGuards(JwtAuthGuard)
@Controller('nodes')
export class NodesController {
    constructor(private readonly nodesService: NodesService) { }

    @Post()
    create(@Request() req: AuthenticatedRequest, @Body() createNodeDto: CreateNodeDto) {
        return this.nodesService.create(req.user.id, createNodeDto);
    }

    @Get('tree/:treeId')
    findAllByTree(@Request() req: AuthenticatedRequest, @Param('treeId') treeId: string) {
        return this.nodesService.findAllByTree(req.user.id, treeId);
    }

    @Patch(':id')
    update(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() updateNodeDto: UpdateNodeDto) {
        return this.nodesService.update(req.user.id, id, updateNodeDto);
    }

    @Delete(':id')
    remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
        return this.nodesService.remove(req.user.id, id);
    }
}
