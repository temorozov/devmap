import axios from 'axios';
import { Logger } from '@nestjs/common';

import { AiService } from './ai.service';

describe('AiService', () => {
  const originalOpenAiApiKey = process.env.OPENAI_API_KEY;
  const originalAiOpenAiModel = process.env.AI_OPENAI_MODEL;
  const originalYoutubeApiKey = process.env.YOUTUBE_API_KEY;
  const originalYoutubeTimeoutMs = process.env.AI_YOUTUBE_REQUEST_TIMEOUT_MS;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.AI_OPENAI_MODEL = 'gpt-4o';
    delete process.env.YOUTUBE_API_KEY;
    delete process.env.AI_YOUTUBE_REQUEST_TIMEOUT_MS;
  });

  afterAll(() => {
    process.env.OPENAI_API_KEY = originalOpenAiApiKey;
    process.env.AI_OPENAI_MODEL = originalAiOpenAiModel;

    if (originalYoutubeApiKey === undefined) {
      delete process.env.YOUTUBE_API_KEY;
    } else {
      process.env.YOUTUBE_API_KEY = originalYoutubeApiKey;
    }

    if (originalYoutubeTimeoutMs === undefined) {
      delete process.env.AI_YOUTUBE_REQUEST_TIMEOUT_MS;
    } else {
      process.env.AI_YOUTUBE_REQUEST_TIMEOUT_MS = originalYoutubeTimeoutMs;
    }
  });

  it('uses AI_OPENAI_MODEL through OpenAI for skill tree generation', async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const postSpy = jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        id: 'resp_test',
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: '[]' }],
          },
        ],
        usage: {
          input_tokens: 1200,
          input_tokens_details: {
            cached_tokens: 900,
          },
          output_tokens: 40,
          output_tokens_details: {
            reasoning_tokens: 0,
          },
          total_tokens: 1240,
        },
      },
    } as never);

    const service = new AiService();

    await expect(service.generateSkillTree('Learn TypeScript')).resolves.toEqual([]);

    expect(postSpy).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        model: 'gpt-4o',
        instructions: expect.stringContaining('Return only valid JSON'),
        prompt_cache_key: 'skill-tree:generate:v1',
        input: [
          {
            role: 'user',
            content: [
              expect.objectContaining({
                type: 'input_text',
                text: expect.stringContaining('General rules:'),
              }),
              expect.objectContaining({
                type: 'input_text',
                text: expect.stringContaining('User prompt:\nLearn TypeScript'),
              }),
            ],
          },
        ],
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-openai-key',
        }),
      }),
    );

    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('cached_tokens=900'));
  });

  it('starts YouTube enrichment requests in parallel with a short timeout', async () => {
    process.env.YOUTUBE_API_KEY = 'test-youtube-key';
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        id: 'resp_test',
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify([
                  {
                    title: 'Root',
                    description: 'Root skill',
                    icon: 'school',
                    parentIndex: null,
                    youtubeSearchQuery: 'root tutorial',
                  },
                  {
                    title: 'Child',
                    description: 'Child skill',
                    icon: 'code',
                    parentIndex: 0,
                    youtubeSearchQuery: 'child tutorial',
                  },
                ]),
              },
            ],
          },
        ],
      },
    } as never);

    const youtubeResponses: Array<() => void> = [];
    const getSpy = jest.spyOn(axios, 'get').mockImplementation(() => new Promise((resolve) => {
      youtubeResponses.push(() => resolve({ data: { items: [] } }));
    }) as never);

    const service = new AiService();
    const generation = service.generateSkillTree('Learn TypeScript');

    await new Promise(resolve => setImmediate(resolve));

    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(getSpy).toHaveBeenCalledWith(
      'https://www.googleapis.com/youtube/v3/search',
      expect.objectContaining({ timeout: 2500 }),
    );

    youtubeResponses.forEach(resolve => resolve());
    await expect(generation).resolves.toHaveLength(2);
  });
});
