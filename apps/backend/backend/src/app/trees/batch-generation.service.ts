import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import { PrismaService } from '../prisma/prisma.service';
import { getOptionalEnv } from '../config/env';
import { extractOpenAiResponseText, OpenAiResponsesApiResponse, OpenAiUsage } from './openai-response.utils';

interface OpenAiFileResponse {
  id?: string;
}

interface OpenAiBatchResponse {
  id?: string;
  status?: string;
  input_file_id?: string;
  output_file_id?: string;
  error_file_id?: string;
  completed_at?: number | null;
  request_counts?: {
    total?: number;
    completed?: number;
    failed?: number;
  };
  usage?: OpenAiUsage;
}

interface OpenAiBatchOutputLine {
  custom_id?: string;
  response?: {
    status_code?: number;
    body?: OpenAiResponsesApiResponse;
  };
  error?: {
    message?: string;
  } | null;
}

interface BatchRequestMetadata {
  customId: string;
  nodeId: string;
}

const NODE_DESCRIPTION_BATCH_KIND = 'node-description-generation';
const DEFAULT_BATCH_OPENAI_MODEL = 'gpt-5.4-nano';
const BATCH_RESPONSES_ENDPOINT = '/v1/responses';
const BATCH_COMPLETION_WINDOW = '24h';
const NODE_DESCRIPTION_PROMPT_CACHE_KEY = 'skill-tree:node-description:v1';
const BATCH_FILES_DIR = '/tmp/skill-tree-batches';

const NODE_DESCRIPTION_SYSTEM_INSTRUCTIONS = `You generate background learning content for existing skill tree nodes.
Return only valid JSON with no markdown, prose, or code fences.`;

const NODE_DESCRIPTION_PROMPT_PREFIX = `General rules:
1. Generate a practical description for the provided skill tree node.
2. The response must be a JSON object with exactly one field: "description".
3. The description must be 1-2 short sentences and no more than 30-40 words total.
4. Explain what to learn or practice in direct language with no fluff, repetition, or long explanations.
5. Do not invent links, courses, or citations.

Response format:
{
  "description": "Helpful guidance for the learner."
}

Example:
{
  "description": "Learn the core syntax first. Practice with a few small exercises before moving to the next node."
}`;

@Injectable()
export class BatchGenerationService {
  private readonly logger = new Logger(BatchGenerationService.name);
  private readonly openAiApiKey = getOptionalEnv('OPENAI_API_KEY');
  private readonly openAiModel = getOptionalEnv('AI_BATCH_OPENAI_MODEL', DEFAULT_BATCH_OPENAI_MODEL) ?? DEFAULT_BATCH_OPENAI_MODEL;

  constructor(private readonly prisma: PrismaService) {}

  async queueNodeDescriptionGeneration(userId: string, treeId: string, nodeIds?: string[]) {
    if (!this.openAiApiKey) {
      throw new ServiceUnavailableException('OpenAI batch generation is not configured right now.');
    }

    const tree = await this.prisma.tree.findFirst({ where: { id: treeId, userId } });
    if (!tree) {
      throw new UnauthorizedException('Tree access denied');
    }

    const nodes = await this.prisma.node.findMany({
      where: {
        treeId,
        ...(nodeIds?.length ? { id: { in: nodeIds } } : {}),
      },
      include: {
        parent: true,
        children: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!nodes.length) {
      throw new BadRequestException('No nodes found for batch generation.');
    }

    const requestMetadata: BatchRequestMetadata[] = nodes.map((node) => ({
      customId: `node-${node.id}`,
      nodeId: node.id,
    }));

    const jsonlContent = nodes
      .map((node) =>
        JSON.stringify({
          custom_id: `node-${node.id}`,
          method: 'POST',
          url: BATCH_RESPONSES_ENDPOINT,
          body: {
            model: this.openAiModel,
            temperature: 0.4,
            instructions: NODE_DESCRIPTION_SYSTEM_INSTRUCTIONS,
            prompt_cache_key: NODE_DESCRIPTION_PROMPT_CACHE_KEY,
            input: [
              {
                role: 'user',
                content: [
                  {
                    type: 'input_text',
                    text: NODE_DESCRIPTION_PROMPT_PREFIX,
                  },
                  {
                    type: 'input_text',
                    text: this.buildNodeDescriptionPromptSuffix({
                      treeTitle: tree.title,
                      nodeTitle: node.title,
                      parentTitle: node.parent?.title,
                      childrenTitles: node.children.map((child) => child.title),
                      existingDescription: node.description ?? undefined,
                    }),
                  },
                ],
              },
            ],
          },
        }),
      )
      .join('\n');

    const job = await this.prisma.aiBatchJob.create({
      data: {
        userId,
        treeId,
        kind: NODE_DESCRIPTION_BATCH_KIND,
        status: 'preparing',
        provider: 'openai',
        model: this.openAiModel,
        endpoint: BATCH_RESPONSES_ENDPOINT,
        requestCount: nodes.length,
        metadata: {
          requests: requestMetadata as unknown as Prisma.InputJsonValue,
        } as Prisma.InputJsonObject,
      },
    });

    const jsonlPath = path.join(BATCH_FILES_DIR, `${job.id}.jsonl`);

    try {
      await mkdir(BATCH_FILES_DIR, { recursive: true });
      await writeFile(jsonlPath, `${jsonlContent}\n`, 'utf8');

      const inputFileId = await this.uploadBatchInputFile(jsonlPath);
      const batch = await this.createOpenAiBatch(inputFileId, job.id, treeId);

      return this.prisma.aiBatchJob.update({
        where: { id: job.id },
        data: {
          status: batch.status ?? 'validating',
          batchId: batch.id,
          inputFileId,
          inputJsonlPath: jsonlPath,
          outputFileId: batch.output_file_id ?? null,
          errorFileId: batch.error_file_id ?? null,
          completedCount: batch.request_counts?.completed ?? 0,
          failedCount: batch.request_counts?.failed ?? 0,
        },
      });
    } catch (error) {
      const message = this.getErrorMessage(error);

      await this.prisma.aiBatchJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          inputJsonlPath: jsonlPath,
          lastError: message,
        },
      });

      this.logger.error(`Failed to queue OpenAI batch job ${job.id}: ${message}`, error instanceof Error ? error.stack : undefined);
      throw new ServiceUnavailableException('Failed to queue background AI generation.');
    }
  }

  async getBatchJob(userId: string, jobId: string) {
    const job = await this.prisma.aiBatchJob.findFirst({
      where: { id: jobId, userId },
    });

    if (!job) {
      throw new NotFoundException('Batch job not found.');
    }

    return job;
  }

  async syncBatchJob(userId: string, jobId: string) {
    const job = await this.prisma.aiBatchJob.findFirst({
      where: { id: jobId, userId },
    });

    if (!job) {
      throw new NotFoundException('Batch job not found.');
    }

    if (!job.batchId) {
      return job;
    }

    if (!this.openAiApiKey) {
      throw new ServiceUnavailableException('OpenAI batch generation is not configured right now.');
    }

    const batch = await this.getOpenAiBatch(job.batchId);
    this.logBatchUsage(batch, job.id);

    const updatedJob = await this.prisma.aiBatchJob.update({
      where: { id: job.id },
      data: {
        status: batch.status ?? job.status,
        outputFileId: batch.output_file_id ?? job.outputFileId,
        errorFileId: batch.error_file_id ?? job.errorFileId,
        completedCount: batch.request_counts?.completed ?? job.completedCount,
        failedCount: batch.request_counts?.failed ?? job.failedCount,
        completedAt: batch.completed_at ? new Date(batch.completed_at * 1000) : job.completedAt,
      },
    });

    if (!updatedJob.resultsAppliedAt && batch.output_file_id && this.isTerminalBatchStatus(batch.status)) {
      await this.applyBatchResults(updatedJob.id, batch.output_file_id);

      return this.prisma.aiBatchJob.findUniqueOrThrow({
        where: { id: updatedJob.id },
      });
    }

    return updatedJob;
  }

  private buildNodeDescriptionPromptSuffix(input: {
    treeTitle: string;
    nodeTitle: string;
    parentTitle?: string;
    childrenTitles: string[];
    existingDescription?: string;
  }): string {
    const childrenLine = input.childrenTitles.length ? input.childrenTitles.join(', ') : 'None';
    const existingDescription = input.existingDescription?.trim() ? input.existingDescription : 'None';

    return `User-specific context (changes on every request):
Tree title: ${input.treeTitle}
Node title: ${input.nodeTitle}
Parent node: ${input.parentTitle ?? 'None'}
Child nodes: ${childrenLine}
Existing description: ${existingDescription}`;
  }

  private async uploadBatchInputFile(filePath: string): Promise<string> {
    const formData = new FormData();
    formData.append('purpose', 'batch');
    formData.append('file', createReadStream(filePath));

    const response = await axios.post<OpenAiFileResponse>('https://api.openai.com/v1/files', formData, {
      headers: {
        Authorization: `Bearer ${this.openAiApiKey}`,
        ...formData.getHeaders(),
      },
      maxBodyLength: Infinity,
    });

    if (!response.data?.id) {
      throw new Error('OpenAI did not return an input file id for the batch upload.');
    }

    return response.data.id;
  }

  private async createOpenAiBatch(inputFileId: string, localJobId: string, treeId: string): Promise<OpenAiBatchResponse> {
    const response = await axios.post<OpenAiBatchResponse>(
      'https://api.openai.com/v1/batches',
      {
        input_file_id: inputFileId,
        endpoint: BATCH_RESPONSES_ENDPOINT,
        completion_window: BATCH_COMPLETION_WINDOW,
        metadata: {
          local_job_id: localJobId,
          batch_kind: NODE_DESCRIPTION_BATCH_KIND,
          tree_id: treeId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.openAiApiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.data?.id) {
      throw new Error('OpenAI did not return a batch id.');
    }

    return response.data;
  }

  private async getOpenAiBatch(batchId: string): Promise<OpenAiBatchResponse> {
    const response = await axios.get<OpenAiBatchResponse>(`https://api.openai.com/v1/batches/${batchId}`, {
      headers: {
        Authorization: `Bearer ${this.openAiApiKey}`,
      },
    });

    return response.data;
  }

  private async applyBatchResults(jobId: string, outputFileId: string): Promise<void> {
    const job = await this.prisma.aiBatchJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Batch job not found.');
    }

    const response = await axios.get<string>(`https://api.openai.com/v1/files/${outputFileId}/content`, {
      headers: {
        Authorization: `Bearer ${this.openAiApiKey}`,
      },
      responseType: 'text',
    });

    const lines = response.data
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as OpenAiBatchOutputLine);

    const requests = this.getJobRequests(job.metadata);
    const requestMap = new Map(requests.map((request) => [request.customId, request.nodeId]));
    let appliedCount = 0;
    let lastError: string | null = null;

    for (const line of lines) {
      if (!line.custom_id) {
        continue;
      }

      const nodeId = requestMap.get(line.custom_id);
      if (!nodeId) {
        continue;
      }

      if (line.error?.message) {
        lastError = line.error.message;
        continue;
      }

      if (line.response?.status_code !== 200) {
        lastError = `Batch request ${line.custom_id} failed with status ${line.response?.status_code ?? 'unknown'}.`;
        continue;
      }

      const rawText = extractOpenAiResponseText(line.response.body);
      const description = this.parseDescriptionResult(rawText);

      if (!description) {
        lastError = `Batch request ${line.custom_id} returned an empty description.`;
        continue;
      }

      await this.prisma.node.update({
        where: { id: nodeId },
        data: {
          description,
        },
      });

      appliedCount += 1;
    }

    await this.prisma.aiBatchJob.update({
      where: { id: jobId },
      data: {
        resultsAppliedAt: new Date(),
        lastError,
        completedCount: Math.max(job.completedCount, appliedCount),
      },
    });
  }

  private parseDescriptionResult(rawText: string): string {
    let text = rawText.trim();

    if (!text) {
      return '';
    }

    if (text.startsWith('```json')) {
      text = text.replace(/^```json/, '');
    }
    if (text.startsWith('```')) {
      text = text.replace(/^```/, '');
    }
    if (text.endsWith('```')) {
      text = text.replace(/```$/, '');
    }

    text = text.trim();

    try {
      const parsed = JSON.parse(text) as { description?: unknown };
      if (typeof parsed?.description === 'string' && parsed.description.trim()) {
        return parsed.description.trim();
      }
    } catch {
      return text;
    }

    return text;
  }

  private getJobRequests(metadata: unknown): BatchRequestMetadata[] {
    if (!metadata || typeof metadata !== 'object') {
      return [];
    }

    const requests = (metadata as { requests?: unknown }).requests;
    if (!Array.isArray(requests)) {
      return [];
    }

    return requests
      .map((request) => {
        if (
          typeof request === 'object' &&
          request !== null &&
          typeof (request as { customId?: unknown }).customId === 'string' &&
          typeof (request as { nodeId?: unknown }).nodeId === 'string'
        ) {
          return {
            customId: (request as { customId: string }).customId,
            nodeId: (request as { nodeId: string }).nodeId,
          };
        }

        return null;
      })
      .filter((request): request is BatchRequestMetadata => request !== null);
  }

  private isTerminalBatchStatus(status: string | undefined): boolean {
    return ['completed', 'failed', 'expired', 'cancelled'].includes(status ?? '');
  }

  private logBatchUsage(batch: OpenAiBatchResponse, jobId: string): void {
    if (!batch.usage) {
      return;
    }

    const cachedTokens = batch.usage.input_tokens_details?.cached_tokens ?? 0;
    const reasoningTokens = batch.usage.output_tokens_details?.reasoning_tokens ?? 0;

    this.logger.log(
      `OpenAI Batch usage: job_id=${jobId}, batch_id=${batch.id ?? 'unknown'}, input_tokens=${batch.usage.input_tokens ?? 0}, cached_tokens=${cachedTokens}, output_tokens=${batch.usage.output_tokens ?? 0}, reasoning_tokens=${reasoningTokens}, total_tokens=${batch.usage.total_tokens ?? 0}`,
    );
  }

  private getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const responseMessage = error.response?.data?.error?.message;
      if (typeof responseMessage === 'string' && responseMessage.trim()) {
        return responseMessage;
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
