import axios from 'axios';
import { promises as fs } from 'fs';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';

import { BatchGenerationService } from './batch-generation.service';

describe('BatchGenerationService', () => {
  const originalOpenAiApiKey = process.env.OPENAI_API_KEY;
  const originalBatchModel = process.env.AI_BATCH_OPENAI_MODEL;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.AI_BATCH_OPENAI_MODEL = 'gpt-5.4-nano';
  });

  afterAll(() => {
    if (originalOpenAiApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalOpenAiApiKey;
    }

    if (originalBatchModel === undefined) {
      delete process.env.AI_BATCH_OPENAI_MODEL;
    } else {
      process.env.AI_BATCH_OPENAI_MODEL = originalBatchModel;
    }
  });

  it('queues a background batch for node descriptions using JSONL and OpenAI batches', async () => {
    const prisma = {
      tree: {
        findFirst: jest.fn().mockResolvedValue({ id: 'tree-1', title: 'Frontend Roadmap' }),
      },
      node: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'node-1',
            title: 'HTML Basics',
            description: null,
            parent: null,
            children: [{ title: 'Semantic HTML' }],
          },
        ]),
      },
      aiBatchJob: {
        create: jest.fn().mockResolvedValue({ id: 'job-1' }),
        update: jest.fn().mockResolvedValue({
          id: 'job-1',
          batchId: 'batch-1',
          inputFileId: 'file-input-1',
          status: 'validating',
        }),
      },
    } as any;

    const postSpy = jest.spyOn(axios, 'post')
      .mockResolvedValueOnce({ data: { id: 'file-input-1' } } as never)
      .mockResolvedValueOnce({
        data: {
          id: 'batch-1',
          status: 'validating',
          request_counts: { total: 1, completed: 0, failed: 0 },
        },
      } as never);

    const service = new BatchGenerationService(prisma);

    await expect(service.queueNodeDescriptionGeneration('user-1', 'tree-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'job-1',
        batchId: 'batch-1',
        status: 'validating',
      }),
    );

    expect(postSpy).toHaveBeenNthCalledWith(
      1,
      'https://api.openai.com/v1/files',
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-openai-key',
        }),
      }),
    );

    expect(postSpy).toHaveBeenNthCalledWith(
      2,
      'https://api.openai.com/v1/batches',
      expect.objectContaining({
        input_file_id: 'file-input-1',
        endpoint: '/v1/responses',
        completion_window: '24h',
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-openai-key',
        }),
      }),
    );

    const jsonl = await fs.readFile('/tmp/skill-tree-batches/job-1.jsonl', 'utf8');
    expect(jsonl).toContain('"custom_id":"node-node-1"');
    expect(jsonl).toContain('"url":"/v1/responses"');
    expect(jsonl).toContain('Frontend Roadmap');
    expect(jsonl).toContain('HTML Basics');
  });

  it('syncs a completed batch, reads results, and writes descriptions back to the database', async () => {
    const prisma = {
      aiBatchJob: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'job-1',
          userId: 'user-1',
          batchId: 'batch-1',
          status: 'in_progress',
          outputFileId: null,
          errorFileId: null,
          completedCount: 0,
          failedCount: 0,
          completedAt: null,
          resultsAppliedAt: null,
        }),
        update: jest.fn()
          .mockResolvedValueOnce({
            id: 'job-1',
            userId: 'user-1',
            batchId: 'batch-1',
            status: 'completed',
            outputFileId: 'file-output-1',
            errorFileId: null,
            completedCount: 1,
            failedCount: 0,
            completedAt: new Date('2026-04-08T12:00:00.000Z'),
            resultsAppliedAt: null,
          })
          .mockResolvedValueOnce({
            id: 'job-1',
            resultsAppliedAt: new Date('2026-04-08T12:01:00.000Z'),
          }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'job-1',
          completedCount: 1,
          metadata: {
            requests: [{ customId: 'node-node-1', nodeId: 'node-1' }],
          },
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'job-1',
          status: 'completed',
          resultsAppliedAt: new Date('2026-04-08T12:01:00.000Z'),
        }),
      },
      node: {
        update: jest.fn().mockResolvedValue({ id: 'node-1' }),
      },
    } as any;

    jest.spyOn(axios, 'get')
      .mockResolvedValueOnce({
        data: {
          id: 'batch-1',
          status: 'completed',
          output_file_id: 'file-output-1',
          request_counts: { total: 1, completed: 1, failed: 0 },
        },
      } as never)
      .mockResolvedValueOnce({
        data: `${JSON.stringify({
          custom_id: 'node-node-1',
          response: {
            status_code: 200,
            body: {
              output: [
                {
                  type: 'message',
                  content: [
                    {
                      type: 'output_text',
                      text: JSON.stringify({
                        description: 'Learn semantic HTML and practice by building simple pages.',
                      }),
                    },
                  ],
                },
              ],
            },
          },
          error: null,
        })}\n`,
      } as never);

    const service = new BatchGenerationService(prisma);

    await expect(service.syncBatchJob('user-1', 'job-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'job-1',
        status: 'completed',
      }),
    );

    expect(prisma.node.update).toHaveBeenCalledWith({
      where: { id: 'node-1' },
      data: {
        description: 'Learn semantic HTML and practice by building simple pages.',
      },
    });
  });
});
