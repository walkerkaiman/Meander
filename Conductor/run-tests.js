#!/usr/bin/env node

/**
 * MEANDER E2E Test Runner
 * Simple script to run end-to-end tests
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🎭 MEANDER E2E Test Runner');
console.log('==========================\n');

// Check if we're in the right directory
const packageJsonPath = path.join(__dirname, 'package.json');
const hasPackageJson = require('fs').existsSync(packageJsonPath);

if (!hasPackageJson) {
  console.error('❌ Error: package.json not found. Please run from the Conductor directory.');
  process.exit(1);
}

try {
  // Install Playwright browsers if needed
  console.log('📦 Installing Playwright browsers...');
  execSync('npx playwright install', { stdio: 'inherit' });

  // Run the tests
  console.log('\n🧪 Running E2E tests...');
  console.log('✅ Playwright will automatically start both servers:');
  console.log('   - Conductor Server (port 4000)');
  console.log('   - Conductor Client (port 5173)');
  console.log('⏳ This may take up to 2 minutes...\n');

  execSync('npm run test:e2e:all', {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
  });

} catch (error) {
  console.error('\n❌ Test run failed:', error.message);
  console.log('\n💡 Troubleshooting:');
  console.log('1. Make sure ports 4000 and 5173 are free (no other servers running)');
  console.log('2. If install fails: npm run test:install');
  console.log('3. Manual server startup:');
  console.log('   - Terminal 1: npm run conductor:server');
  console.log('   - Terminal 2: npm run conductor:client');
  console.log('   - Terminal 3: npm run test:e2e:all');
  console.log('4. For debugging: npm run test:e2e:headed');

  process.exit(1);
}

console.log('\n✅ All tests completed successfully!');
console.log('📊 Check the test-results/ directory for detailed reports.');
