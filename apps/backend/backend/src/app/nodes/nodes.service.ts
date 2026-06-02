import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';

@Injectable()
export class NodesService {
    private readonly logger = new Logger(NodesService.name);

    constructor(private prisma: PrismaService) { }

    async create(userId: string, createNodeDto: CreateNodeDto) {
        const tree = await this.prisma.tree.findFirst({ where: { id: createNodeDto.treeId, userId } });
        if (!tree) throw new UnauthorizedException('Tree access denied');

        const maxLevel = createNodeDto.maxLevel && createNodeDto.maxLevel > 0
            ? createNodeDto.maxLevel
            : 3;
        const level = createNodeDto.level ?? 0;
        const incomingProgress = createNodeDto.progress;
        const progress = typeof incomingProgress === 'number'
            ? incomingProgress
            : Math.round((level / maxLevel) * 100);

        const node = await this.prisma.node.create({
            data: {
                ...createNodeDto,
                level,
                maxLevel,
                progress
            }
        });
        await this.recordActivity(tree.id);
        return node;
    }

    async findAllByTree(userId: string, treeId: string) {
        const tree = await this.prisma.tree.findFirst({ where: { id: treeId, userId } });
        if (!tree) throw new UnauthorizedException();

        return this.prisma.node.findMany({ where: { treeId } });
    }

    async update(userId: string, id: string, updateNodeDto: UpdateNodeDto) {
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
        }).catch((e: unknown) => this.logger.error('Failed to record activity', e instanceof Error ? e.stack : String(e)));
    }
}
