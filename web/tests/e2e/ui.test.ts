import { test, expect } from '@playwright/test';

test.describe('Artifact Viewer Smoke Test', () => {
  test('renders main layout components', async ({ page }) => {
    // We mock the page since we are not running a full dev server in CI by default, 
    // or we can test against a known local route. For this scaffold, we just verify the route works.
    await page.goto('/');
    
    // Check New Chat button
    const newChatBtn = page.locator('button[aria-label="New Chat"]');
    await expect(newChatBtn).toBeVisible();
    
    // Check Artifact Viewer iframe
    const iframe = page.locator('iframe[title="artifact-sandbox"]');
    await expect(iframe).toBeVisible();
    
    // Check sandbox attribute
    const sandboxAttr = await iframe.getAttribute('sandbox');
    expect(sandboxAttr).toBe('allow-scripts');
    expect(sandboxAttr).not.toContain('allow-same-origin');
  });
});
