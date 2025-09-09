import { test, expect } from '@playwright/test';

/**
 * Basic Conductor UI Tests
 * Tests core functionality and user interactions
 */
test.describe('Conductor UI - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to conductor UI
    await page.goto('/');
  });

  test('should load conductor interface', async ({ page }) => {
    // Verify page loads
    await expect(page).toHaveTitle(/MEANDER/);

    // Check for main UI elements
    await expect(page.locator('text=MEANDER Conductor')).toBeVisible();
    await expect(page.locator('text=Load Show')).toBeVisible();
  });

  test('should display show loading interface', async ({ page }) => {
    // Click Load Show button
    const loadShowButton = page.locator('button:has-text("Load Show")');
    await expect(loadShowButton).toBeVisible();

    // Verify button is clickable
    await expect(loadShowButton).toBeEnabled();
  });

  test('should have reset button available', async ({ page }) => {
    // Check for reset button (red button to the left of Load Show)
    const resetButton = page.locator('button.menu-btn-reset');
    await expect(resetButton).toBeVisible();
    await expect(resetButton).toHaveText('Reset');
  });

  test('should display timer information', async ({ page }) => {
    // Check for timer display in header
    const timerElement = page.locator('[style*="color:#a0a0a0"]').first();
    await expect(timerElement).toBeVisible();
  });

  test('should have QR code button that opens QR page', async ({ page }) => {
    // Check for QR code button in control bar
    const qrButton = page.locator('button:has-text("📱 QR Codes")');
    await expect(qrButton).toBeVisible();
    await expect(qrButton).toBeEnabled();

    // Click the QR button and verify it opens a new tab
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      qrButton.click()
    ]);

    // Wait for the new page to load
    await newPage.waitForLoadState();
    
    // Verify the new page is the QR code page
    await expect(newPage).toHaveURL(/\/QR$/);
    await expect(newPage.locator('h1:has-text("MEANDER QR Codes")')).toBeVisible();
    
    // Close the new page
    await newPage.close();
  });
});
