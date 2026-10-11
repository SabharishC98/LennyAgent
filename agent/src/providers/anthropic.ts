import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider } from './index.js';
import { logger } from '../logger.js';

export class AnthropicAdapter implements LLMProvider {
  client: Anthropic | null = null;
  model: string;

  constructor(apiKey?: string, model: string = 'claude-3-5-sonnet-20241022') {
    this.model = model;
    if (apiKey) {
      try {
        this.client = new Anthropic({ apiKey });
      } catch (err) {
        logger.warn({ err }, 'Failed to initialize Anthropic SDK client');
      }
    }
  }

  async chat(messages: any[], options?: any): Promise<string> {
    if (!this.client) {
      throw new Error('Anthropic API key is not configured or client is uninitialized');
    }

    // Extract system message if present
    let systemPrompt = '';
    const anthropicMessages = messages
      .filter((m) => {
        if (m.role === 'system') {
          systemPrompt = m.content;
          return false;
        }
        return true;
      })
      .map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.max_tokens || 2048,
      system: systemPrompt || undefined,
      messages: anthropicMessages,
    });

    const firstBlock = response.content[0];
    if (firstBlock && firstBlock.type === 'text') {
      return firstBlock.text;
    }
    return '';
  }

  async *streamChat(messages: any[], options?: any): AsyncGenerator<string, void, unknown> {
    if (!this.client) {
      throw new Error('Anthropic API key is not configured');
    }

    let systemPrompt = '';
    const anthropicMessages = messages
      .filter((m) => {
        if (m.role === 'system') {
          systemPrompt = m.content;
          return false;
        }
        return true;
      })
      .map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }));

    const stream = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.max_tokens || 2048,
      system: systemPrompt || undefined,
      messages: anthropicMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }
}
