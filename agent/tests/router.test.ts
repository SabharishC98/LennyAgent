import { describe, it, expect, vi } from 'vitest';
import { routeIntent } from '../src/router.js';
import { write_ship30_essay } from '../src/skills/ship30.js';
import * as retrieval from '../src/retrieval.js';

describe('Router logic', () => {
   it('should default to question for ambiguous input', async () => {
      const intent = await routeIntent('What did Lenny say about growth?');
      expect(intent).toBe('question');
   });
   it('should route to essay', async () => {
      const intent = await routeIntent('Write an essay about product market fit');
      expect(intent).toBe('essay');
   });
});

describe('Ship30 logic', () => {
   it('should refuse if no evidence', async () => {
      vi.spyOn(retrieval, 'hybridRetrieve').mockResolvedValue([]);
      const res = await write_ship30_essay('query', {}, {});
      expect(res).toContain("don't support an answer");
   });
   it('should return best attempt with notice if length fails after retries', async () => {
      vi.spyOn(retrieval, 'hybridRetrieve').mockResolvedValue([{text: 'evidence'}]);
      const res = await write_ship30_essay('query', {}, {});
      expect(res).toContain("Notice: This essay may not strictly meet");
   });
});
