import { Test, TestingModule } from '@nestjs/testing';
import { NodesService } from './nodes.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NodesService', () => {
  let service: NodesService;
  let prisma: {
    tree: { findFirst: jest.Mock };
    node: { findMany: jest.Mock; create: jest.Mock };
    treeActivity: { upsert: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      tree: { findFirst: jest.fn() },
      node: { findMany: jest.fn(), create: jest.fn() },
      treeActivity: { upsert: jest.fn().mockResolvedValue({}) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<NodesService>(NodesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('attaches FastAPI under Python when Python already exists in the tree', async () => {
    prisma.tree.findFirst.mockResolvedValue({ id: 'tree-1', userId: 'user-1' });
    prisma.node.findMany.mockResolvedValue([
      { id: 'root', title: 'Dev Skills', parentId: null, createdAt: new Date('2026-06-11T00:00:00Z') },
      { id: 'python', title: 'Python', parentId: 'root', createdAt: new Date('2026-06-11T00:00:01Z') },
    ]);
    prisma.node.create.mockResolvedValue({ id: 'fastapi', parentId: 'python' });

    await service.create('user-1', {
      treeId: 'tree-1',
      parentId: 'root',
      title: 'FastAPI',
      positionX: 0,
      positionY: 0,
    });

    expect(prisma.node.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parentId: 'python',
          title: 'FastAPI',
        }),
      }),
    );
  });
});
