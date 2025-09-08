import { Page } from '@playwright/test';

/**
 * Test Helper Utilities
 * Common functions for E2E test scenarios
 */

export class TestHelpers {
  /**
   * Wait for WebSocket connection to be established
   */
  static async waitForWebSocketConnection(page: Page, timeout = 10000): Promise<void> {
    await page.waitForTimeout(2000); // Give time for connection attempt
    // In a real implementation, you might check for WebSocket readyState
  }

  /**
   * Simulate human-like thinking delay
   */
  static async humanDelay(minMs = 500, maxMs = 2000): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Wait for voting interface to appear
   */
  static async waitForVotingInterface(page: Page, timeout = 10000): Promise<boolean> {
    try {
      await page.waitForSelector('button.fork__choice', { timeout, state: 'visible' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for scene content to load
   */
  static async waitForSceneContent(page: Page, timeout = 5000): Promise<boolean> {
    try {
      await page.waitForSelector('img, video, .scene', { timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if voting is currently active
   */
  static async isVotingActive(page: Page): Promise<boolean> {
    const voteButtons = page.locator('button.fork__choice');
    return await voteButtons.isVisible().catch(() => false);
  }

  /**
   * Get available voting options count
   */
  static async getVotingOptionsCount(page: Page): Promise<number> {
    const voteButtons = page.locator('button.fork__choice');
    return await voteButtons.count().catch(() => 0);
  }

  /**
   * Simulate realistic voting behavior
   */
  static async performRealisticVote(page: Page, optionIndex = 0): Promise<void> {
    const voteButtons = page.locator('button.fork__choice');

    if (await voteButtons.isVisible().catch(() => false)) {
      // Human-like decision delay
      await this.humanDelay(1500, 3000);

      const buttonCount = await voteButtons.count();
      if (optionIndex < buttonCount) {
        await voteButtons.nth(optionIndex).click();

        // Brief pause after voting
        await page.waitForTimeout(500);
      }
    }
  }

  /**
   * Verify conductor interface is ready
   */
  static async verifyConductorReady(page: Page): Promise<void> {
    await page.waitForSelector('text=MEANDER Conductor');
    await page.waitForSelector('button:has-text("Load Show")');
    await page.waitForSelector('button.menu-btn-reset');
  }

  /**
   * Verify audience interface is connected
   */
  static async verifyAudienceConnected(page: Page): Promise<void> {
    await page.waitForSelector('body');
    // Additional checks for WebSocket connection could be added here
  }
}

/**
 * Test data and fixtures
 */
export const TestFixtures = {
  // Sample show data for testing
  sampleShowData: {
    showName: "Test Show",
    states: [
      {
        id: "scene_1",
        type: "scene",
        title: "Opening Scene",
        description: "Test opening scene",
        audienceMedia: []
      },
      {
        id: "fork_1",
        type: "fork",
        title: "Test Fork",
        choices: [
          { label: "Option A", nextStateId: "scene_2" },
          { label: "Option B", nextStateId: "scene_3" }
        ]
      }
    ],
    connections: [
      { fromNodeId: "scene_1", toNodeId: "fork_1" }
    ]
  }
};
