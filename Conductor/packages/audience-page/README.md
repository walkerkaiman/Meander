# MEANDER Audience Page

A TypeScript-based web application that enables audience members to vote and influence interactive choose-your-own-adventure performances in real-time.

## 🎭 Overview

The Audience Page provides a mobile-optimized voting interface where audience members can:
- View fullscreen media (images/videos) during scenes
- Vote on story choices during interactive forks
- Experience haptic feedback and responsive design
- Automatically submit votes when countdown timers expire

## ✨ Features

### 🎬 Scene Display
- **Fullscreen Media**: Displays images and videos with autoplay and loop
- **Crossfade Transitions**: Smooth 0.5s transitions between media
- **Fallback Handling**: Black background when no media is available
- **Multi-format Support**: Images and videos with proper scaling

### 🗳️ Interactive Voting
- **Dynamic Choices**: Choice buttons adapt to screen orientation and number of options
- **Fork-specific Countdown**: Timer duration determined by `countdownSeconds` property in fork node
- **Real-time Countdown**: Timer shows remaining voting time in SS format (05, 04, etc.)
- **Multi-selection**: Users can change their vote multiple times until timer expires
- **Auto-submission**: Votes automatically sent when timer reaches zero
- **No-vote Handling**: Submits default choice if user hasn't selected anything

### 📱 Mobile-First Design
- **Responsive Layout**: Portrait (vertical) and landscape (horizontal) layouts
- **Touch Optimized**: 44px minimum touch targets (WCAG AA compliant)
- **Haptic Feedback**: Device vibration on selection and fork entry
- **Accessibility**: Screen reader support, keyboard navigation, high contrast

### 🔌 Real-time Communication
- **WebSocket Connection**: Live updates from conductor server
- **Auto-reconnection**: Exponential backoff with connection status management
- **HTTP API**: RESTful vote submission with error handling
- **State Synchronization**: Seamless mid-session joining support
- **Fork-specific Timing**: Countdown duration determined by individual fork nodes in show.json

## 🏗️ Architecture

### Core Classes (TypeScript)
```
├── AudienceApp          # Main application orchestrator
├── StateManager         # Centralized state management with events
├── WebSocketManager     # Connection management with auto-reconnection
├── ApiManager           # HTTP API communication
├── VoteManager          # Vote submission logic with error recovery
├── DeviceManager        # Device capabilities (vibration, ID generation)
└── EventEmitter         # Custom event system for loose coupling
```

### UI Components
```
├── Scene                # Fullscreen media display with transitions
├── Fork                 # Voting interface with countdown timer
├── Loading              # Loading states and connection status
└── ErrorDisplay         # Error handling and user feedback
```

## 📋 Design Document Compliance

✅ **Complete implementation** of the Audience Website Design Document specifications:

- **States & Visuals**: Scene and Fork states with proper media handling
- **Interaction**: Choice selection with visual and haptic feedback
- **Timing Rules**: Fork-specific countdown duration from show.json
- **Responsiveness**: Portrait/landscape layouts with WCAG AA compliance
- **Networking**: WebSocket + HTTP integration (audience-specific message filtering)
- **Accessibility**: High contrast, proper font sizes, keyboard navigation

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- A running MEANDER Conductor Server

### Development
```bash
# Navigate to audience page
cd packages/audience-page

# Install dependencies
npm install

# Start development server
npm run dev
# Opens at http://localhost:3001
```

### Production Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Built files available in dist/
```

### Integration
The audience page connects to your Conductor Server:

**Default Configuration:**
- Server Host: `window.location.hostname` (same as page host)
- Server Port: `4000` (HTTP API)
- WebSocket Port: `4000` (WebSocket connection)

**Custom Configuration:**
```typescript
const app = new AudienceApp(container, {
  serverHost: 'your-server.com',
  serverPort: 8080,
  websocketPort: 8080,
});
```

## 🎯 **Expected Behavior**

### Message Filtering
The Audience page is designed to receive **only specific messages** from the Conductor Server:

**✅ Audience Receives:**
- `stateChanged` - When show advances to new scene/fork
- `voteTick` - Countdown updates during voting periods

**❌ Audience Does NOT Receive:**
- `timerTick` - Reserved for Conductor Client (operator interface)
- `voteResult` - Reserved for future Performer page (special performance information)

### Fork-specific Timing
- **No Fixed Duration**: Unlike the server's default 15-second countdown, each fork node can specify its own `countdownSeconds` in the show.json
- **Flexible Voting**: Allows for different voting scenarios (quick 5-second decisions vs. thoughtful 30-second choices)
- **Show-driven**: Timing is determined by the show content, not hardcoded values

### Future Architecture
- **Conductor Client**: Operator interface with full control and timing information
- **Audience Page**: Participant interface with voting and media display
- **Performer Page**: (Future) Special interface for performers with vote results and performance cues

## 🔗 Server Integration

### Required Endpoints
```
GET  /audience/show     # Get current active state
GET  /audience/graph    # Get show structure
POST /audience/vote     # Submit vote
```

### WebSocket Messages
```typescript
// Server → Audience (only these messages)
{ type: "stateChanged", payload: ActiveState }
{ type: "voteTick", payload: { forkId: string, remainingSeconds: number } }

// Note: Audience does NOT receive:
// - timerTick (reserved for Conductor Client)
// - voteResult (reserved for future Performer page)
```

### Vote Payload Format
```typescript
{
  showId: string,      // Show identifier (typically 'local')
  forkId: string,      // Current fork node ID
  choiceIndex: 0 | 1,  // Selected choice (0 or 1)
  deviceId: string     // Unique device identifier
}
```

## 🎨 Styling & Theming

### Design System
- **Colors**: Black background (`#000`), white text (`#fff`), blue accent (`#0066cc`)
- **Typography**: Inter font family, minimum 16px base size
- **Spacing**: CSS custom properties for consistent spacing
- **Animations**: ≤150ms transitions with reduced motion support

### Responsive Breakpoints
- **Portrait Mode**: Vertical button stacking, larger fonts
- **Landscape Mode**: Horizontal button layout, optimized timer size
- **Small Screens**: Adjusted padding and font sizes for 320px+ width

## 🧪 Testing

### Manual Testing
1. **Connection**: Verify WebSocket connection and reconnection
2. **Scene Display**: Test image/video loading and transitions  
3. **Fork Voting**: Test choice selection and countdown behavior
4. **Responsive**: Test portrait/landscape orientation changes
5. **Accessibility**: Test keyboard navigation and screen readers

### Browser Support
- Modern browsers with ES2020 support
- Mobile browsers (iOS Safari, Chrome Mobile)
- Desktop browsers (Chrome, Firefox, Safari, Edge)

## 📦 Deployment

### Static Hosting
The built `dist/` folder can be deployed to any static hosting service:
- Serve `dist/index.html` as the main page
- Ensure proper MIME types for CSS/JS files
- Configure CORS if serving from different domain than Conductor Server

### Docker Example
```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
```

## 🔧 Configuration Options

### Environment Variables (Future Enhancement)
```bash
VITE_SERVER_HOST=localhost
VITE_SERVER_PORT=4000
VITE_WS_PORT=4000
```

### Runtime Configuration
```typescript
const config = {
  serverHost: 'conductor-server.local',
  serverPort: 4000,
  websocketPort: 4000,
  // Add custom configuration here
};
```

## 🤝 Contributing

This audience page is part of the MEANDER interactive performance system:

1. **Code Style**: TypeScript classes with complete type safety
2. **Architecture**: Event-driven with clear separation of concerns  
3. **Testing**: Manual testing for UI components and real-time features
4. **Documentation**: Update README for any new features or configuration

## 📄 License

Part of the MEANDER project - Interactive Choose-Your-Own-Adventure Performance System.

---

**Ready for Production** ✅ 
- Built and tested TypeScript implementation
- Mobile-optimized responsive design  
- Full design document compliance
- Real-time WebSocket communication
- Accessibility and performance optimized
