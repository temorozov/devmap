import { Test, TestingModule } from '@nestjs/testing';
import { TreesService } from './trees.service';

describe('TreesService', () => {
  let service: TreesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TreesService],
    }).compile();

    service = module.get<TreesService>(TreesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
