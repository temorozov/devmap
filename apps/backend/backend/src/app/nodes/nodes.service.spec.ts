import { Test, TestingModule } from '@nestjs/testing';
import { NodesService } from './nodes.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NodesService', () => {
  let service: NodesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodesService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<NodesService>(NodesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
