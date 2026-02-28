import { Test, TestingModule } from '@nestjs/testing';
import { TreesController } from './trees.controller';

describe('TreesController', () => {
  let controller: TreesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TreesController],
    }).compile();

    controller = module.get<TreesController>(TreesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
