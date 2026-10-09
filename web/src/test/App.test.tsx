import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

/**
 * Phase 1: Minimal scaffold test.
 * Full UI tests in Phase 5.
 */
describe('App scaffold', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText(/New Chat/i)).toBeTruthy();
  });
});


