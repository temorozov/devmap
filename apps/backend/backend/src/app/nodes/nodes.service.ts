import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NodesService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, createNodeDto: { treeId: string; parentId?: string; title: string; description?: string; icon?: string; positionX: number; positionY: number; level?: number; maxLevel?: number }) {
        const tree = await this.prisma.tree.findFirst({ where: { id: createNodeDto.treeId, userId } });
        if (!tree) throw new UnauthorizedException('Tree access denied');

        return this.prisma.node.create({
            data: createNodeDto
        });
    }

    async findAllByTree(userId: string, treeId: string) {
        const tree = await this.prisma.tree.findFirst({ where: { id: treeId, userId } });
        if (!tree) throw new UnauthorizedException();

        return this.prisma.node.findMany({ where: { treeId } });
    }

    async update(userId: string, id: string, updateNodeDto: any) {
        const node = await this.prisma.node.findUnique({ where: { id }, include: { tree: true } });
        if (!node || node.tree.userId !== userId) throw new UnauthorizedException('Node access denied');

        return this.prisma.node.update({
            where: { id },
            data: updateNodeDto
        });
    }

    async remove(userId: string, id: string) {
        const node = await this.prisma.node.findUnique({ where: { id }, include: { tree: true } });
        if (!node || node.tree.userId !== userId) throw new UnauthorizedException('Node access denied');

        return this.prisma.node.delete({ where: { id } });
    }
}
