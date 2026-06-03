import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from './ai.service';
import { mapToSkill, SKILL_TAXONOMY } from '../github/skill-taxonomy';
import { randomBytes } from 'crypto';

@Injectable()
export class TreesService {
    private readonly logger = new Logger(TreesService.name);

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
        const W = 495;
        const ML = 16;
        const MR = 16;
        const HEADER_H = 66;
        const ROW_H = 30;
        const SKILLS_TOP_PAD = 10;
        const SKILLS_BOT_PAD = 10;
        const FOOTER_H = 30;
        const CAT_W = 78;
        const SX = ML + CAT_W + 4;    // 98 — where pills start
        const MAX_SX = W - MR;         // 479
        const PILL_PX = 8;             // pill horizontal padding
        const PILL_H = 22;
        const PILL_RX = 11;
        const DOT_R = 3;
        const DOT_TEXT_GAP = 4;
        const PILL_GAP = 8;
        const FONT_W = 6.5;
        const FONT = "'Segoe UI','Ubuntu','DejaVu Sans',Helvetica,Arial,sans-serif";

        const esc = (s: string) => s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        // pill_w: PILL_PX + dot_diam + DOT_TEXT_GAP + text + PILL_PX
        const pillW = (name: string) => PILL_PX + DOT_R * 2 + DOT_TEXT_GAP + Math.ceil(name.length * FONT_W) + PILL_PX;

        const dark = theme !== 'light';
        const c = dark
            ? { bg: '#0d1117', bg2: '#161b22', border: '#30363d', text: '#e6edf3', muted: '#8b949e', dim: '#484f58', accent: '#58a6ff', verified: '#3fb950', divider: '#21262d' }
            : { bg: '#ffffff', bg2: '#f6f8fa', border: '#d0d7de', text: '#1f2328', muted: '#636c76', dim: '#8c959f', accent: '#0969da', verified: '#1a7f37', divider: '#eaeef2' };

        const CAT_COLORS: Record<string, [string, string]> = {
            language: ['#7ee787', '#1a7f37'], frontend: ['#79c0ff', '#0969da'],
            backend:  ['#d2a8ff', '#6639ba'], database: ['#ffa657', '#bc4c00'],
            devops:   ['#ff7b72', '#cf222e'], mobile:   ['#7ee787', '#1a7f37'],
            testing:  ['#e3b341', '#7d4e00'], ml:       ['#bc8cff', '#6639ba'],
            tooling:  ['#8b949e', '#57606a'],
        };
        const catColor = (cat: string) => (CAT_COLORS[cat] ?? CAT_COLORS['tooling'])[dark ? 0 : 1];

        const CAT_ORDER = ['language', 'frontend', 'backend', 'database', 'devops', 'mobile', 'testing', 'ml', 'tooling'];
        const CAT_LABELS: Record<string, string> = {
            language: 'Languages', frontend: 'Frontend', backend: 'Backend',
            database: 'Database', devops: 'DevOps', mobile: 'Mobile',
            testing: 'Testing', ml: 'ML / AI', tooling: 'Tooling',
        };

        const catMap = new Map<string, string[]>();
        for (const s of skills) {
            const cat = s.category || 'tooling';
            if (!catMap.has(cat)) catMap.set(cat, []);
            catMap.get(cat)!.push(s.title);
        }

        const rows = CAT_ORDER
            .filter(cat => catMap.has(cat))
            .slice(0, 6)
            .map(cat => {
                const names = catMap.get(cat)!;
                const fit: string[] = [];
                let x = SX;
                for (let i = 0; i < names.length; i++) {
                    const pw = pillW(names[i]);
                    const overflowReserve = (names.length - i - 1) > 0 ? 32 : 0;
                    if (fit.length > 0 && x + pw + overflowReserve > MAX_SX - 4) {
                        return { cat, fit, overflow: names.length - i };
                    }
                    fit.push(names[i]);
                    x += pw + PILL_GAP;
                }
                return { cat, fit, overflow: 0 };
            });

        const hasSkills = rows.length > 0;
        const skillsH = SKILLS_TOP_PAD + (hasSkills ? rows.length : 1) * ROW_H + SKILLS_BOT_PAD;
        const totalH = HEADER_H + skillsH + FOOTER_H;

        const tx = (x: number, y: number, content: string, size: number, fill: string, opts: { a?: string; w?: string; s?: string } = {}) =>
            `<text x="${x}" y="${y}" font-size="${size}" font-family="${FONT}" fill="${fill}"${opts.a ? ` text-anchor="${opts.a}"` : ''}${opts.w ? ` font-weight="${opts.w}"` : ''}${opts.s ? ` letter-spacing="${opts.s}"` : ''}>${esc(content)}</text>`;

        const parts: string[] = [];

        // Gradient defs (accent divider + verified chip)
        const [g1, g2, g3] = dark
            ? ['#58a6ff', '#bc8cff', '#3fb950']
            : ['#0969da', '#8250df', '#1a7f37'];
        parts.push(`<defs>
  <linearGradient id="ag" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${g1}"/>
    <stop offset="55%" stop-color="${g2}"/>
    <stop offset="100%" stop-color="${g3}"/>
  </linearGradient>
</defs>`);

        // Card BG + border
        parts.push(`<rect width="${W}" height="${totalH}" rx="6" fill="${c.bg}" stroke="${c.border}" stroke-width="1"/>`);

        // Header BG
        parts.push(`<rect width="${W}" height="${HEADER_H}" rx="6" fill="${c.bg2}"/>`);
        parts.push(`<rect y="${HEADER_H - 6}" width="${W}" height="6" fill="${c.bg2}"/>`);

        // Gradient divider (replaces plain line)
        parts.push(`<rect x="${ML}" y="${HEADER_H}" width="${W - ML - MR}" height="1" fill="url(#ag)"/>`);

        // Avatar
        const ACX = ML + 18, ACY = 33;
        parts.push(`<circle cx="${ACX}" cy="${ACY}" r="18" fill="${dark ? '#21262d' : '#e8ecef'}" stroke="${c.border}" stroke-width="1"/>`);
        parts.push(tx(ACX, ACY + 6, displayHandle[0].toUpperCase(), 15, c.accent, { a: 'middle', w: '700' }));

        // Handle + subtitle
        const TX_X = ACX + 18 + 10;
        parts.push(tx(TX_X, 27, `@${displayHandle}`, 15, c.accent, { w: '600' }));
        parts.push(tx(TX_X, 45, 'GitHub-verified dev skills', 10, c.muted));

        // Verified chip (right side)
        const RX = W - MR;
        const chipText = `✓ ${totalCount} skills`;
        const chipW = Math.ceil(chipText.length * 6.5) + 20;
        const chipX = RX - chipW;
        const chipY = 14;
        parts.push(`<rect x="${chipX}" y="${chipY}" width="${chipW}" height="22" rx="11" fill="${c.verified}" fill-opacity="${dark ? '0.12' : '0.1'}" stroke="${c.verified}" stroke-width="0.5" stroke-opacity="0.6"/>`);
        parts.push(tx(chipX + chipW / 2, chipY + 15, chipText, 11, c.verified, { a: 'middle', w: '600' }));
        if (repoCount > 0) {
            parts.push(tx(RX, 52, `${repoCount} repos scanned`, 10, c.muted, { a: 'end' }));
        }

        // Skill rows with pills
        if (hasSkills) {
            let rowY = HEADER_H + SKILLS_TOP_PAD;
            for (const { cat, fit, overflow } of rows) {
                const color = catColor(cat);
                const cy = rowY + ROW_H / 2;
                const textBaseline = Math.round(cy + 4);
                const pillY = Math.round(cy - PILL_H / 2);

                // Category label
                parts.push(tx(ML, textBaseline - 1, CAT_LABELS[cat] ?? cat, 9, color, { w: '600', s: '0.4' }));

                let sx = SX;
                for (const name of fit) {
                    const pw = pillW(name);
                    const dotCx = sx + PILL_PX + DOT_R;
                    const textX = dotCx + DOT_R + DOT_TEXT_GAP;

                    // Pill background
                    parts.push(`<rect x="${sx}" y="${pillY}" width="${pw}" height="${PILL_H}" rx="${PILL_RX}" fill="${color}" fill-opacity="${dark ? '0.13' : '0.09'}"/>`);
                    // Dot
                    parts.push(`<circle cx="${Math.round(dotCx)}" cy="${Math.round(cy)}" r="${DOT_R}" fill="${color}"/>`);
                    // Name
                    parts.push(tx(Math.round(textX), textBaseline, name, 11, color));

                    sx += pw + PILL_GAP;
                }

                if (overflow > 0) {
                    parts.push(tx(Math.round(sx + 2), textBaseline, `+${overflow}`, 10, c.muted));
                }

                rowY += ROW_H;
            }
        } else {
            const cy = HEADER_H + SKILLS_TOP_PAD + ROW_H / 2;
            parts.push(tx(ML, Math.round(cy + 4), 'No verified skills yet — connect GitHub to scan your repos', 11, c.muted));
        }

        // Footer
        const footerLineY = totalH - FOOTER_H;
        parts.push(`<rect x="${ML}" y="${footerLineY}" width="${W - ML - MR}" height="1" fill="${c.divider}"/>`);
        parts.push(tx(ML, totalH - 11, `devmap.sh/u/${displayHandle}`, 10, c.muted));
        parts.push(tx(RX, totalH - 11, 'auto-synced from GitHub', 10, c.dim, { a: 'end' }));

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}" role="img" aria-label="DevMap skill card for @${esc(displayHandle)}">
  <title>@${esc(displayHandle)} — ${totalCount} GitHub-verified skills | DevMap</title>
  ${parts.join('\n  ')}
</svg>`;
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
        const fetchSkills = async (handle: string) => {
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
                                select: { title: true, icon: true },
                            },
                        },
                    },
                },
            });
            if (!user) throw new NotFoundException(`Profile not found: ${handle}`);
            return {
                handle: user.handle ?? user.githubUsername ?? handle,
                name: user.name,
                githubUsername: user.githubUsername,
                skills: user.trees[0]?.nodes.map(n => n.title) ?? [],
            };
        };

        const [a, b] = await Promise.all([fetchSkills(handleA), fetchSkills(handleB)]);

        const setA = new Set(a.skills);
        const setB = new Set(b.skills);

        return {
            a: { handle: a.handle, name: a.name, githubUsername: a.githubUsername, skillCount: a.skills.length },
            b: { handle: b.handle, name: b.name, githubUsername: b.githubUsername, skillCount: b.skills.length },
            inCommon: a.skills.filter(s => setB.has(s)),
            onlyA: a.skills.filter(s => !setB.has(s)),
            onlyB: b.skills.filter(s => !setA.has(s)),
        };
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

    async generateSkillTree(userId: string, treeId: string, prompt: string) {
        const tree = await this.prisma.tree.findFirst({ where: { id: treeId, userId } });
        if (!tree) throw new NotFoundException('Tree not found');

        const generatedSkills = await this.aiService.generateSkillTree(prompt);

        const MAX_GENERATED_NODES = 60;
        if (generatedSkills.length > MAX_GENERATED_NODES) {
            generatedSkills.splice(MAX_GENERATED_NODES);
        }

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
            this.logger.error('[Trees Service] Error inside transaction during tree generation:', error instanceof Error ? error.stack : String(error));
            throw new InternalServerErrorException('Database failed to save generated skills.');
        }
    }
}
