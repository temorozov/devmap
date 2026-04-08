export interface OpenAiUsage {
  input_tokens?: number;
  input_tokens_details?: {
    cached_tokens?: number;
  };
  output_tokens?: number;
  output_tokens_details?: {
    reasoning_tokens?: number;
  };
  total_tokens?: number;
}

export interface OpenAiOutputTextItem {
  type?: string;
  text?: string;
}

export interface OpenAiOutputMessage {
  type?: string;
  content?: OpenAiOutputTextItem[];
}

export interface OpenAiResponsesApiResponse {
  id?: string;
  output?: OpenAiOutputMessage[];
  output_text?: string;
  usage?: OpenAiUsage;
}

export function extractOpenAiResponseText(response: OpenAiResponsesApiResponse | undefined): string {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text;
  }

  const outputItems = Array.isArray(response?.output) ? response.output : [];

  return outputItems
    .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
    .filter((item) => item.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text?.trim() ?? '')
    .filter(Boolean)
    .join('\n');
}
