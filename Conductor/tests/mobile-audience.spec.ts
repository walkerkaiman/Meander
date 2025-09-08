import { test, expect } from '@playwright/test';

/**
 * Mobile Audience Tests
 * Tests audience experience on mobile devices with touch interactions
 */
test.describe('Mobile Audience Experience', () => {

  test('mobile audience voting experience', async ({ page }) => {
    console.log('📱 Testing mobile audience experience...');

    // Navigate to audience page
    await page.goto('/audience-page');
    await page.waitForLoadState('networkidle');

    // Wait for mobile-optimized layout
    await page.waitForTimeout(3000);

    // Verify mobile viewport
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(768); // Mobile breakpoint
    console.log(`📏 Mobile viewport: ${viewport?.width}x${viewport?.height}`);

    // Test touch interactions
    const voteButtons = page.locator('button.fork__choice');

    if (await voteButtons.isVisible().catch(() => false)) {
      console.log('✅ Mobile voting interface detected');

      // Simulate touch delay (humans take time to decide on mobile)
      await page.waitForTimeout(2500);

      // Test touch interaction on first button
      const firstButton = voteButtons.first();
      await firstButton.tap(); // Use tap instead of click for mobile

      console.log('👆 Tapped first voting option');

      // Verify mobile selection feedback
      const hasSelectedClass = await firstButton.evaluate(el =>
        el.classList.contains('fork__choice--selected')
      );

      if (hasSelectedClass) {
        console.log('✅ Mobile vote selection confirmed');
      }

      // Test changing vote on mobile
      const buttonCount = await voteButtons.count();
      if (buttonCount > 1) {
        await page.waitForTimeout(2000); // More decision time on mobile

        const secondButton = voteButtons.nth(1);
        await secondButton.tap();

        console.log('🔄 Changed vote on mobile device');
      }
    } else {
      console.log('ℹ️ No voting active - testing mobile scene display');

      // Test mobile scene content
      const mediaElement = page.locator('img, video');
      const textContent = page.locator('text').first();

      const hasMedia = await mediaElement.isVisible().catch(() => false);
      const hasText = await textContent.isVisible().catch(() => false);

      expect(hasMedia || hasText).toBe(true);

      if (hasMedia) {
        console.log('✅ Mobile media display verified');

        // Test mobile media scaling
        const mediaRect = await mediaElement.first().boundingBox();
        expect(mediaRect?.width).toBeLessThan(viewport?.width! + 20); // Should fit mobile screen
      }
    }

    // Test mobile-specific behaviors
    console.log('📱 Testing mobile-specific interactions...');

    // Test viewport doesn't change unexpectedly (common mobile issue)
    const initialViewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));

    await page.waitForTimeout(5000); // Wait for potential layout shifts

    const finalViewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));

    // Viewport should remain stable (allow small changes for dynamic content)
    expect(Math.abs(finalViewport.width - initialViewport.width)).toBeLessThan(50);
    expect(Math.abs(finalViewport.height - initialViewport.height)).toBeLessThan(100);

    console.log('✅ Mobile viewport stability verified');
  });

  test('mobile device orientation handling', async ({ page }) => {
    // Note: Playwright's device emulation doesn't fully support orientation changes
    // This test focuses on ensuring the interface works in portrait mode

    console.log('📱 Testing mobile orientation compatibility...');

    await page.goto('http://localhost:4000/audience-page');
    await page.waitForLoadState('networkidle');

    // Verify content fits mobile portrait orientation
    const body = page.locator('body');
    const bodyRect = await body.boundingBox();

    const viewport = page.viewportSize();
    expect(bodyRect?.width).toBeLessThanOrEqual(viewport?.width!);

    // Test that buttons are appropriately sized for touch
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      const firstButton = buttons.first();
      const buttonRect = await firstButton.boundingBox();

      // Touch targets should be at least 44px (iOS guideline)
      expect(buttonRect?.height).toBeGreaterThanOrEqual(44);
      console.log(`👆 Button touch target: ${buttonRect?.width}x${buttonRect?.height}px`);
    }

    console.log('✅ Mobile orientation compatibility verified');
  });
});
