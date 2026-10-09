export interface LLMProvider {
  chat(messages: any[], options?: any): Promise<string>;
  streamChat(messages: any[], options?: any): AsyncGenerator<string, void, unknown>;
}

export class FallbackManager {
  providers: LLMProvider[];
  
  constructor(providers: LLMProvider[]) {
    this.providers = providers;
  }
  
  async chatWithFallback(messages: any[], options?: any): Promise<{text: string, providerIndex: number}> {
    for (let i = 0; i < this.providers.length; i++) {
      try {
        const text = await this.providers[i].chat(messages, options);
        return { text, providerIndex: i };
      } catch (error: any) {
        if (i === this.providers.length - 1) throw error;
        // Simple backoff could be added here
        console.warn('Provider failed, falling back to next provider', error);
      }
    }
    throw new Error('All providers failed');
  }
}
