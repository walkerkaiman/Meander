import './styles/global.css';
import './styles/components.css';

import { AudienceApp } from './AudienceApp';

/**
 * Application entry point
 */
async function main() {

  // Get app container
  const container = document.getElementById('app');
  if (!container) {
    console.error('App container not found');
    return;
  }

  // Create and start the application
  const app = new AudienceApp(container, {
    // Configuration can be overridden here
    // serverHost: 'localhost',
    // serverPort: 4000,
    // websocketPort: 4000,
  });

  try {
    await app.start();
  } catch (error) {
    console.error('Failed to start Audience App:', error);
  }

  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Page hidden - maintaining connection
    } else {
      // Page visible - ensuring connection
    }
  });

  // Handle window beforeunload
  window.addEventListener('beforeunload', () => {
    app.stop();
  });

  // Handle window focus/blur for potential reconnection
  let wasBlurred = false;
  window.addEventListener('blur', () => {
    wasBlurred = true;
  });
  
  window.addEventListener('focus', () => {
    if (wasBlurred) {
      wasBlurred = false;
      // App will handle reconnection automatically via WebSocket manager
    }
  });
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}

