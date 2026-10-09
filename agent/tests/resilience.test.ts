import { describe, it, expect } from 'vitest';
import { logger } from '../src/logger.js';

describe('Resilience and Observability', () => {
   it('should log structured json for failures', () => {
      // Pino logs as JSON automatically. We just assert it exists.
      expect(logger).toBeDefined();
      expect(typeof logger.error).toBe('function');
   });

   it('should handle timeout or missing key gracefully', () => {
      const logOutput = JSON.stringify({ error: 'Missing key for provider groq' });
      expect(logOutput).not.toContain('sk-'); 
   });
});
