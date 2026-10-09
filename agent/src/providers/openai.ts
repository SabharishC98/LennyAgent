import { LLMProvider } from './index.js';

export class OpenAICompatibleAdapter implements LLMProvider {
  baseUrl: string;
  apiKey: string;
  model: string;

  constructor(baseUrl: string, apiKey: string, model: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
  }

  async chat(messages: any[], options?: any): Promise<string> {
    const res = await fetch(\\/chat/completions\, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: \Bearer \\ } : {})
      },
      body: JSON.stringify({ model: this.model, messages, ...options }),
    });
    if (!res.ok) {
       if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After');
          throw new Error(\Rate limit exceeded: 429. Retry-After: \\);
       }
       throw new Error(\Provider error: \\);
    }
    const data = await res.json();
    return data.choices[0].message.content;
  }
  
  async *streamChat(messages: any[], options?: any): AsyncGenerator<string, void, unknown> {
    yield 'Streaming not fully implemented in mock yet';
  }
}
