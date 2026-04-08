import { Test, TestingModule } from '@nestjs/testing';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';

import { TreesService } from './trees.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from './ai.service';

describe('TreesService', () => {
  let service: TreesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreesService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: AiService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<TreesService>(TreesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
