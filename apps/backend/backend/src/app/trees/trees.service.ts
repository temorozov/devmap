import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class TreesService {
    constructor(private prisma: PrismaService) { }

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
}
