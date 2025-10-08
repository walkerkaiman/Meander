<div align="center">

# MEANDER

## Choose-Your-Own-Adventure Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)

_Where every performance is unique, and every audience shapes the story._

[Quick Start](#quick-start) • [Documentation](#platform-overview) • [Editor](#editor) • [Conductor](#conductor) • [Audience](#audience)

</div>

---

MEANDER is a complete platform for creating and performing interactive theatrical experiences where audiences vote to determine the story's direction in real-time. The system consists of three main components working together to create immersive, participatory performances.

> **Perfect for**: Interactive theater, immersive experiences, educational storytelling, and participatory performances

## Platform Overview

MEANDER enables creators to build branching narratives where audience members use their mobile devices to vote on story choices, creating unique performances that unfold differently each time. The platform is designed for local network deployment, ensuring reliable performance without internet dependency.

### Core Components

<table align="center">
<tr>
<td align="center" width="33%">

**EDITOR**  
_Visual Story Creation_

- Node-based editor
- Media integration
- Package export
- Real-time validation

</td>
<td align="center" width="33%">

**CONDUCTOR**  
_Runtime Engine & Control_

- Show execution
- Vote management
- OSC broadcasting
- QR code generation

</td>
<td align="center" width="33%">

**AUDIENCE**  
_Mobile Voting Interface_

- QR code access
- Fullscreen media
- Real-time voting
- Mobile optimized

</td>
</tr>
</table>

```mermaid
graph LR
    A[Editor] -->|Export Show| B[Conductor]
    B -->|QR Codes| C[Audience]
    C -->|Votes| B
    B -->|OSC| D[External Systems]
```

---

## Editor

**Visual Story Creation & Show Design**

> **Purpose**: Create interactive theatrical experiences with visual node-based editing

The Editor is a powerful visual tool for creating interactive theatrical experiences. Design branching narratives, upload media, and export complete show packages ready for performance.

### Key Features

| Feature                  | Description                                          |
| ------------------------ | ---------------------------------------------------- |
| **Visual Node Editor**   | Drag-and-drop interface for intuitive story creation |
| **Multiple Node Types**  | Scenes, Forks, Opening, and Ending nodes             |
| **Media Integration**    | Upload images and videos for audience displays       |
| **Real-time Validation** | Ensures story structure integrity                    |
| **Package Export**       | Creates self-contained ZIP files with all assets     |

### Node Types

<div align="center">

| Node Type         | Description            | Connections               |
| ----------------- | ---------------------- | ------------------------- |
| **Opening Scene** | Story starting point   | No inputs, 1 output       |
| **Regular Scene** | Main story content     | 1 input, 1 output         |
| **Fork/Choice**   | Audience voting points | 1 input, multiple outputs |
| **Ending Scene**  | Story conclusion       | 1 input, no outputs       |

</div>

### Setup Guide

<details>
<summary><b>Prerequisites</b></summary>

- **Node.js**: Version 18 or higher
- **Package Manager**: npm or yarn
- **Browser**: Modern browser with ES2020 support

</details>

<details>
<summary><b>Installation & Development</b></summary>

```bash
# Navigate to Editor directory
cd Editor

# Install dependencies
npm install

# Start development server
npm run dev
# Opens at http://localhost:5173
```

</details>

<details>
<summary><b>Production Build</b></summary>

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

</details>

<details>
<summary><b>Usage Workflow</b></summary>

1. **Create New Show**: Opening scene added automatically
2. **Add Content**: Type descriptions - nodes resize automatically
3. **Create Branches**: Use Fork nodes, add choices, connect to scenes
4. **Add Media**: Upload images/videos for audience displays
5. **Validate**: Check story structure with built-in validator
6. **Export**: Download complete show package (ZIP file)

</details>

---

## Conductor

**Runtime Engine & Performance Control**

> **Purpose**: Manage live performances with real-time audience interaction and external system integration

The Conductor manages live performances, handling show execution, audience voting, and external system integration. It consists of a server (runtime engine) and client (operator interface).

### Key Features

<div align="center">

| Feature                | Description                                         | Technology           |
| ---------------------- | --------------------------------------------------- | -------------------- |
| **Show Execution**     | Loads and runs show packages from Editor            | Node.js + Express    |
| **Audience Voting**    | Real-time vote collection and processing            | WebSocket + REST API |
| **OSC Broadcasting**   | Integration with lighting, sound, and other systems | UDP + OSC protocol   |
| **Visual Control**     | Node graph interface matching Editor design         | React + React Flow   |
| **QR Code Generation** | Easy audience access via mobile devices             | QRCode library       |
| **State Management**   | Persistent show state with error recovery           | LevelDB              |

</div>

### Architecture

```mermaid
graph TB
    subgraph "Conductor System"
        A[Conductor Server<br/>Node.js + Express]
        B[Conductor Client<br/>React + React Flow]
        C[Audience Page<br/>Mobile Interface]
        D[Shared Packages<br/>Types + Validation]
    end

    A <--> B
    A <--> C
    A <--> D
    B <--> D
    C <--> D
```

### Setup Guide

<details>
<summary><b>Prerequisites</b></summary>

- **Node.js**: Version 18 or higher
- **pnpm**: Version 8.6.10+ (`npm install -g pnpm`)
- **Network**: Local network access for audience devices

</details>

<details>
<summary><b>Installation & Development</b></summary>

```bash
# Navigate to Conductor directory
cd Conductor

# Install dependencies
pnpm install

# Start both server and client
pnpm run conductor

# Or start individually
pnpm run conductor:server  # Server on :4000
pnpm run conductor:client  # Client on :5173
```

</details>

<details>
<summary><b>Production Build</b></summary>

```bash
# Build all packages
pnpm run build

# Start production server
pnpm run start
```

</details>

<details>
<summary><b>Usage Workflow</b></summary>

1. **Load Show**: Upload ZIP package exported from Editor
2. **Monitor Progress**: View show state in visual node graph
3. **Control Performance**: Use Advance button to progress story
4. **Manage Voting**: Monitor audience votes and countdown timers
5. **Access QR Codes**: Click "QR Codes" button for audience access
6. **OSC Integration**: Connect to lighting/sound systems via UDP

</details>

<details>
<summary><b>Network Configuration</b></summary>

| Service      | Port    | Protocol       | Purpose                     |
| ------------ | ------- | -------------- | --------------------------- |
| **Server**   | 4000    | HTTP/WebSocket | Audience voting & API       |
| **OSC**      | 57121   | UDP Multicast  | External system integration |
| **Network**  | 0.0.0.0 | All interfaces | Local network access        |
| **QR Codes** | Auto    | HTTP           | Mobile device access        |

</details>

<details>
<summary><b>OSC Integration Setup</b></summary>

### Overview

MEANDER Conductor broadcasts OSC (Open Sound Control) messages to integrate with external systems like lighting controllers, sound systems, video playback software, and show control systems.

### Quick Setup

**Configuration File:** `Conductor/packages/conductor-server/config.env`

```env
OSC_PORT=57121              # UDP port for OSC messages
OSC_HOST=239.0.0.1          # Multicast group address
OSC_MULTICAST=true          # Use multicast mode
```

### OSC Listener Configuration

Configure your OSC receiver (lighting desk, QLab, etc.) with:

| Setting              | Value           | Description                        |
| -------------------- | --------------- | ---------------------------------- |
| **Protocol**         | UDP             | User Datagram Protocol             |
| **Mode**             | Multicast       | IP Multicast (not broadcast)       |
| **Multicast Group**  | `239.0.0.1`     | Join this multicast group          |
| **Port**             | `57121`         | Listen on this port                |
| **Local IP**         | `0.0.0.0`       | Receive on all network interfaces  |

### OSC Message Format

#### State Change Messages

**Address:** `/meander/state`

**Arguments:**
1. Node type (string): `"scene"`, `"fork"`, `"opening"`, or `"ending"`
2. Node name (string): Title of the current node

**Example:**
```
/meander/state "opening" "Welcome Scene"
/meander/state "fork" "Choose Your Path"
/meander/state "scene" "Forest Adventure"
```

#### Fork Countdown Messages

**Address:** `/meander/countdown`

**Arguments:**
1. Fork name (string): Title of the fork node
2. Countdown (integer): Remaining seconds

**Example:**
```
/meander/countdown "Choose Your Path" 15
/meander/countdown "Choose Your Path" 14
/meander/countdown "Choose Your Path" 13
...
```

### Message Filtering

To filter for specific message types in your OSC software:

| Filter Pattern      | Receives                           |
| ------------------- | ---------------------------------- |
| `/meander/*`        | All MEANDER messages               |
| `/meander/state`    | State changes only                 |
| `/meander/countdown`| Fork countdowns only               |

### Testing OSC

**Test Endpoint:** `POST http://[server-ip]:4000/test-osc`

**PowerShell:**
```powershell
Invoke-WebRequest -Uri http://localhost:4000/test-osc -Method POST
```

**Expected test message:**
- Address: `/meander/test`
- Args: `["hello", 123]`

### Multiple Listeners

Multicast supports unlimited listeners - all devices that join multicast group `239.0.0.1` will receive messages simultaneously.

### Troubleshooting

**Messages not received?**

1. **Verify multicast group:** Listener must join `239.0.0.1`
2. **Check port:** Listener must be on port `57121`
3. **Firewall:** Allow inbound UDP on port `57121`
   ```powershell
   # Windows PowerShell (as Administrator)
   New-NetFirewallRule -DisplayName "MEANDER OSC" -Direction Inbound -LocalPort 57121 -Protocol UDP -Action Allow
   ```
4. **Network:** All devices on same local network
5. **View logs:** Check Conductor console for send confirmations

**Alternative: Unicast Mode**

If multicast doesn't work on your network, use unicast:

```env
OSC_MULTICAST=false
OSC_HOST=192.168.1.100  # Specific listener IP
```

Note: Unicast only reaches one device.

</details>

---

## Audience

**Mobile Voting Interface**

> **Purpose**: Enable audience participation through mobile devices with real-time voting and media display

The Audience component provides a mobile-optimized interface for audience members to participate in the interactive performance. Accessible via QR codes, it displays media and collects votes in real-time.

### Key Features

<div align="center">

| Feature               | Description                                        | Benefit                 |
| --------------------- | -------------------------------------------------- | ----------------------- |
| **QR Code Access**    | Easy mobile device connection                      | No typing URLs          |
| **Fullscreen Media**  | Images and videos with smooth transitions          | Immersive experience    |
| **Real-time Voting**  | Interactive choice selection with countdown timers | Engaging participation  |
| **Mobile Optimized**  | Responsive design for all screen sizes             | Universal compatibility |
| **Auto-reconnection** | Robust WebSocket connection handling               | Reliable performance    |
| **Accessibility**     | Screen reader support and keyboard navigation      | Inclusive design        |

</div>

### Setup Guide

<details>
<summary><b>Prerequisites</b></summary>

- Running Conductor Server
- Mobile devices on same local network
- Network connectivity between devices

</details>

<details>
<summary><b>Access Methods</b></summary>

| Method         | URL                                     | Use Case             |
| -------------- | --------------------------------------- | -------------------- |
| **QR Code**    | Scan from Conductor UI                  | Easiest for audience |
| **Direct URL** | `http://[server-ip]:4000/audience-page` | Manual entry         |
| **QR Page**    | `http://[server-ip]:4000/QR`            | Display all QR codes |

</details>

<details>
<summary><b>Development</b></summary>

```bash
cd Conductor
pnpm run conductor:audience
# Audience page on :3001 (dev mode)
```

</details>

<details>
<summary><b>Usage Workflow</b></summary>

1. **Connect**: Scan QR code or visit URL
2. **View Media**: Fullscreen images/videos during scenes
3. **Vote**: Select choices during fork moments
4. **Countdown**: Automatic vote submission when timer expires
5. **Reconnect**: Automatic reconnection if connection lost

</details>

---

## Performer (Coming Soon)

**Specialized Performer Interface**

The Performer component will provide a specialized interface for performers with access to vote results, performance cues, and backstage information.

### Planned Features

- **Vote Results**: Real-time access to audience voting data
- **Performance Cues**: Visual/audio cues based on story progression
- **Backstage Info**: Performer-specific information and notes
- **Timing Information**: Scene duration and transition cues

### Setup Guide

_Coming soon - placeholder route available at `/performer-page`_

---

## Quick Start

### Complete Setup (All Components)

1. **Clone Repository**

   ```bash
   git clone https://github.com/walkerkaiman/Meander.git
   cd Meander
   ```

2. **Setup Editor**

   ```bash
   cd Editor && npm install && cd ..
   pnpm run Editor
   # Create your show at http://localhost:5173
   ```

3. **Setup Conductor**

   ```bash
   cd Conductor && pnpm install && cd ..
   pnpm run Conductor
   # Server: http://localhost:4000
   # Client: http://localhost:5173
   ```

4. **Load Show**

   - Export show from Editor
   - Upload ZIP file in Conductor Client
   - Click "QR Codes" for audience access

5. **Audience Access**
   - Scan QR code with mobile device
   - Ensure device is on same network
   - Start voting and enjoying the show!

---

## Running the Applications

> **Important**: Run these commands from the root `Meander` directory (not from inside `Editor` or `Conductor`).

Choose the application based on your task:

### Creating Shows (Editor)

```bash
# From D:\Meander directory
pnpm run Editor
```
Opens at http://localhost:5173 - Use this to design and export show packages.

### Running Shows (Conductor)

```bash
# From D:\Meander directory
pnpm run Conductor
```
Starts the performance system:
- **Server**: http://localhost:4000 (audience voting)
- **Client**: http://localhost:5173 (operator controls)

### First Time Setup

Install dependencies before first use:
```bash
cd Editor && npm install && cd ..
cd Conductor && pnpm install && cd ..
```

---

## Network Architecture

MEANDER is designed for **local network deployment** during performances:

```
┌──────────────────────────────────────────────────────────────────┐
│                        Local Network                             │
│                                                                  │
│  ┌─────────────┐    ┌──────────┐    ┌──────────┐                │
│  │   Laptop    │    │  Router  │    │  Mobile  │                │
│  │ (Conductor) │◀──▶│  (WiFi)  │◀──▶│ Devices  │                │
│  │             │    │          │    │(Audience)│                │
│  │ :4000 HTTP  │    │          │    │          │                │
│  │ :4000 WS    │    │          │    │          │                │
│  └─────────────┘    └──────────┘    └──────────┘                │
│         │                                                        │
│         │ OSC Multicast (239.0.0.1:57121)                       │
│         │                                                        │
│         ├──▶ Lighting Desk                                      │
│         ├──▶ Sound System                                       │
│         └──▶ Video Playback (QLab, etc.)                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Network Requirements

- **TCP Port 4000**: HTTP/WebSocket (audience voting)
- **UDP Port 57121**: OSC Multicast (lighting, sound, video systems)
  - Multicast Group: `239.0.0.1`
  - All listeners join this group to receive show control messages
- **Local Network**: All devices on same subnet
- **No Internet**: Performance works offline

### OSC Integration

MEANDER sends real-time OSC messages for external system control:

**OSC Messages Sent:**
- **State Changes**: `/meander/state` - Triggered when scenes/forks change
- **Countdowns**: `/meander/countdown` - Updates every second during voting

**Setup Your OSC Receiver:**
1. Join multicast group `239.0.0.1`
2. Listen on UDP port `57121`
3. Filter by `/meander/*` for all messages

**Quick Reference - OSC Messages:**

| Address              | Arguments              | When Sent                    |
| -------------------- | ---------------------- | ---------------------------- |
| `/meander/state`     | nodeType, nodeName     | Scene/Fork changes           |
| `/meander/countdown` | forkName, seconds      | Every second during voting   |
| `/meander/test`      | "hello", 123           | Test endpoint only           |

See the **Conductor → OSC Integration Setup** section above for complete configuration details.

### Wi-Fi QR Code Feature

- **QR Code Page**: Visit `http://[server-ip]:4000/QR` to access QR codes
- **Wi-Fi Network**: Automatically generates QR code for configured network
- **Configuration**: Set `WIFI_NETWORK_NAME` and `WIFI_PASSWORD` in `config.env`
- **Format**: Uses standard Wi-Fi QR format for easy device connection

---

## Testing

### End-to-End Tests

```bash
cd Conductor
pnpm run test:e2e
```

### Test Coverage

- **Conductor UI**: Basic functionality and show management
- **Audience Voting**: Mobile interface and voting interactions
- **Full Journey**: Complete show execution workflow
- **Mobile Responsive**: Cross-device compatibility

---

## Project Structure

```
Meander/
├── Editor/                 # Visual story creation tool
│   ├── src/               # React components and logic
│   ├── packages/          # Shared utilities
│   └── dist/              # Built application
├── Conductor/             # Runtime engine and control
│   ├── packages/
│   │   ├── conductor-server/    # Node.js backend
│   │   ├── conductor-client/    # React operator UI
│   │   ├── audience-page/       # Mobile voting interface
│   │   ├── conductor-types/     # Shared TypeScript types
│   │   └── shared-export-loader/ # Package utilities
│   ├── tests/             # End-to-end tests
│   └── dist/              # Built applications
└── packages/              # Legacy shared packages
```

---

## Development

### Technology Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Express, WebSocket
- **Database**: LevelDB (embedded)
- **Testing**: Playwright
- **Package Management**: pnpm workspaces
- **Build Tools**: TypeScript, Vite, tsup

### Code Style

- **TypeScript**: Complete type safety throughout
- **ESLint**: Consistent code formatting
- **Prettier**: Code style enforcement
- **Husky**: Pre-commit hooks
