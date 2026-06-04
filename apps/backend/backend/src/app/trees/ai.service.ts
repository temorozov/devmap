import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

import { getOptionalEnv } from '../config/env';
import { extractOpenAiResponseText, OpenAiResponsesApiResponse } from './openai-response.utils';

const DEFAULT_OPENAI_MODEL = 'gpt-5.4-nano';
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;
const JD_SKILL_PROMPT_CACHE_KEY = 'jd-skill-extract:v1';

const JD_SKILL_SYSTEM_INSTRUCTIONS = `You extract the concrete technical skills and technologies a software job requires.
Translate role descriptions into specific technologies. For example: "AI/ML engineer" implies Python, TensorFlow, PyTorch; "full-stack developer" implies React, Node.js, TypeScript; "DevOps" implies Docker, Kubernetes, AWS, CI/CD.
Return ONLY a JSON array of strings, each chosen EXACTLY (same spelling and casing) from the provided allowed list. Include a skill only when the job description reasonably implies it. No prose, no markdown, no code fences.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openAiApiKey = getOptionalEnv('OPENAI_API_KEY');
  private readonly openAiModel = getOptionalEnv('AI_OPENAI_MODEL', DEFAULT_OPENAI_MODEL) ?? DEFAULT_OPENAI_MODEL;
  private readonly requestTimeoutMs = this.getTimeoutMs();

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

  private getStatusCode(error: unknown): number | undefined {
    if (axios.isAxiosError(error)) {
      return error.response?.status;
    }
    return undefined;
  }

  private getErrorCode(error: unknown): string | undefined {
    if (axios.isAxiosError(error)) {
      return typeof error.code === 'string' ? error.code : undefined;
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

  private getTimeoutMs(): number {
    const raw = getOptionalEnv('AI_REQUEST_TIMEOUT_MS');
    const parsed = raw ? Number(raw) : DEFAULT_REQUEST_TIMEOUT_MS;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REQUEST_TIMEOUT_MS;
  }
}
