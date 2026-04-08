import { Test, TestingModule } from '@nestjs/testing';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';

import { TreesController } from './trees.controller';
import { TreesService } from './trees.service';
import { BatchGenerationService } from './batch-generation.service';

describe('TreesController', () => {
  let controller: TreesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TreesController],
      providers: [
        {
          provide: TreesService,
          useValue: {},
        },
        {
          provide: BatchGenerationService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<TreesController>(TreesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
