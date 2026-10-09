import { describe, it, expect } from 'vitest';
import DOMPurify from 'dompurify';

describe('Frontend Sanitizer', () => {
  it('should sanitize script tags via DOMPurify', () => {
    const dirty = '<script>alert(1)</script><p>clean</p>';
    const clean = DOMPurify.sanitize(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).toContain('<p>clean</p>');
  });
});
