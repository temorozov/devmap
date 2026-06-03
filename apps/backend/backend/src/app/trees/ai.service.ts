import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';

import { getOptionalEnv } from '../config/env';
import { extractOpenAiResponseText, OpenAiResponsesApiResponse } from './openai-response.utils';

interface GeneratedSkill {
  title: string;
  description: string;
  icon: string;
  parentIndex: number | null;
  youtubeSearchQuery?: string;
}

const DEFAULT_OPENAI_MODEL = 'gpt-5.4-nano';
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;
const DEFAULT_YOUTUBE_REQUEST_TIMEOUT_MS = 2500;
const DEFAULT_PROVIDER_RETRY_COUNT = 1;
const DEFAULT_PROVIDER_RETRY_DELAY_MS = 1200;
const OPENAI_SKILL_TREE_PROMPT_CACHE_KEY = 'skill-tree:generate:v1';
const JD_SKILL_PROMPT_CACHE_KEY = 'jd-skill-extract:v1';

const JD_SKILL_SYSTEM_INSTRUCTIONS = `You extract the concrete technical skills and technologies a software job requires.
Translate role descriptions into specific technologies. For example: "AI/ML engineer" implies Python, TensorFlow, PyTorch; "full-stack developer" implies React, Node.js, TypeScript; "DevOps" implies Docker, Kubernetes, AWS, CI/CD.
Return ONLY a JSON array of strings, each chosen EXACTLY (same spelling and casing) from the provided allowed list. Include a skill only when the job description reasonably implies it. No prose, no markdown, no code fences.`;

const SKILL_TREE_SYSTEM_INSTRUCTIONS = `You are an AI assistant that generates a skill tree based on user input.
Return only valid JSON with no markdown, prose, or code fences.`;

const SKILL_TREE_PROMPT_PREFIX = `General rules:
1. Generate a practical skill or learning tree from the provided user context.
2. The response must be a JSON array of skill objects.
3. Each skill object must contain exactly these fields:
   - "title": string
   - "description": string
   - "icon": string
   - "parentIndex": number or null
   - "youtubeSearchQuery": string (optional)
4. Use short, clear titles for "title".
5. Make "description" 1-2 short sentences, no more than 30-40 words total.
6. Keep "description" direct and practical with no fluff, no repetition, and no long explanations.
7. Never include hallucinated or fake links. If a link would help, recommend searching for a concrete topic instead of inventing a URL.
8. "icon" must be a valid Google Material Icon name, for example: "movie", "book", "school", "fitness_center", "code".
9. The root skill must have "parentIndex": null.
10. Non-root skills must reference the 0-based index of an earlier item in the same array. A skill must never reference itself or a later item.
11. Include "youtubeSearchQuery" only when a video would genuinely help for that specific skill.

Response format:
[
  {
    "title": "Short skill title",
    "description": "Short practical guidance in 1-2 sentences.",
    "icon": "school",
    "parentIndex": null,
    "youtubeSearchQuery": "specific tutorial search query"
  }
]

Example:
[
  {
    "title": "JavaScript Basics",
    "description": "Learn variables, functions, arrays, objects, and control flow. Practice with small scripts until basic syntax feels natural.",
    "icon": "code",
    "parentIndex": null,
    "youtubeSearchQuery": "javascript basics tutorial for beginners"
  },
  {
    "title": "DOM Manipulation",
    "description": "Practice selecting elements, handling events, and updating page content. Build small interactive pages to apply each concept.",
    "icon": "web",
    "parentIndex": 0,
    "youtubeSearchQuery": "dom manipulation javascript tutorial"
  }
]`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly youtubeApiKey = getOptionalEnv('YOUTUBE_API_KEY');
  private readonly openAiApiKey = getOptionalEnv('OPENAI_API_KEY');
  private readonly openAiModel = getOptionalEnv('AI_OPENAI_MODEL', DEFAULT_OPENAI_MODEL) ?? DEFAULT_OPENAI_MODEL;
  private readonly requestTimeoutMs = this.getTimeoutMs();
  private readonly youtubeRequestTimeoutMs = this.getYoutubeTimeoutMs();
  private readonly providerRetryCount = this.getRetryCount();
  private readonly providerRetryDelayMs = this.getRetryDelayMs();

  async generateSkillTree(prompt: string): Promise<GeneratedSkill[]> {
    if (!this.openAiApiKey) {
      this.logger.error('OPENAI_API_KEY is not configured.');
      throw new ServiceUnavailableException('AI generation is not configured right now.');
    }

    let lastError: unknown;

    for (let retry = 0; retry <= this.providerRetryCount; retry += 1) {
      try {
        const generated = await this.generateWithOpenAi(this.openAiModel, prompt);
        return await this.enrichWithYoutubeLinks(generated);
      } catch (error) {
        lastError = error;
        const errorSummary = this.getErrorSummary(error);
        const hasRetriesLeft = retry < this.providerRetryCount;

        if (hasRetriesLeft && this.isProviderRetryableError(error)) {
          const delayMs = this.providerRetryDelayMs * (retry + 1);
          this.logger.warn(
            `OpenAI request failed (${errorSummary}). Retrying in ${delayMs}ms (${retry + 1}/${this.providerRetryCount}).`,
          );
          await this.sleep(delayMs);
          continue;
        }

        this.logger.error(`OpenAI request failed: ${errorSummary}`, error instanceof Error ? error.stack : undefined);
        throw new ServiceUnavailableException(this.getPublicFailureMessage(error));
      }
    }

    this.logger.error(`OpenAI generation failed. Last error: ${this.getErrorSummary(lastError)}`);
    throw new ServiceUnavailableException(this.getPublicFailureMessage(lastError));
  }

  private async generateWithOpenAi(modelName: string, prompt: string): Promise<GeneratedSkill[]> {
    if (!this.openAiApiKey) {
      throw new Error('OpenAI API key is not configured.');
    }

    const response = await axios.post<OpenAiResponsesApiResponse>(
      'https://api.openai.com/v1/responses',
      {
        model: modelName,
        temperature: 0.4,
        instructions: SKILL_TREE_SYSTEM_INSTRUCTIONS,
        prompt_cache_key: OPENAI_SKILL_TREE_PROMPT_CACHE_KEY,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: SKILL_TREE_PROMPT_PREFIX,
              },
              {
                type: 'input_text',
                text: this.buildSkillTreePromptSuffix(prompt),
              },
            ],
          },
        ],
      },
      {
        timeout: this.requestTimeoutMs,
        headers: {
          Authorization: `Bearer ${this.openAiApiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    this.logOpenAiUsage(modelName, response.data);

    const content = extractOpenAiResponseText(response.data);
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('OpenAI returned an empty response.');
    }

    return this.parseGeneratedSkills(content);
  }

  private buildSkillTreePromptSuffix(prompt: string): string {
    return `User-specific context (changes on every request):
User prompt:
${prompt}`;
  }

  /**
   * Extracts the concrete required skills implied by a free-text job description,
   * constrained to a known list of canonical skill titles. Returns [] when AI is
   * not configured or the request fails, so callers can fall back to literal matching.
   */
  async extractJobSkills(jdText: string, allowedTitles: string[]): Promise<string[]> {
    if (!this.openAiApiKey || !jdText.trim() || allowedTitles.length === 0) {
      return [];
    }

    try {
      const response = await axios.post<OpenAiResponsesApiResponse>(
        'https://api.openai.com/v1/responses',
        {
          model: this.openAiModel,
          temperature: 0.1,
          instructions: JD_SKILL_SYSTEM_INSTRUCTIONS,
          prompt_cache_key: JD_SKILL_PROMPT_CACHE_KEY,
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: `Allowed skill titles (return only exact strings from this list):\n${allowedTitles.join(', ')}`,
                },
                {
                  type: 'input_text',
                  text: `Job description:\n${jdText.slice(0, 6000)}`,
                },
              ],
            },
          ],
        },
        {
          timeout: this.requestTimeoutMs,
          headers: {
            Authorization: `Bearer ${this.openAiApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logOpenAiUsage(this.openAiModel, response.data);

      const content = extractOpenAiResponseText(response.data);
      if (typeof content !== 'string' || !content.trim()) {
        return [];
      }

      const allowed = new Set(allowedTitles);
      return this.parseStringArray(content).filter((title) => allowed.has(title));
    } catch (error) {
      this.logger.warn(`JD skill extraction failed: ${this.getErrorSummary(error)}`);
      return [];
    }
  }

  private parseStringArray(rawText: string): string[] {
    let text = rawText.trim();
    if (text.startsWith('```json')) text = text.replace(/^```json/, '');
    if (text.startsWith('```')) text = text.replace(/^```/, '');
    if (text.endsWith('```')) text = text.replace(/```$/, '');

    try {
      const parsed = JSON.parse(text.trim());
      return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
    } catch {
      return [];
    }
  }

  private logOpenAiUsage(modelName: string, response: OpenAiResponsesApiResponse | undefined): void {
    const usage = response?.usage;

    if (!usage) {
      this.logger.log(`OpenAI Responses usage: model=${modelName}, response_id=${response?.id ?? 'unknown'}, usage=missing`);
      return;
    }

    const cachedTokens = usage.input_tokens_details?.cached_tokens ?? 0;
    const reasoningTokens = usage.output_tokens_details?.reasoning_tokens ?? 0;

    this.logger.log(
      `OpenAI Responses usage: model=${modelName}, response_id=${response?.id ?? 'unknown'}, input_tokens=${
        usage.input_tokens ?? 0
      }, cached_tokens=${cachedTokens}, output_tokens=${usage.output_tokens ?? 0}, reasoning_tokens=${reasoningTokens}, total_tokens=${
        usage.total_tokens ?? 0
      }`,
    );
  }

  private parseGeneratedSkills(rawText: string): GeneratedSkill[] {
    let responseText = rawText.trim();

    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/^```json/, '');
    }
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```/, '');
    }
    if (responseText.endsWith('```')) {
      responseText = responseText.replace(/```$/, '');
    }

    responseText = responseText.trim();

    const parsed = JSON.parse(responseText);
    if (!Array.isArray(parsed)) {
      throw new Error('Output was not an array.');
    }

    return this.normalizeGeneratedSkills(parsed);
  }

  /**
   * Coerces the raw model output into well-formed skills before they reach the
   * database. Each `parentIndex` must reference an earlier item, which keeps the
   * generated tree a forest (no self/forward references and therefore no cycles).
   */
  private normalizeGeneratedSkills(items: unknown[]): GeneratedSkill[] {
    return items.map((item, index) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};

      const title = typeof record.title === 'string' ? record.title.trim() : '';
      const description = typeof record.description === 'string' ? record.description : '';
      const icon = typeof record.icon === 'string' && record.icon.trim() ? record.icon.trim() : 'star';
      const youtubeSearchQuery =
        typeof record.youtubeSearchQuery === 'string' && record.youtubeSearchQuery.trim()
          ? record.youtubeSearchQuery.trim()
          : undefined;

      const rawParent = record.parentIndex;
      let parentIndex =
        typeof rawParent === 'number' && Number.isInteger(rawParent) ? rawParent : null;
      if (parentIndex !== null && (parentIndex < 0 || parentIndex >= index)) {
        parentIndex = null;
      }

      return { title, description, icon, parentIndex, youtubeSearchQuery };
    });
  }

  private async enrichWithYoutubeLinks(skills: GeneratedSkill[]): Promise<GeneratedSkill[]> {
    if (!this.youtubeApiKey) {
      this.logger.warn('YOUTUBE_API_KEY is not defined. Skipping YouTube video search.');
      return skills;
    }

    await Promise.all(skills.map(async (skill) => {
      if (!skill.youtubeSearchQuery) {
        return;
      }

      try {
        const ytResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            part: 'snippet',
            q: `${skill.youtubeSearchQuery} tutorial`,
            type: 'video',
            maxResults: 1,
            key: this.youtubeApiKey,
          },
          timeout: this.youtubeRequestTimeoutMs,
        });

        if (ytResponse.data.items && ytResponse.data.items.length > 0) {
          const videoId = ytResponse.data.items[0].id.videoId;
          const videoTitle = ytResponse.data.items[0].snippet.title;
          const videoLink = `https://www.youtube.com/watch?v=${videoId}`;
          const safeTitle = videoTitle.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
          skill.description += `\n\nRecommended Video: [${safeTitle}](${videoLink})`;
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch YouTube video for "${skill.youtubeSearchQuery}": ${this.getErrorSummary(error)}`);
      }
    }));

    return skills;
  }

  private isRetryableHttpError(error: unknown): boolean {
    const status = this.getStatusCode(error);
    if (status && [408, 429, 500, 502, 503, 504].includes(status)) {
      return true;
    }

    const code = this.getErrorCode(error);
    if (code && ['ETIMEDOUT', 'ECONNABORTED', 'ECONNRESET', 'EAI_AGAIN'].includes(code)) {
      return true;
    }

    const message = this.getErrorMessage(error).toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('deadline') ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('service unavailable') ||
      message.includes('unavailable') ||
      message.includes('overloaded')
    );
  }

  private isProviderRetryableError(error: unknown): boolean {
    if (!this.isRetryableHttpError(error)) {
      return false;
    }

    const message = this.getErrorMessage(error).toLowerCase();
    return !message.includes('quota') && !message.includes('billing');
  }

  private getStatusCode(error: unknown): number | undefined {
    if (axios.isAxiosError(error)) {
      return error.response?.status;
    }

    if (typeof error === 'object' && error !== null) {
      const maybeStatus = (error as { status?: unknown; code?: unknown }).status;
      if (typeof maybeStatus === 'number') {
        return maybeStatus;
      }
    }

    return undefined;
  }

  private getErrorCode(error: unknown): string | undefined {
    if (axios.isAxiosError(error)) {
      return typeof error.code === 'string' ? error.code : undefined;
    }

    if (typeof error === 'object' && error !== null) {
      const maybeCode = (error as { code?: unknown }).code;
      if (typeof maybeCode === 'string') {
        return maybeCode;
      }
    }

    return undefined;
  }

  private getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const responseMessage = error.response?.data?.error?.message;
      if (typeof responseMessage === 'string' && responseMessage.trim()) {
        return responseMessage;
      }

      const rootMessage = error.response?.data?.message;
      if (typeof rootMessage === 'string' && rootMessage.trim()) {
        return rootMessage;
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Unknown error';
  }

  private getErrorSummary(error: unknown): string {
    const status = this.getStatusCode(error);
    const code = this.getErrorCode(error);
    const message = this.getErrorMessage(error);

    return [status ? `status=${status}` : null, code ? `code=${code}` : null, message]
      .filter(Boolean)
      .join(', ');
  }

  private getPublicFailureMessage(error: unknown): string {
    const message = this.getErrorMessage(error).toLowerCase();

    if (message.includes('quota') || message.includes('billing')) {
      return 'OpenAI quota is exceeded. Check billing or try again later.';
    }

    if (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('service unavailable') ||
      message.includes('unavailable') ||
      message.includes('overloaded') ||
      message.includes('timed out') ||
      message.includes('timeout')
    ) {
      return 'AI providers are temporarily unavailable. Please try again in a minute.';
    }

    return 'Failed to generate skill tree. Please try again.';
  }

  private getTimeoutMs(): number {
    const raw = getOptionalEnv('AI_REQUEST_TIMEOUT_MS');
    const parsed = raw ? Number(raw) : DEFAULT_REQUEST_TIMEOUT_MS;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REQUEST_TIMEOUT_MS;
  }

  private getYoutubeTimeoutMs(): number {
    const raw = getOptionalEnv('AI_YOUTUBE_REQUEST_TIMEOUT_MS');
    const parsed = raw ? Number(raw) : DEFAULT_YOUTUBE_REQUEST_TIMEOUT_MS;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_YOUTUBE_REQUEST_TIMEOUT_MS;
  }

  private getRetryCount(): number {
    const raw = getOptionalEnv('AI_PROVIDER_RETRY_COUNT');
    const parsed = raw ? Number(raw) : DEFAULT_PROVIDER_RETRY_COUNT;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_PROVIDER_RETRY_COUNT;
  }

  private getRetryDelayMs(): number {
    const raw = getOptionalEnv('AI_PROVIDER_RETRY_DELAY_MS');
    const parsed = raw ? Number(raw) : DEFAULT_PROVIDER_RETRY_DELAY_MS;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PROVIDER_RETRY_DELAY_MS;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
