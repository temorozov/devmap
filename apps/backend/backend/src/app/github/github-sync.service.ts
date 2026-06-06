import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { GitHubService, GITHUB_USER_NOT_FOUND } from './github.service';
import { EmailService } from '../email/email.service';
import { computeTreeLayout } from './tree-layout.util';
import { DetectedTech } from './github.types';
import { Prisma } from '@prisma/client';

const DEV_MAP_TITLE = 'My Dev Map';
const GUEST_SCAN_TTL_MS = 30 * 60_000;

export interface GuestScanSkill {
  title: string;
  category: string;
  icon: string;
  repoCount: number;
}

export interface GuestScanResult {
  handle: string;
  skills: GuestScanSkill[];
  scannedAt: string;
}

@Injectable()
export class GitHubSyncService {
  private readonly logger = new Logger(GitHubSyncService.name);
  private readonly guestScanCache = new Map<string, { data: GuestScanResult; at: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly github: GitHubService,
    private readonly emailService: EmailService,
  ) {}

  async syncUserDevMap(userId: string, skip: string[] = []): Promise<{ nodeCount: number; verifiedCount: number; newSkills: string[] }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.githubAccessToken || !user.githubUsername) {
      throw new NotFoundException('GitHub account not connected or token missing.');
    }

    this.logger.log(`Starting GitHub sync for user ${userId} (@${user.githubUsername})`);

    // Snapshot previous skills for change detection
    const lastScan = await this.prisma.gitHubScan.findFirst({
      where: { userId },
      orderBy: { scannedAt: 'desc' },
      select: { summary: true },
    });
    const previousTitles = new Set(
      (lastScan?.summary as Array<{ title: string }> ?? []).map(s => s.title),
    );

    const allDetected = await this.github.detectTechnologies(user.githubAccessToken, user.githubUsername);

    // Cut the noise: keep skills seen in 2+ repos (matches the guest-scan threshold).
    // Per-sync skips come from the preview modal (user unchecks skills they don't want this time).
    const skipped = new Set(skip.map((s) => s.toLowerCase()));
    const detectedTechs = allDetected.filter(
      (t) => t.repos.length >= 2 && !skipped.has(t.canonicalTitle.toLowerCase()),
    );

    this.logger.log(
      `Detected ${allDetected.length} technologies for user ${userId}, kept ${detectedTechs.length} after 2+ repo & blacklist filter`,
    );

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

      // Reuse an existing manual root so we never end up with two parentId=null nodes.
      const existingRoot = await tx.node.findFirst({ where: { treeId, parentId: null } });
      if (existingRoot) {
        idMap.set('Dev Skills', existingRoot.id);
      }

      for (let i = 0; i < layoutInput.length; i++) {
        const item = layoutInput[i];
        const pos = positions[i];
        const tech = item.tech;

        // Skip synthetic root if we're reusing an existing one.
        if (!item.tech && item.parentTitle === null && idMap.has(item.title)) continue;

        let parentId: string | null = null;
        if (item.parentTitle && idMap.has(item.parentTitle)) {
          parentId = idMap.get(item.parentTitle) ?? null;
        }

        const evidence = tech
          ? [
              ...tech.repos.map((r) => ({ repo: r.name, url: r.url, evidence: r.evidence })),
              { _meta: true, repoCount: tech.repos.length, lastSeen: tech.lastSeen },
            ]
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

    // Register webhooks for discovered repos (fire-and-forget, non-blocking)
    const repoNames = this.extractRepoFullNames(detectedTechs);
    this.registerWebhooks(userId, user.githubAccessToken, repoNames).catch((err: unknown) =>
      this.logger.warn(`Webhook registration failed: ${err instanceof Error ? err.message : String(err)}`),
    );

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

    // Detect new skills — only on re-sync (not first-time)
    const newSkills: string[] = [];
    if (previousTitles.size > 0) {
      for (const t of detectedTechs) {
        if (!previousTitles.has(t.canonicalTitle)) newSkills.push(t.canonicalTitle);
      }
      if (newSkills.length > 0 && user.email) {
        this.logger.log(`New skills detected for ${userId}: ${newSkills.join(', ')}`);
        this.emailService
          .sendSkillsUpdatedEmail(user.email, newSkills, verifiedCount, user.handle ?? user.githubUsername ?? '')
          .catch((err: unknown) => this.logger.warn(`Skills email failed: ${err instanceof Error ? err.message : String(err)}`));
      }
    }

    return { nodeCount: layoutInput.length, verifiedCount, newSkills };
  }

  async syncByRepo(repoFullName: string): Promise<void> {
    const webhook = await this.prisma.gitHubWebhook.findFirst({
      where: { repoFullName },
    });

    if (!webhook) {
      this.logger.warn(`No webhook registered for repo: ${repoFullName}`);
      return;
    }

    this.logger.log(`Webhook-triggered sync for repo: ${repoFullName}, userId: ${webhook.userId}`);
    await this.syncUserDevMap(webhook.userId);
  }

  private extractRepoFullNames(techs: DetectedTech[]): Set<string> {
    const result = new Set<string>();
    for (const tech of techs) {
      for (const repo of tech.repos) {
        const match = repo.url.match(/github\.com\/([^/]+\/[^/?#]+)/);
        if (match) result.add(match[1]);
      }
    }
    return result;
  }

  private async registerWebhooks(userId: string, accessToken: string, repoFullNames: Set<string>): Promise<void> {
    const webhookSecret = process.env['GITHUB_WEBHOOK_SECRET'];
    if (!webhookSecret) {
      this.logger.debug('GITHUB_WEBHOOK_SECRET not set — skipping webhook registration');
      return;
    }

    const backendUrl = (process.env['BACKEND_URL'] ?? '').replace(/\/$/, '');
    if (!backendUrl || backendUrl.includes('localhost')) {
      this.logger.debug('Skipping webhook registration: BACKEND_URL is not a public URL');
      return;
    }

    const webhookUrl = `${backendUrl}/api/github/webhook`;

    for (const repoFullName of repoFullNames) {
      try {
        const resp = await axios.post<{ id: number }>(
          `https://api.github.com/repos/${repoFullName}/hooks`,
          {
            name: 'web',
            active: true,
            events: ['push'],
            config: { url: webhookUrl, content_type: 'json', secret: webhookSecret },
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
            timeout: 6000,
          },
        );

        await this.prisma.gitHubWebhook.upsert({
          where: { userId_repoFullName: { userId, repoFullName } },
          create: { userId, repoFullName, webhookId: resp.data.id },
          update: { webhookId: resp.data.id },
        });

        this.logger.log(`Registered webhook for ${repoFullName} (id=${resp.data.id})`);
      } catch (err: unknown) {
        // 422 = hook already exists; 404 = not a repo owner — both are fine to skip
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 422) {
          this.logger.warn(`Webhook skip for ${repoFullName}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }

  /**
   * Build the map as a *skill dependency graph* rather than category buckets.
   *
   * Each detected skill nests under the prerequisite it builds on
   * (JavaScript → TypeScript → Angular, Node.js/TypeScript → NestJS). Only edges
   * where both ends are actually detected are kept, so the tree reflects this
   * developer's real lineage. Foundations (skills with no detected prerequisite)
   * hang off a synthetic root. This is what makes the map say something the flat
   * profile list cannot: how the skills connect and build on each other.
   */
  private buildLayoutNodes(techs: DetectedTech[]): Array<{
    title: string;
    icon: string;
    parentTitle: string | null;
    parentIndex: number | null;
    tech: DetectedTech | null;
  }> {
    const detectedTitles = new Set(techs.map((t) => t.canonicalTitle));

    // Prerequisites restricted to skills this developer actually has.
    const detectedPrereqs = new Map<string, string[]>();
    for (const tech of techs) {
      detectedPrereqs.set(
        tech.canonicalTitle,
        (tech.prerequisites ?? []).filter(
          (p) => detectedTitles.has(p) && p !== tech.canonicalTitle,
        ),
      );
    }

    // Longest prerequisite-chain depth, memoized and cycle-safe.
    const depthCache = new Map<string, number>();
    const computeDepth = (title: string, stack: Set<string>): number => {
      const cached = depthCache.get(title);
      if (cached !== undefined) return cached;
      if (stack.has(title)) return 0; // prerequisite cycle guard
      stack.add(title);
      const prereqs = detectedPrereqs.get(title) ?? [];
      const depth = prereqs.length === 0
        ? 0
        : 1 + Math.max(...prereqs.map((p) => computeDepth(p, stack)));
      stack.delete(title);
      depthCache.set(title, depth);
      return depth;
    };
    for (const tech of techs) computeDepth(tech.canonicalTitle, new Set());

    // Nest a skill under its deepest prerequisite, so it sits on its most
    // specific foundation (NestJS → TypeScript rather than NestJS → Node.js).
    const parentTitleOf = (title: string): string | null => {
      const prereqs = detectedPrereqs.get(title) ?? [];
      if (prereqs.length === 0) return null;
      return prereqs.reduce((best, p) =>
        (depthCache.get(p) ?? 0) > (depthCache.get(best) ?? 0) ? p : best,
      );
    };

    // Shallow → deep so every parent is emitted before its children.
    const ordered = [...techs].sort((a, b) => {
      const da = depthCache.get(a.canonicalTitle) ?? 0;
      const db = depthCache.get(b.canonicalTitle) ?? 0;
      return da !== db ? da - db : a.canonicalTitle.localeCompare(b.canonicalTitle);
    });

    const result: Array<{
      title: string;
      icon: string;
      parentTitle: string | null;
      parentIndex: number | null;
      tech: DetectedTech | null;
    }> = [];
    const indexByTitle = new Map<string, number>();

    // Synthetic root anchors the foundations ("your foundation").
    result.push({ title: 'Dev Skills', icon: 'account_tree', parentTitle: null, parentIndex: null, tech: null });
    indexByTitle.set('Dev Skills', 0);

    for (const tech of ordered) {
      const parentTitle = parentTitleOf(tech.canonicalTitle) ?? 'Dev Skills';
      const parentIndex = indexByTitle.get(parentTitle) ?? 0;
      indexByTitle.set(tech.canonicalTitle, result.length);
      result.push({
        title: tech.canonicalTitle,
        icon: tech.icon,
        parentTitle,
        parentIndex,
        tech,
      });
    }

    return result;
  }

  private buildDescription(tech: DetectedTech): string {
    const repoNames = tech.repos.slice(0, 3).map((r) => r.name).join(', ');
    const extra = tech.repos.length > 3 ? ` +${tech.repos.length - 3} more` : '';
    return `Verified in ${tech.repos.length} repo${tech.repos.length === 1 ? '' : 's'}: ${repoNames}${extra}`;
  }

  async scanPublicUser(username: string): Promise<GuestScanResult> {
    const key = username.toLowerCase();
    const cached = this.guestScanCache.get(key);
    if (cached && Date.now() - cached.at < GUEST_SCAN_TTL_MS) {
      return cached.data;
    }
    const token = await this.getScanToken();
    let detected: DetectedTech[];
    try {
      detected = await this.github.detectTechnologiesForUsername(username, token);
    } catch (err) {
      if (err instanceof Error && err.message === GITHUB_USER_NOT_FOUND) {
        throw new NotFoundException(`No GitHub user found: @${username}`);
      }
      this.logger.warn(`Guest scan failed for @${username}: ${err instanceof Error ? err.message : String(err)}`);
      throw new ServiceUnavailableException('Could not scan GitHub right now. Please try again in a moment.');
    }
    const skills: GuestScanSkill[] = detected
      .filter((d) => d.repos.length >= 2)
      .map((d) => ({ title: d.canonicalTitle, category: d.category, icon: d.icon, repoCount: d.repos.length }));
    const data: GuestScanResult = { handle: username, skills, scannedAt: new Date().toISOString() };
    this.guestScanCache.set(key, { data, at: Date.now() });
    return data;
  }

  private async getScanToken(): Promise<string> {
    const u = await this.prisma.user.findFirst({
      where: { githubAccessToken: { not: null } },
      select: { githubAccessToken: true },
    });
    return u?.githubAccessToken ?? '';
  }

  async previewUserSync(userId: string): Promise<GuestScanSkill[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.githubAccessToken || !user.githubUsername) {
      throw new NotFoundException('GitHub account not connected or token missing.');
    }
    const allDetected = await this.github.detectTechnologies(user.githubAccessToken, user.githubUsername);
    return allDetected
      .filter((t) => t.repos.length >= 2)
      .map((t) => ({ title: t.canonicalTitle, category: t.category, icon: t.icon ?? '', repoCount: t.repos.length }));
  }

  /** Blacklist a skill title so future GitHub syncs never re-add it. */
  async excludeSkill(userId: string, title: string): Promise<{ excludedSkills: string[] }> {
    const clean = title.trim();
    if (!clean) return { excludedSkills: [] };
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { excludedSkills: true } });
    if (!user) throw new NotFoundException('User not found');
    const exists = user.excludedSkills.some((s) => s.toLowerCase() === clean.toLowerCase());
    const excludedSkills = exists ? user.excludedSkills : [...user.excludedSkills, clean];
    if (!exists) await this.prisma.user.update({ where: { id: userId }, data: { excludedSkills } });
    return { excludedSkills };
  }

  /** Remove a skill from the blacklist (e.g. it was re-added manually). */
  async allowSkill(userId: string, title: string): Promise<{ excludedSkills: string[] }> {
    const clean = title.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { excludedSkills: true } });
    if (!user) throw new NotFoundException('User not found');
    const excludedSkills = user.excludedSkills.filter((s) => s.toLowerCase() !== clean);
    if (excludedSkills.length !== user.excludedSkills.length) {
      await this.prisma.user.update({ where: { id: userId }, data: { excludedSkills } });
    }
    return { excludedSkills };
  }
}
