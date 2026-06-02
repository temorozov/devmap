import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GitHubService } from './github.service';
import { computeTreeLayout } from './tree-layout.util';
import { DetectedTech } from './github.types';
import { Prisma } from '@prisma/client';

const DEV_MAP_TITLE = 'My Dev Map';

@Injectable()
export class GitHubSyncService {
  private readonly logger = new Logger(GitHubSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly github: GitHubService,
  ) {}

  async syncUserDevMap(userId: string): Promise<{ nodeCount: number; verifiedCount: number }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.githubAccessToken || !user.githubUsername) {
      throw new NotFoundException('GitHub account not connected or token missing.');
    }

    this.logger.log(`Starting GitHub sync for user ${userId} (@${user.githubUsername})`);

    const detectedTechs = await this.github.detectTechnologies(user.githubAccessToken, user.githubUsername);

    this.logger.log(`Detected ${detectedTechs.length} technologies for user ${userId}`);

    // Upsert the dev map tree
    let tree = await this.prisma.tree.findFirst({
      where: { userId, title: DEV_MAP_TITLE },
    });

    if (!tree) {
      const { randomBytes } = await import('crypto');
      tree = await this.prisma.tree.create({
        data: {
          userId,
          title: DEV_MAP_TITLE,
          sharedToken: randomBytes(16).toString('hex'),
        },
      });
    }

    const treeId = tree.id;

    // Build layout input from detected skills (flatten by category groups)
    const layoutInput = this.buildLayoutNodes(detectedTechs);

    const positions = computeTreeLayout(layoutInput.map((n) => ({ parentIndex: n.parentIndex })));

    await this.prisma.$transaction(async (tx) => {
      // Delete existing verified/github nodes to re-sync cleanly
      await tx.node.deleteMany({ where: { treeId, source: 'github' } });

      const idMap = new Map<string, string>();

      for (let i = 0; i < layoutInput.length; i++) {
        const item = layoutInput[i];
        const pos = positions[i];
        const tech = item.tech;

        let parentId: string | null = null;
        if (item.parentTitle && idMap.has(item.parentTitle)) {
          parentId = idMap.get(item.parentTitle)!;
        }

        const evidence = tech
          ? tech.repos.map((r) => ({ repo: r.name, url: r.url, evidence: r.evidence }))
          : [];

        const node = await tx.node.create({
          data: {
            treeId,
            parentId,
            title: item.title,
            description: tech ? this.buildDescription(tech) : '',
            icon: item.icon,
            positionX: pos.positionX,
            positionY: pos.positionY,
            level: tech ? Math.min(tech.repos.length, 3) : 0,
            maxLevel: 3,
            progress: tech ? Math.min(Math.round((tech.repos.length / 3) * 100), 100) : 0,
            verified: !!tech,
            source: 'github',
            evidence: evidence.length ? (evidence as Prisma.InputJsonValue) : Prisma.JsonNull,
          },
        });

        idMap.set(item.title, node.id);
      }
    });

    // Record scan
    await this.prisma.gitHubScan.create({
      data: {
        userId,
        repoCount: detectedTechs.reduce((sum, t) => sum + t.repos.length, 0),
        techCount: detectedTechs.length,
        summary: detectedTechs.map((t) => ({ title: t.canonicalTitle, category: t.category, repos: t.repos.length })) as Prisma.InputJsonValue,
      },
    });

    const verifiedCount = detectedTechs.length;
    this.logger.log(`Sync complete for user ${userId}: ${layoutInput.length} nodes, ${verifiedCount} verified`);

    return { nodeCount: layoutInput.length, verifiedCount };
  }

  private buildLayoutNodes(techs: DetectedTech[]): Array<{
    title: string;
    icon: string;
    parentTitle: string | null;
    parentIndex: number | null;
    tech: DetectedTech | null;
  }> {
    // Group by category, category header = parent node
    const categoryMap = new Map<string, DetectedTech[]>();
    for (const tech of techs) {
      const existing = categoryMap.get(tech.category) ?? [];
      existing.push(tech);
      categoryMap.set(tech.category, existing);
    }

    const CATEGORY_ICONS: Record<string, string> = {
      language: 'code',
      frontend: 'web',
      backend: 'dns',
      database: 'storage',
      devops: 'cloud',
      mobile: 'smartphone',
      testing: 'science',
      tooling: 'settings',
    };

    const CATEGORY_LABELS: Record<string, string> = {
      language: 'Languages',
      frontend: 'Frontend',
      backend: 'Backend',
      database: 'Databases',
      devops: 'DevOps',
      mobile: 'Mobile',
      testing: 'Testing',
      tooling: 'Tooling',
    };

    const result: Array<{
      title: string;
      icon: string;
      parentTitle: string | null;
      parentIndex: number | null;
      tech: DetectedTech | null;
    }> = [];

    // Root node
    result.push({ title: 'Dev Skills', icon: 'account_tree', parentTitle: null, parentIndex: null, tech: null });

    const categoryHeaderIndices = new Map<string, number>();

    for (const [category, categoryTechs] of categoryMap) {
      if (!categoryTechs.length) continue;

      const headerIndex = result.length;
      result.push({
        title: CATEGORY_LABELS[category] ?? category,
        icon: CATEGORY_ICONS[category] ?? 'folder',
        parentTitle: 'Dev Skills',
        parentIndex: 0,
        tech: null,
      });
      categoryHeaderIndices.set(category, headerIndex);

      for (const tech of categoryTechs) {
        result.push({
          title: tech.canonicalTitle,
          icon: tech.icon,
          parentTitle: CATEGORY_LABELS[category] ?? category,
          parentIndex: headerIndex,
          tech,
        });
      }
    }

    return result;
  }

  private buildDescription(tech: DetectedTech): string {
    const repoNames = tech.repos.slice(0, 3).map((r) => r.name).join(', ');
    const extra = tech.repos.length > 3 ? ` +${tech.repos.length - 3} more` : '';
    return `Verified in ${tech.repos.length} repo${tech.repos.length === 1 ? '' : 's'}: ${repoNames}${extra}`;
  }
}
