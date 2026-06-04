import axios from 'axios';
import { Logger } from '@nestjs/common';

import { AiService } from './ai.service';

describe('AiService', () => {
  const originalOpenAiApiKey = process.env.OPENAI_API_KEY;
  const originalAiOpenAiModel = process.env.AI_OPENAI_MODEL;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.AI_OPENAI_MODEL = 'gpt-4o';
  });

  afterAll(() => {
    process.env.OPENAI_API_KEY = originalOpenAiApiKey;
    process.env.AI_OPENAI_MODEL = originalAiOpenAiModel;
  });

  it('returns [] without calling OpenAI when no API key is configured', async () => {
    delete process.env.OPENAI_API_KEY;
    const postSpy = jest.spyOn(axios, 'post');

    const service = new AiService();

    await expect(service.extractJobSkills('We need a React developer', ['React'])).resolves.toEqual([]);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('extracts allowed skill titles from a job description', async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const postSpy = jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        id: 'resp_test',
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: JSON.stringify(['React', 'TypeScript', 'NotAllowed']) }],
          },
        ],
      },
    } as never);

    const service = new AiService();

    await expect(
      service.extractJobSkills('Full-stack React role', ['React', 'TypeScript', 'Node.js']),
    ).resolves.toEqual(['React', 'TypeScript']);

    expect(postSpy).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        model: 'gpt-4o',
        prompt_cache_key: 'jd-skill-extract:v1',
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-openai-key',
        }),
      }),
    );
  });

  it('returns [] when the OpenAI request fails', async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(axios, 'post').mockRejectedValue(new Error('boom'));

    const service = new AiService();

    await expect(service.extractJobSkills('Backend role', ['Node.js'])).resolves.toEqual([]);
  });
});
