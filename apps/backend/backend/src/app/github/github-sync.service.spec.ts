import { GitHubSyncService } from './github-sync.service';
import { GitHubService } from './github.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GitHubSyncService', () => {
  it('reparents manual descendants before deleting github nodes', async () => {
    const tx = {
      node: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'root' },
          { id: 'old-github' },
        ]),
        findFirst: jest.fn().mockResolvedValue({
          id: 'root',
          treeId: 'tree-1',
          parentId: null,
          title: 'Dev Skills',
          source: 'github',
        }),
        update: jest.fn().mockResolvedValue({ id: 'root' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest
          .fn()
          .mockResolvedValueOnce({ id: 'python' })
          .mockResolvedValueOnce({ id: 'fastapi' }),
      },
    };

    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({
        id: 'user-1',
        githubAccessToken: 'token',
        githubUsername: 'octocat',
        email: null,
        handle: null,
        excludedSkills: [],
      }) },
      gitHubScan: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
      tree: { findFirst: jest.fn().mockResolvedValue({ id: 'tree-1' }), create: jest.fn() },
      gitHubWebhook: { findFirst: jest.fn(), upsert: jest.fn() },
      profileView: { findFirst: jest.fn(), create: jest.fn(), count: jest.fn() },
      $transaction: jest.fn(async (fn: (arg: typeof tx) => unknown) => fn(tx)),
    } as unknown as PrismaService;

    const github = {
      detectTechnologies: jest.fn().mockResolvedValue([
        {
          tech: 'Python',
          canonicalTitle: 'Python',
          category: 'language',
          icon: 'code',
          prerequisites: [],
          repos: [{ name: 'a', url: 'https://github.com/octocat/a', evidence: 'requirements.txt' }],
          lastSeen: '2026-06-11T00:00:00Z',
        },
        {
          tech: 'FastAPI',
          canonicalTitle: 'FastAPI',
          category: 'backend',
          icon: 'dns',
          prerequisites: ['Python'],
          repos: [{ name: 'b', url: 'https://github.com/octocat/b', evidence: 'requirements.txt' }],
          lastSeen: '2026-06-11T00:00:00Z',
        },
      ]),
    } as unknown as GitHubService;

    const service = new GitHubSyncService(prisma, github, {} as EmailService);

    await expect((service as unknown as { runSync: (userId: string, skip: string[]) => Promise<unknown> }).runSync('user-1', [])).resolves.toBeDefined();

    expect(tx.node.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'root' },
        data: expect.objectContaining({ source: 'manual' }),
      }),
    );
    expect(tx.node.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          treeId: 'tree-1',
          parentId: { in: ['root', 'old-github'] },
        }),
        data: { parentId: 'root' },
      }),
    );
    expect(tx.node.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { treeId: 'tree-1', source: 'github' },
      }),
    );
  });
});
