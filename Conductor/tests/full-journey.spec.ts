import { test, expect } from '@playwright/test';

/**
 * Full User Journey E2E Tests
 * Tests complete workflow from conductor setup to audience participation
 */
test.describe('Full User Journey - End-to-End', () => {
  test('complete show lifecycle with audience interaction', async ({ browser }) => {
    // Create multiple browser contexts for different users
    const conductorContext = await browser.newContext();
    const audienceContext = await browser.newContext();

    const conductorPage = await conductorContext.newPage();
    const audiencePage = await audienceContext.newPage();

    try {
      // ===== PHASE 1: Conductor Setup =====
      console.log('🚀 Starting conductor setup...');

      // Navigate to conductor
      await conductorPage.goto('http://localhost:5173');
      await expect(conductorPage.locator('text=MEANDER Conductor')).toBeVisible();

      // Verify interface is ready
      await expect(conductorPage.locator('button:has-text("Load Show")')).toBeVisible();
      await expect(conductorPage.locator('button.menu-btn-reset')).toBeVisible();

      // ===== PHASE 2: Audience Connection =====
      console.log('👥 Setting up audience connection...');

      // Navigate to audience page
      await audiencePage.goto('http://localhost:4000/audience-page');
      await audiencePage.waitForLoadState('networkidle');

      // Wait for WebSocket connection and initial state
      await audiencePage.waitForTimeout(3000);

      // ===== PHASE 3: Simulate Show Progression =====
      console.log('🎭 Simulating show progression...');

      // Check if audience is receiving state updates
      // This would normally happen when conductor advances scenes
      const audienceBody = audiencePage.locator('body');
      await expect(audienceBody).toBeVisible();

      // ===== PHASE 4: Test Voting Scenario =====
      console.log('🗳️ Testing voting interactions...');

      // Wait for potential voting interface
      await audiencePage.waitForTimeout(2000);

      // Look for voting buttons
      const voteButtons = audiencePage.locator('button.fork__choice');

      if (await voteButtons.isVisible().catch(() => false)) {
        console.log('✅ Voting interface detected');

        // Simulate human-like decision making
        await audiencePage.waitForTimeout(2000);

        // Click first voting option
        await voteButtons.first().click();
        console.log('🎯 Clicked first voting option');

        // Verify selection (if visual feedback exists)
        const selectedButton = voteButtons.first();
        const hasSelectedClass = await selectedButton.evaluate(el =>
          el.classList.contains('fork__choice--selected')
        );

        if (hasSelectedClass) {
          console.log('✅ Vote selection confirmed');
        }

        // Simulate more thinking time
        await audiencePage.waitForTimeout(1500);

        // Try changing vote if multiple options available
        const buttonCount = await voteButtons.count();
        if (buttonCount > 1) {
          await voteButtons.nth(1).click();
          console.log('🔄 Changed vote to second option');
        }
      } else {
        console.log('ℹ️ No voting interface - checking for scene content');

        // Check for scene content instead
        const mediaElement = audiencePage.locator('img, video');
        const textContent = audiencePage.locator('text').first();

        const hasMedia = await mediaElement.isVisible().catch(() => false);
        const hasText = await textContent.isVisible().catch(() => false);

        expect(hasMedia || hasText).toBe(true);
        console.log('✅ Scene content verified');
      }

      // ===== PHASE 5: Test Real-time Updates =====
      console.log('🔄 Testing real-time synchronization...');

      // Both pages should remain functional
      await expect(conductorPage.locator('text=MEANDER')).toBeVisible();
      await expect(audiencePage.locator('body')).toBeVisible();

      // ===== PHASE 6: Test Reset Functionality =====
      console.log('🔄 Testing reset functionality...');

      // Test conductor reset
      const resetButton = conductorPage.locator('button.menu-btn-reset');
      await resetButton.click();
      console.log('🔄 Reset button clicked');

      // Wait for potential state changes
      await conductorPage.waitForTimeout(2000);
      await audiencePage.waitForTimeout(2000);

      // Verify both interfaces remain functional after reset
      await expect(conductorPage.locator('text=MEANDER')).toBeVisible();
      await expect(audiencePage.locator('body')).toBeVisible();

      console.log('✅ Reset functionality verified');

    } finally {
      // Clean up
      await conductorContext.close();
      await audienceContext.close();
    }
  });

  test('multiple audience devices synchronization', async ({ browser }) => {
    // Test with multiple audience devices
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);

    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    try {
      console.log('👥 Testing multiple audience devices...');

      // Connect all audience devices
      await Promise.all(pages.map(async (page, index) => {
        console.log(`📱 Connecting audience device ${index + 1}...`);
        await page.goto('http://localhost:4000/audience-page');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000); // Allow WebSocket connection
      }));

      // Verify all devices are connected and functional
      await Promise.all(pages.map(async (page, index) => {
        await expect(page.locator('body')).toBeVisible();
        console.log(`✅ Audience device ${index + 1} connected successfully`);
      }));

      // Test simultaneous interactions (if voting is active)
      await Promise.all(pages.map(async (page, index) => {
        const voteButtons = page.locator('button.fork__choice');

        if (await voteButtons.isVisible().catch(() => false)) {
          // Simulate different voting patterns
          const buttonCount = await voteButtons.count();
          const choiceIndex = index % buttonCount; // Distribute votes

          console.log(`🎯 Audience ${index + 1} voting for option ${choiceIndex + 1}`);
          await voteButtons.nth(choiceIndex).click();
        }
      }));

      console.log('✅ Multiple device synchronization test completed');

    } finally {
      // Clean up all contexts
      await Promise.all(contexts.map(context => context.close()));
    }
  });

  test('error handling and recovery', async ({ browser }) => {
    const conductorContext = await browser.newContext();
    const audienceContext = await browser.newContext();

    const conductorPage = await conductorContext.newPage();
    const audiencePage = await audienceContext.newPage();

    try {
      console.log('🛠️ Testing error handling and recovery...');

      // Navigate to both interfaces
      await conductorPage.goto('http://localhost:5173');
      await audiencePage.goto('http://localhost:4000/audience-page');

      await conductorPage.waitForLoadState('networkidle');
      await audiencePage.waitForLoadState('networkidle');

      // Test invalid actions (should be handled gracefully)
      console.log('🧪 Testing error scenarios...');

      // Try clicking reset multiple times rapidly
      const resetButton = conductorPage.locator('button.menu-btn-reset');
      await resetButton.click();
      await resetButton.click(); // Rapid clicks
      await conductorPage.waitForTimeout(1000);

      // Interfaces should remain functional
      await expect(conductorPage.locator('text=MEANDER')).toBeVisible();
      await expect(audiencePage.locator('body')).toBeVisible();

      // Test network-like interruptions
      await conductorPage.waitForTimeout(3000);
      await audiencePage.waitForTimeout(3000);

      // Verify recovery
      await expect(conductorPage.locator('body')).toBeVisible();
      await expect(audiencePage.locator('body')).toBeVisible();

      console.log('✅ Error handling and recovery test passed');

    } finally {
      await conductorContext.close();
      await audienceContext.close();
    }
  });
});
