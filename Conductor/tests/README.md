# MEANDER E2E Test Suite

Comprehensive end-to-end tests for the MEANDER live performance platform.

## 🚀 Quick Start

### Prerequisites
- Node.js and npm/pnpm installed
- Ports 4000 and 5173 available (tests will start servers automatically)

### Install Dependencies
```bash
pnpm install
```

### Run All Tests
```bash
npm run test:run  # Recommended - starts servers automatically
# or
npm run test:e2e:all
```

### Run Specific Test Categories
```bash
# Conductor UI tests only
npx playwright test conductor*.spec.ts

# Audience tests only
npx playwright test audience*.spec.ts

# Mobile tests only
npx playwright test mobile*.spec.ts
```

## 🔄 Automatic Server Management

**✅ No Manual Server Startup Required!**

The test suite automatically:
- Starts the Conductor Server (port 4000)
- Starts the Conductor Client (port 5173)
- Waits for both servers to be ready
- Runs tests against the running servers
- Cleans up servers after tests complete

### Manual Server Control (Advanced)
If you prefer to start servers manually:
```bash
# Terminal 1: Start server
npm run conductor:server

# Terminal 2: Start client
npm run conductor:client

# Terminal 3: Run tests
npm run test:e2e:all
```

### Interactive Test Development
```bash
# Visual test runner
npm run test:e2e:ui

# Headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

## 📋 Test Categories

### 🎭 Core User Journeys
- **Complete Show Lifecycle**: Upload → perform → complete
- **Audience Participation**: Connect → vote → experience transitions
- **Multi-Device Sync**: Multiple devices voting simultaneously

### 🗳️ Voting System Tests
- **Fork Voting Mechanics**: Single/tie/clear winner scenarios
- **Timing & Synchronization**: Countdown and real-time updates
- **Vote Persistence**: Network interruptions and recovery

### 🎬 Scene Management
- **Transition Timing**: Smooth scene changes with media
- **Media Display**: Images, videos, and GIF support
- **State Synchronization**: Real-time updates across clients

### 🎛️ Conductor Controls
- **Show Upload**: File handling and validation
- **Live Control**: Advance, reset, and navigation
- **Canvas Interaction**: Zoom, pan, and node selection

### 🌐 Network & Devices
- **Network Resilience**: Various connection conditions
- **Device Compatibility**: Desktop, mobile, tablets
- **Concurrent Users**: Performance with multiple participants

## 🛠️ Test Structure

```
tests/
├── conductor-basic.spec.ts       # Basic UI functionality
├── conductor-show-management.spec.ts  # Show upload/management
├── audience-voting.spec.ts       # Voting interactions
├── full-journey.spec.ts          # Complete user journeys
├── mobile-audience.spec.ts       # Mobile-specific tests
├── utils/
│   └── test-helpers.ts          # Common test utilities
└── README.md                    # This file
```

## 🎯 Test Scenarios

### Realistic Human Interactions
All tests simulate real user behavior:
- **Decision delays**: 1-3 second pauses before actions
- **Multiple interactions**: Clicking, scrolling, navigation
- **Error recovery**: Network issues, invalid actions
- **Device differences**: Touch vs mouse interactions

### Example Test Flow
```typescript
// Simulate human-like voting
await TestHelpers.humanDelay(1500, 3000); // Think time
await voteButton.click();                  // Action
await page.waitForTimeout(500);           // Reaction time
```

## 📊 Test Configuration

### Browser Configuration
- **Desktop**: Chrome (primary)
- **Mobile**: iPhone 12 emulation
- **CI/CD**: Parallel execution support

### Timeouts & Retries
- **Navigation**: 30s timeout
- **Element waits**: 10s timeout
- **Retries**: 2 on CI, 0 locally
- **Parallel workers**: 1 on CI, auto locally

## 🔧 Development

### Adding New Tests
1. Create `.spec.ts` file in `tests/` directory
2. Use descriptive test names
3. Include realistic user delays
4. Add proper error handling
5. Use test helpers for common operations

### Test Helpers
```typescript
import { TestHelpers } from './utils/test-helpers';

// Wait for voting interface
await TestHelpers.waitForVotingInterface(page);

// Simulate realistic vote
await TestHelpers.performRealisticVote(page, 1);

// Human-like delay
await TestHelpers.humanDelay(1000, 2000);
```

## 📈 CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: npm run test:e2e
  env:
    CI: true
```

### Parallel Execution
Tests run in parallel by default, with:
- **Isolated contexts**: Each test gets fresh browser
- **Clean state**: No cross-test interference
- **Failure isolation**: One test failure doesn't affect others

## 🎭 Test Philosophy

### Realistic User Simulation
- **Natural timing**: Variable delays between actions
- **Decision making**: Pauses before selections
- **Error handling**: Graceful failure recovery
- **Device awareness**: Touch vs mouse interactions

### Comprehensive Coverage
- **Happy paths**: Expected user flows
- **Edge cases**: Unusual but possible scenarios
- **Error conditions**: Network issues, invalid data
- **Performance**: Load and timing verification

### Maintainable Tests
- **Page objects**: Reusable component abstractions
- **Test helpers**: Common operations centralized
- **Data fixtures**: Consistent test data
- **Clear assertions**: Meaningful failure messages

## 🐛 Debugging Tests

### Visual Debugging
```bash
npm run test:e2e:ui  # Interactive test runner
npm run test:e2e:headed  # See browser actions
```

### Step-by-Step Debugging
```bash
npm run test:e2e:debug  # Pause on failures
```

### Trace Analysis
- **Traces**: Automatically captured on failures
- **Screenshots**: Saved for failed tests
- **Videos**: Recorded for debugging

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Test Runner](https://playwright.dev/docs/test-runner)
- [Page Object Model](https://playwright.dev/docs/test-pom)
- [Visual Comparisons](https://playwright.dev/docs/test-screenshots)

---

**Happy Testing!** 🎭✨

These tests ensure MEANDER delivers a reliable, performant experience for live performances.
