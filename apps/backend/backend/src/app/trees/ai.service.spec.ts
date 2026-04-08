import axios from 'axios';
import { Logger } from '@nestjs/common';

import { AiService } from './ai.service';

describe('AiService', () => {
  const originalOpenAiApiKey = process.env.OPENAI_API_KEY;
  const originalAiPrimaryProvider = process.env.AI_PRIMARY_PROVIDER;
  const originalAiFallbackProvider = process.env.AI_FALLBACK_PROVIDER;
  const originalAiOpenAiModel = process.env.AI_OPENAI_MODEL;
  const originalYoutubeApiKey = process.env.YOUTUBE_API_KEY;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.AI_PRIMARY_PROVIDER = 'gemini';
    process.env.AI_FALLBACK_PROVIDER = 'gemini';
    process.env.AI_OPENAI_MODEL = 'gpt-4o';
    delete process.env.YOUTUBE_API_KEY;
  });

  afterAll(() => {
    process.env.OPENAI_API_KEY = originalOpenAiApiKey;
    process.env.AI_PRIMARY_PROVIDER = originalAiPrimaryProvider;
    process.env.AI_FALLBACK_PROVIDER = originalAiFallbackProvider;
    process.env.AI_OPENAI_MODEL = originalAiOpenAiModel;

    if (originalYoutubeApiKey === undefined) {
      delete process.env.YOUTUBE_API_KEY;
    } else {
      process.env.YOUTUBE_API_KEY = originalYoutubeApiKey;
    }
  });

  it('uses gpt-5.4-nano through OpenAI for skill tree generation', async () => {
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
        model: 'gpt-5.4-nano',
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
});
