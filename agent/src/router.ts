import { logger } from './logger.js';
export type Intent = 'question' | 'essay' | 'artifact';
export async function routeIntent(input: string): Promise<Intent> {
   const lower = input.toLowerCase();
   let decision: Intent = 'question';
   if (lower.includes('essay') || lower.includes('write a post')) decision = 'essay';
   else if (lower.includes('make it shorter') || lower.includes('generate html') || lower.includes('artifact')) decision = 'artifact';
   logger.info({ input, decision }, 'Router classified intent');
   return decision;
}
