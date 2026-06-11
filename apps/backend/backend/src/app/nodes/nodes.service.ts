import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { mapToSkill } from '../github/skill-taxonomy';

const STACK_ROOT_TITLE = 'Dev Skills';

type ExistingNode = {
    id: string;
    title: string;
    parentId: string | null;
    createdAt: Date;
};

function inferManualParentId(title: string, existingNodes: ExistingNode[]): string | null {
    const skill = mapToSkill(title);
    const prerequisites = skill?.prerequisites ?? [];
    if (!prerequisites.length) return null;

    const canonicalNodes = existingNodes
        .map((node) => ({ ...node, canonicalTitle: mapToSkill(node.title)?.canonicalTitle ?? null }))
        .filter((node): node is ExistingNode & { canonicalTitle: string } => node.canonicalTitle !== null);
    const existingTitles = new Set(canonicalNodes.map((node) => node.canonicalTitle));
    const candidatePrereqs = prerequisites.filter((prereq) => existingTitles.has(prereq));
    if (!candidatePrereqs.length) return null;

    const prereqsByTitle = new Map<string, string[]>();
    for (const node of canonicalNodes) {
        prereqsByTitle.set(
            node.canonicalTitle,
            (mapToSkill(node.canonicalTitle)?.prerequisites ?? []).filter(
                (prereq) => prereq !== node.canonicalTitle && existingTitles.has(prereq),
            ),
        );
    }

    const depthCache = new Map<string, number>();
    const computeDepth = (canonicalTitle: string, stack: Set<string>): number => {
        const cached = depthCache.get(canonicalTitle);
        if (cached !== undefined) return cached;
        if (stack.has(canonicalTitle)) return 0;
        stack.add(canonicalTitle);

        const prereqs = prereqsByTitle.get(canonicalTitle) ?? [];
        const depth = prereqs.length === 0
            ? 0
            : 1 + Math.max(...prereqs.map((prereq) => computeDepth(prereq, stack)));

        stack.delete(canonicalTitle);
        depthCache.set(canonicalTitle, depth);
        return depth;
    };

    for (const canonicalTitle of existingTitles) computeDepth(canonicalTitle, new Set());

    const bestPrerequisite = candidatePrereqs.reduce((best, prereq) => {
        const bestDepth = depthCache.get(best) ?? 0;
        const prereqDepth = depthCache.get(prereq) ?? 0;
        if (prereqDepth !== bestDepth) return prereqDepth > bestDepth ? prereq : best;
        return prereq.localeCompare(best) < 0 ? prereq : best;
    });

    const parentNode = canonicalNodes
        .filter((node) => node.canonicalTitle === bestPrerequisite)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

    return parentNode?.id ?? null;
}

@Injectable()
export class NodesService {
    private readonly logger = new Logger(NodesService.name);

    constructor(private prisma: PrismaService) { }

    async create(userId: string, createNodeDto: CreateNodeDto) {
        const tree = await this.prisma.tree.findFirst({ where: { id: createNodeDto.treeId, userId } });
        if (!tree) throw new UnauthorizedException('Tree access denied');

        const existingNodes = await this.prisma.node.findMany({
            where: { treeId: tree.id },
            select: { id: true, title: true, parentId: true, createdAt: true },
        });
        const requestedParent = createNodeDto.parentId ?? null;
        const inferredParentId = createNodeDto.title === STACK_ROOT_TITLE
            ? null
            : inferManualParentId(createNodeDto.title, existingNodes);
        const parentId = inferredParentId ?? requestedParent;

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
                parentId,
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
