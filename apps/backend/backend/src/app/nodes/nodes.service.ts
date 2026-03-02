import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NodesService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, createNodeDto: { treeId: string; parentId?: string; title: string; description?: string; icon?: string; positionX: number; positionY: number; level?: number; maxLevel?: number }) {
        const tree = await this.prisma.tree.findFirst({ where: { id: createNodeDto.treeId, userId } });
        if (!tree) throw new UnauthorizedException('Tree access denied');

        const node = await this.prisma.node.create({
            data: createNodeDto
        });
        await this.recordActivity(tree.id);
        return node;
    }

    async findAllByTree(userId: string, treeId: string) {
        const tree = await this.prisma.tree.findFirst({ where: { id: treeId, userId } });
        if (!tree) throw new UnauthorizedException();

        return this.prisma.node.findMany({ where: { treeId } });
    }

    async update(userId: string, id: string, updateNodeDto: any) {
        const node = await this.prisma.node.findUnique({ where: { id }, include: { tree: true } });
        if (!node || node.tree.userId !== userId) throw new UnauthorizedException('Node access denied');

        const result = await this.prisma.node.update({
            where: { id },
            data: updateNodeDto
        });
        await this.recordActivity(node.treeId);
        return result;
    }

    async remove(userId: string, id: string) {
        const node = await this.prisma.node.findUnique({ where: { id }, include: { tree: true } });
        if (!node || node.tree.userId !== userId) throw new UnauthorizedException('Node access denied');

        const result = await this.prisma.node.delete({ where: { id } });
        await this.recordActivity(node.treeId);
        await this.recordActivity(node.treeId);
        return result;
    }

    private async recordActivity(treeId: string) {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        await this.prisma.treeActivity.upsert({
            where: {
                treeId_date: {
                    treeId,
                    date: today
                }
            },
            update: {
                count: { increment: 1 }
            },
            create: {
                treeId,
                date: today,
                count: 1
            }
        }).catch((e: any) => console.error('Failed to record activity', e));
    }
}

