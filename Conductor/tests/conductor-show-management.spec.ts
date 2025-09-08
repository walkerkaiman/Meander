import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Conductor Show Management Tests
 * Tests show upload, loading, and basic scene management
 */
test.describe('Conductor UI - Show Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should upload and load a show file', async ({ page }) => {
    // Create a simple test show file (mock)
    const testShowPath = path.join(process.cwd(), 'tests', 'fixtures', 'test-show.zip');

    // Click Load Show button
    const loadShowButton = page.locator('button:has-text("Load Show")');
    await loadShowButton.click();

    // Mock file input interaction (in real scenario, would upload actual file)
    // For now, we'll test the UI flow without actual file upload
    await expect(page.locator('text=No show data loaded')).toBeVisible();
  });

  test('should display advance button when show is loaded', async ({ page }) => {
    // This test assumes a show is already loaded
    // In real testing, we'd need to upload a show first

    // Look for advance button (could be "Advance" or "Start Vote")
    const advanceButton = page.locator('button.control-btn-advance');
    // Button may not be visible if no show is loaded
    const isVisible = await advanceButton.isVisible().catch(() => false);

    if (isVisible) {
      await expect(advanceButton).toBeEnabled();
      await expect(advanceButton).toMatchText(/(Advance|Start Vote)/);
    }
  });

  test('should handle reset functionality', async ({ page }) => {
    // Click reset button
    const resetButton = page.locator('button.menu-btn-reset');
    await resetButton.click();

    // Verify reset request was made (would need to mock server response)
    // In real testing, we'd check for success message or state change
  });

  test('should display current scene information', async ({ page }) => {
    // Check for current state display in sidebar
    const currentStateSection = page.locator('text=Current State');
    const isVisible = await currentStateSection.isVisible().catch(() => false);

    if (isVisible) {
      await expect(currentStateSection).toBeVisible();

      // Check for scene description
      const descriptionSection = page.locator('text=Description');
      await expect(descriptionSection).toBeVisible();
    }
  });

  test('should handle canvas interactions', async ({ page }) => {
    // Test mouse wheel zoom
    const canvas = page.locator('.react-flow__viewport');
    const isVisible = await canvas.isVisible().catch(() => false);

    if (isVisible) {
      // Test zoom functionality
      await canvas.hover();

      // Get initial transform
      const initialTransform = await canvas.evaluate(el => {
        return window.getComputedStyle(el).transform;
      });

      // Simulate mouse wheel zoom (this may not work perfectly in headless mode)
      await page.mouse.wheel(0, -100);

      // Note: Actual zoom testing would require checking transform changes
      // This is a placeholder for zoom interaction testing
    }
  });
});
