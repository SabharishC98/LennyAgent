import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { generateHash, chunkText } from '../src/utils.js';

describe('Ingest utilities', () => {
  it('should chunk text with overlap', () => {
    const text = new Array(100).fill('word').join(' ');
    const chunks = chunkText(text, 50, 10);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].split(' ').length).toBe(50);
  });

  it('should generate stable hash', () => {
    const hash1 = generateHash('test content');
    const hash2 = generateHash('test content');
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // sha256 hex length
  });
});
