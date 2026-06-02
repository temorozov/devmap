import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from './ai.service';
import { randomBytes } from 'crypto';

@Injectable()
export class TreesService {
    constructor(private prisma: PrismaService, private aiService: AiService) { }

    async create(userId: string, title: string) {
        return this.prisma.tree.create({
            data: {
                userId,
                title,
                sharedToken: randomBytes(16).toString('hex')
            }
        });
    }

    async findAllByUser(userId: string) {
        return this.prisma.tree.findMany({
            where: { userId },
            include: { activities: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(userId: string, id: string) {
        const tree = await this.prisma.tree.findFirst({
            where: { id, userId },
            include: { nodes: true, activities: true }
        });
        if (!tree) throw new NotFoundException('Tree not found');
        return tree;
    }

    async findBySharedToken(token: string) {
        const tree = await this.prisma.tree.findUnique({
            where: { sharedToken: token },
            include: { nodes: true, activities: true }
        });
        if (!tree) throw new NotFoundException('Shared tree not found');
        return tree;
    }

    async update(userId: string, id: string, title: string) {
        return this.prisma.tree.update({
            where: { id, userId }, // Ensure user owns tree
            data: { title }
        }).catch(() => { throw new NotFoundException('Tree not found'); });
    }

    async remove(userId: string, id: string) {
        return this.prisma.tree.delete({
            where: { id, userId } // Cascade on nodes is set in schema
        }).catch(() => { throw new NotFoundException('Tree not found'); });
    }

    async generateSkillTree(userId: string, treeId: string, prompt: string) {
        const tree = await this.prisma.tree.findFirst({ where: { id: treeId, userId } });
        if (!tree) throw new NotFoundException('Tree not found');

        const generatedSkills = await this.aiService.generateSkillTree(prompt);

        try {
            return await this.prisma.$transaction(async (tx) => {
                const createdNodes = [];
                const idMap = new Map<number, string>();
                const depthMap = new Map<number, number>();
                const childrenMap = new Map<number, number[]>();

                generatedSkills.forEach((skill, index) => {
                    if (skill.parentIndex !== null && skill.parentIndex >= 0) {
                        const siblings = childrenMap.get(skill.parentIndex) ?? [];
                        siblings.push(index);
                        childrenMap.set(skill.parentIndex, siblings);
                    }
                });

                const calcDepth = (index: number, depth: number) => {
                    depthMap.set(index, depth);
                    const children = childrenMap.get(index) || [];
                    children.forEach(childIndex => calcDepth(childIndex, depth + 1));
                };

                generatedSkills.forEach((skill, index) => {
                    if (skill.parentIndex === null || skill.parentIndex < 0) {
                        calcDepth(index, 0);
                    }
                });

                const depthCounters = new Map<number, number>();
                
                // Calculate total width per depth for centering
                const depthTotalWidth = new Map<number, number>();
                for (let i = 0; i < generatedSkills.length; i++) {
                    const depth = depthMap.get(i) || 0;
                    depthTotalWidth.set(depth, (depthTotalWidth.get(depth) || 0) + 1);
                }

                const NODE_SPACING_X = 250;
                const NODE_SPACING_Y = -150; // Grow upwards like the UI does
                const ROOT_X = 1000;
                const ROOT_Y = 1500;

                for (let i = 0; i < generatedSkills.length; i++) {
                    const skill = generatedSkills[i];
                    const depth = depthMap.get(i) || 0;
                    
                    const horizontalIndex = depthCounters.get(depth) || 0;
                    depthCounters.set(depth, horizontalIndex + 1);

                    const totalInDepth = depthTotalWidth.get(depth) || 1;
                    const offsetX = (horizontalIndex - (totalInDepth - 1) / 2) * NODE_SPACING_X;

                    const positionX = ROOT_X + offsetX;
                    const positionY = ROOT_Y + (depth * NODE_SPACING_Y);

                    let parentId: string | null = null;
                    if (skill.parentIndex !== null) {
                        parentId = idMap.get(skill.parentIndex) ?? null;
                    }

                    const node = await tx.node.create({
                        data: {
                            treeId,
                            parentId,
                            title: skill.title || 'Untitled Skill',
                            description: skill.description || '',
                            icon: skill.icon || 'star',
                            positionX,
                            positionY,
                            level: 0,
                            maxLevel: 3
                        }
                    });
                    
                    idMap.set(i, node.id);
                    createdNodes.push(node);
                }

                return createdNodes;
            });
        } catch (error) {
            console.error('[Trees Service] Error inside transaction during tree generation:', error);
            throw new InternalServerErrorException('Database failed to save generated skills.');
        }
    }
}
