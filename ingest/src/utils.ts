import crypto from 'crypto';

export function generateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function chunkText(text: string, chunkSizeWords: number = 375, overlapWords: number = 60): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  if (words.length === 0) return [];
  
  for (let i = 0; i < words.length; i += (chunkSizeWords - overlapWords)) {
    chunks.push(words.slice(i, i + chunkSizeWords).join(' '));
  }
  return chunks;
}
