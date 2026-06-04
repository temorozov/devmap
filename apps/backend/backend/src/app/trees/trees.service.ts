import { Injectable, NotFoundException, ServiceUnavailableException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from './ai.service';
import { mapToSkill, SKILL_TAXONOMY } from '../github/skill-taxonomy';
import { GitHubService, GITHUB_USER_NOT_FOUND } from '../github/github.service';
import { buildSkillCardSvg } from './skill-card-svg';
import { randomBytes } from 'crypto';

interface ComparedProfile {
    handle: string;
    name: string | null;
    githubUsername: string | null;
    skills: string[];
    /** 'member' = registered DevMap user; 'github' = scanned public GitHub user. */
    source: 'member' | 'github';
}

const EXTERNAL_SCAN_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class TreesService {
    private readonly logger = new Logger(TreesService.name);
    /** Short-lived cache of on-the-fly scans of non-member GitHub users. */
    private readonly externalScanCache = new Map<string, { skills: string[]; at: number }>();

    constructor(
        private prisma: PrismaService,
        private aiService: AiService,
        private github: GitHubService,
    ) { }

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

    async getPublicProfile(handle: string, viewerIpHash?: string) {
        // Accept handle OR githubUsername so /u/githubUsername always resolves
        const user = await this.prisma.user.findFirst({
            where: { OR: [{ handle }, { githubUsername: handle }] },
            select: {
                id: true,
                name: true,
                handle: true,
                githubUsername: true,
                targetRole: true,
                createdAt: true,
                trees: {
                    where: { title: 'My Dev Map' },
                    take: 1,
                    include: { nodes: true, activities: true },
                },
            },
        });
        if (!user) throw new NotFoundException('Profile not found');

        // Record profile view — deduplicate same IP within 24h
        const oneDayAgo = new Date(Date.now() - 86400_000);
        const alreadyViewed = viewerIpHash
            ? await this.prisma.profileView.findFirst({
                where: { userId: user.id, viewerIpHash, createdAt: { gte: oneDayAgo } },
              })
            : null;

        if (!alreadyViewed) {
            await this.prisma.profileView.create({
                data: { userId: user.id, viewerIpHash: viewerIpHash ?? null },
            });
        }

        // View stats
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 86400_000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 86400_000);

        const [viewsThisWeek, viewsLastWeek, viewsTotal] = await Promise.all([
            this.prisma.profileView.count({ where: { userId: user.id, createdAt: { gte: weekAgo } } }),
            this.prisma.profileView.count({ where: { userId: user.id, createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
            this.prisma.profileView.count({ where: { userId: user.id } }),
        ]);

        const devMap = user.trees[0] ?? null;
        const verifiedCount = devMap?.nodes.filter((n: { verified: boolean }) => n.verified).length ?? 0;
        const totalNodes = devMap?.nodes.length ?? 0;

        return {
            handle: user.handle ?? user.githubUsername,
            name: user.name,
            githubUsername: user.githubUsername,
            targetRole: user.targetRole ?? null,
            memberSince: user.createdAt,
            verifiedSkills: verifiedCount,
            totalSkills: totalNodes,
            devMap,
            views: { thisWeek: viewsThisWeek, lastWeek: viewsLastWeek, total: viewsTotal },
        };
    }

    async getBadgeData(handle: string): Promise<{
        skills: Array<{ title: string; category: string }>;
        totalCount: number;
        displayHandle: string;
        name: string | null;
        githubUsername: string | null;
        repoCount: number;
    } | null> {
        const user = await this.prisma.user.findFirst({
            where: { OR: [{ handle }, { githubUsername: handle }] },
            select: {
                name: true,
                handle: true,
                githubUsername: true,
                trees: {
                    where: { title: 'My Dev Map' },
                    take: 1,
                    select: {
                        nodes: {
                            where: { verified: true, source: 'github' },
                            select: { title: true },
                            orderBy: { level: 'desc' },
                        },
                    },
                },
                githubScans: {
                    orderBy: { scannedAt: 'desc' },
                    take: 1,
                    select: { repoCount: true },
                },
            },
        });
        if (!user) return null;
        const nodes = user.trees[0]?.nodes ?? [];
        const skills = nodes.map(n => {
            const mapped = mapToSkill(n.title);
            return { title: n.title, category: mapped?.category ?? 'tooling' };
        });
        return {
            skills,
            totalCount: nodes.length,
            displayHandle: user.handle ?? user.githubUsername ?? handle,
            name: user.name,
            githubUsername: user.githubUsername,
            repoCount: user.githubScans[0]?.repoCount ?? 0,
        };
    }

    buildSkillCardSvg(
        displayHandle: string,
        skills: Array<{ title: string; category: string }>,
        totalCount: number,
        repoCount: number,
        theme: 'dark' | 'light' = 'dark',
    ): string {
        return buildSkillCardSvg(displayHandle, skills, totalCount, repoCount, theme);
    }

    async getMyVerifiedSkills(userId: string): Promise<string[]> {
        const devMap = await this.prisma.tree.findFirst({
            where: { userId, title: 'My Dev Map' },
            select: { nodes: { where: { verified: true, source: 'github' }, select: { title: true } } },
        });
        return devMap?.nodes.map(n => n.title) ?? [];
    }

    async getExploreProfiles() {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
        const users = await this.prisma.user.findMany({
            where: {
                isGuest: false,
                githubUsername: { not: null },
                githubScans: { some: { scannedAt: { gte: thirtyDaysAgo } } },
            },
            select: {
                handle: true,
                name: true,
                githubUsername: true,
                trees: {
                    where: { title: 'My Dev Map' },
                    take: 1,
                    select: {
                        nodes: {
                            where: { verified: true, source: 'github' },
                            select: { title: true, icon: true },
                        },
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
            take: 24,
        });

        return users
            .filter(u => (u.trees[0]?.nodes.length ?? 0) > 0)
            .map(u => ({
                handle: u.handle ?? u.githubUsername,
                name: u.name,
                githubUsername: u.githubUsername,
                verifiedSkills: u.trees[0]?.nodes.length ?? 0,
                topSkills: u.trees[0]?.nodes.slice(0, 5).map(n => n.title) ?? [],
            }));
    }

    async compareProfiles(handleA: string, handleB: string) {
        const [a, b] = await Promise.all([
            this.resolveComparedProfile(handleA),
            this.resolveComparedProfile(handleB),
        ]);

        const setA = new Set(a.skills);
        const setB = new Set(b.skills);

        return {
            a: { handle: a.handle, name: a.name, githubUsername: a.githubUsername, skillCount: a.skills.length, source: a.source },
            b: { handle: b.handle, name: b.name, githubUsername: b.githubUsername, skillCount: b.skills.length, source: b.source },
            inCommon: a.skills.filter(s => setB.has(s)),
            onlyA: a.skills.filter(s => !setB.has(s)),
            onlyB: b.skills.filter(s => !setA.has(s)),
        };
    }

    /** Resolve a handle to skills — a registered member if one exists, otherwise a live scan of the public GitHub user. */
    private async resolveComparedProfile(rawHandle: string): Promise<ComparedProfile> {
        const handle = rawHandle.trim().replace(/^@/, '');
        if (!handle) throw new NotFoundException('Empty handle');

        const user = await this.prisma.user.findFirst({
            where: { OR: [{ handle }, { githubUsername: handle }] },
            select: {
                handle: true,
                name: true,
                githubUsername: true,
                trees: {
                    where: { title: 'My Dev Map' },
                    take: 1,
                    select: {
                        nodes: {
                            where: { verified: true, source: 'github' },
                            select: { title: true },
                        },
                    },
                },
            },
        });

        if (user) {
            return {
                handle: user.handle ?? user.githubUsername ?? handle,
                name: user.name,
                githubUsername: user.githubUsername,
                skills: user.trees[0]?.nodes.map(n => n.title) ?? [],
                source: 'member',
            };
        }

        // Not a member — scan their public GitHub repos on the fly.
        const skills = await this.scanExternalGithubUser(handle);
        return { handle, name: null, githubUsername: handle, skills, source: 'github' };
    }

    private async scanExternalGithubUser(username: string): Promise<string[]> {
        const key = username.toLowerCase();
        const cached = this.externalScanCache.get(key);
        if (cached && Date.now() - cached.at < EXTERNAL_SCAN_TTL_MS) {
            return cached.skills;
        }

        const token = await this.getScanToken();
        let detected;
        try {
            detected = await this.github.detectTechnologiesForUsername(username, token);
        } catch (err) {
            if (err instanceof Error && err.message === GITHUB_USER_NOT_FOUND) {
                throw new NotFoundException(`No DevMap member or GitHub user found: @${username}`);
            }
            this.logger.warn(`External GitHub scan failed for @${username}: ${err instanceof Error ? err.message : String(err)}`);
            throw new ServiceUnavailableException('Could not scan GitHub right now. Please try again in a moment.');
        }

        const skills = detected.map(d => d.canonicalTitle);
        this.externalScanCache.set(key, { skills, at: Date.now() });
        return skills;
    }

    /** Any connected user's token, used purely to lift GitHub rate limits for public reads. */
    private async getScanToken(): Promise<string> {
        const u = await this.prisma.user.findFirst({
            where: { githubAccessToken: { not: null } },
            select: { githubAccessToken: true },
        });
        return u?.githubAccessToken ?? '';
    }

    async matchJobDescription(userId: string, jdText: string) {
        // Extract skills from JD text two ways and merge:
        // 1. Literal taxonomy alias matches (fast, exact — catches "Python", "Node.js")
        const lower = jdText.toLowerCase();
        const requiredTitles = new Set<string>();
        for (const entry of SKILL_TAXONOMY) {
            for (const alias of entry.aliases) {
                const escaped = alias.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const re = new RegExp(`(?<![\\w.-])${escaped}(?![\\w.-])`, 'i');
                if (re.test(lower)) {
                    requiredTitles.add(entry.canonicalTitle);
                    break;
                }
            }
        }

        // 2. AI inference from prose (understands "AI/ML specialist", "full-stack", etc.).
        //    Falls back to [] when AI is unavailable, so literal matches still work.
        const canonicalTitles = SKILL_TAXONOMY.map(e => e.canonicalTitle);
        const aiTitles = await this.aiService.extractJobSkills(jdText, canonicalTitles);
        for (const title of aiTitles) {
            requiredTitles.add(title);
        }

        // Get user's verified skills with evidence
        const devMap = await this.prisma.tree.findFirst({
            where: { userId, title: 'My Dev Map' },
            select: {
                nodes: {
                    where: { verified: true, source: 'github' },
                    select: { title: true, evidence: true, level: true },
                },
            },
        });

        const userSkillMap = new Map<string, { evidence: unknown; level: number }>();
        for (const n of devMap?.nodes ?? []) {
            userSkillMap.set(n.title, { evidence: n.evidence, level: n.level });
        }

        const required = [...requiredTitles];
        const matched = required.filter(t => userSkillMap.has(t)).map(t => ({
            title: t,
            evidence: userSkillMap.get(t)!.evidence,
            level: userSkillMap.get(t)!.level,
        }));
        const missing = required.filter(t => !userSkillMap.has(t));

        return {
            required: required.length,
            matched,
            missing,
            score: required.length > 0 ? Math.round((matched.length / required.length) * 100) : 0,
        };
    }

    async setTargetRole(userId: string, roleKey: string) {
        await this.prisma.user.update({ where: { id: userId }, data: { targetRole: roleKey || null } });
    }

    async getProfileViewStats(userId: string) {
        const weekAgo = new Date(Date.now() - 7 * 86400_000);
        const twoWeeksAgo = new Date(Date.now() - 14 * 86400_000);
        const [thisWeek, lastWeek, total] = await Promise.all([
            this.prisma.profileView.count({ where: { userId, createdAt: { gte: weekAgo } } }),
            this.prisma.profileView.count({ where: { userId, createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
            this.prisma.profileView.count({ where: { userId } }),
        ]);
        return { thisWeek, lastWeek, total };
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
