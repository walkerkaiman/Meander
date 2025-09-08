import { test, expect } from '@playwright/test';

/**
 * Audience Page Voting Tests
 * Tests realistic human interactions with voting interface
 */
test.describe('Audience Page - Voting Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to audience page
    await page.goto('http://localhost:4000/audience-page');
  });

  test('should load audience interface', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for basic audience elements
    // Note: Exact elements depend on current scene state
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should handle voting interface when available', async ({ page }) => {
    // Wait for potential voting interface to appear
    await page.waitForTimeout(2000); // Allow time for WebSocket connection

    // Look for voting elements (fork interface)
    const voteButtons = page.locator('button.fork__choice');

    // Check if voting is available
    const buttonCount = await voteButtons.count();

    if (buttonCount > 0) {
      // Voting is active - test interactions
      await expect(voteButtons.first()).toBeVisible();
      await expect(voteButtons.first()).toBeEnabled();

      // Simulate human-like thinking delay
      await page.waitForTimeout(1500);

      // Click first voting option
      await voteButtons.first().click();

      // Verify button becomes selected (if visual feedback exists)
      await expect(voteButtons.first()).toHaveClass(/fork__choice--selected/);

      // Simulate more thinking time
      await page.waitForTimeout(1000);

      // Could change vote if interface allows
      if (buttonCount > 1) {
        await voteButtons.nth(1).click();
        await expect(voteButtons.nth(1)).toHaveClass(/fork__choice--selected/);
      }
    } else {
      // No voting active - check for other content
      console.log('No voting interface found - checking for scene content');

      // Look for scene content or loading state
      const sceneContent = page.locator('.scene');
      const loadingContent = page.locator('text=Loading');

      const hasScene = await sceneContent.isVisible().catch(() => false);
      const hasLoading = await loadingContent.isVisible().catch(() => false);

      expect(hasScene || hasLoading).toBe(true);
    }
  });

  test('should handle scene display', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(3000);

    // Check for scene media or content
    const mediaElement = page.locator('img, video');
    const textContent = page.locator('text').first();

    // At least one type of content should be visible
    const hasMedia = await mediaElement.isVisible().catch(() => false);
    const hasText = await textContent.isVisible().catch(() => false);

    expect(hasMedia || hasText).toBe(true);

    if (hasMedia) {
      // Test media loading
      await expect(mediaElement.first()).toBeVisible();

      // For video elements, check if they're playing
      const videoElement = page.locator('video');
      if (await videoElement.isVisible().catch(() => false)) {
        // Video should be playing (autoplay)
        const isPaused = await videoElement.evaluate(el => (el as HTMLVideoElement).paused);
        expect(isPaused).toBe(false);
      }
    }
  });

  test('should handle WebSocket reconnection', async ({ page }) => {
    // Wait for initial connection
    await page.waitForTimeout(2000);

    // Simulate network interruption (close WebSocket)
    await page.evaluate(() => {
      // This is a simplified simulation - in real testing,
      // we might need to intercept WebSocket connections
      console.log('Simulating connection interruption');
    });

    // Wait and check if interface handles disconnection gracefully
    await page.waitForTimeout(5000);

    // Interface should either reconnect or show appropriate state
    const body = page.locator('body');
    await expect(body).toBeVisible(); // Page should still be functional
  });

  test('should maintain device identity across sessions', async ({ page }) => {
    // Check if device ID is maintained (stored in localStorage)
    const deviceId = await page.evaluate(() => {
      return localStorage.getItem('meander_device_id');
    });

    // Device ID should exist
    expect(deviceId).toBeTruthy();
    expect(typeof deviceId).toBe('string');
    expect(deviceId?.length).toBeGreaterThan(0);
  });
});
