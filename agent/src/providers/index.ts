export interface LLMProvider {
  chat(messages: any[], options?: any): Promise<string>;
  streamChat(messages: any[], options?: any): AsyncGenerator<string, void, unknown>;
}

export { OpenAICompatibleAdapter } from './openai.js';
export { AnthropicAdapter } from './anthropic.js';

export class FallbackManager {
  providers: { provider: LLMProvider; name: string }[];

  constructor(providers: (LLMProvider | { provider: LLMProvider; name: string })[]) {
    this.providers = providers.map((p, idx) => {
      if ('provider' in p && 'name' in p) {
        return p as { provider: LLMProvider; name: string };
      }
      return { provider: p as LLMProvider, name: `provider-${idx}` };
    });
  }

  async chatWithFallback(messages: any[], options?: any): Promise<{ text: string; providerName: string; providerIndex: number }> {
    for (let i = 0; i < this.providers.length; i++) {
      const entry = this.providers[i];
      try {
        const text = await entry.provider.chat(messages, options);
        if (text) {
          return { text, providerName: entry.name, providerIndex: i };
        }
      } catch (error: any) {
        if (i === this.providers.length - 1) {
          throw error;
        }
        console.warn(`Provider ${entry.name} failed, falling back to next provider:`, error?.message || error);
      }
    }
    throw new Error('All configured LLM providers failed.');
  }
}
