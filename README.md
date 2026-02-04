# Meander

**Meander** is a distributed media installation control system designed for interactive, multi-device installations such as museums, exhibitions, retail environments, and public spaces. It orchestrates synchronized media playback across multiple devices while responding to sensor inputs and user interactions in real-time.

## Overview

Meander consists of two main components that work together:

- **State Server**: Central orchestration server that manages global state, evaluates rules, and coordinates all devices
- **Deployable**: Client application that runs on each media playback device (computers, Raspberry Pis, etc.)

### How It Works

1. **Deployables** (media playback devices) register with the **State Server** and report their hardware capabilities (displays, audio outputs, sensors, etc.)
2. The server assigns **show logic** to each deployable, defining what media to play and when
3. Deployables send **signals** (from sensors, buttons, etc.) to the server
4. The server's **rules engine** evaluates incoming signals and triggers **state changes**
5. When state changes, all affected deployables automatically execute their programmed actions (play videos, audio, change displays, etc.)
6. States are **global** - when one device triggers a state change, all devices with that state in their show logic react simultaneously

## Real-World Use Cases

### Museum Exhibitions
- **Multi-screen video walls**: Synchronized video playback across multiple displays
- **Interactive exhibits**: Button presses or motion sensors trigger state changes that update content across the entire installation
- **Audio zones**: Different audio tracks play on different speakers based on visitor location

### Retail Environments
- **Product displays**: Multiple screens show synchronized product videos
- **Customer interactions**: Touch sensors trigger state changes that update displays throughout the store
- **Ambient audio**: Background music changes based on time of day or customer activity

### Public Installations
- **Digital signage networks**: Centralized control of content across multiple locations
- **Interactive art**: User interactions trigger coordinated responses across multiple devices
- **Event spaces**: Coordinated lighting, audio, and video responses to triggers

## Project Structure

```
Meander/
├── State Server/          # Central orchestration server
│   ├── cmd/              # Server executable entry point
│   ├── internal/         # Server implementation
│   │   ├── server/       # HTTP/WebSocket handlers and API
│   │   ├── state/        # Rules engine and state management
│   │   ├── storage/      # Database persistence (SQLite/JSON)
│   │   └── models/      # Data structures
│   ├── data/            # Runtime data (rules, contexts, state)
│   ├── show-logic/      # Show logic JSON files
│   └── Assets/          # Media assets served to deployables
│
├── Deployable/          # Client application for media devices
│   ├── cmd/             # Deployable executable entry point
│   ├── internal/        # Deployable implementation
│   │   ├── runtime/     # Main runtime and lifecycle
│   │   ├── engine/      # Show logic execution engine
│   │   ├── playback/    # Media playback (VLC backend)
│   │   ├── actions/     # Action executors (play, stop, etc.)
│   │   ├── sensors/     # Sensor event handling
│   │   ├── capabilities/# Hardware discovery
│   │   └── web/         # Local web interface
│   ├── data/           # Local device data and assignments
│   └── Assets/          # Local media cache
│
├── Convienence/         # Build and run scripts
│   ├── build-all.ps1    # Cross-compile for Windows/Raspberry Pi
│   ├── build-all.sh     # Cross-compile (Linux/macOS)
│   └── run-local.*      # Local development scripts
│
└── build/               # Compiled executables (gitignored)
```

## Quick Start

### Prerequisites

- **Go 1.22+** (for building from source)
- **VLC Media Player** (for media playback on deployables)
- **Windows, Linux, or Raspberry Pi** (target platforms)

### 1. Start the State Server

```bash
cd "State Server"
go run ./cmd/state-server
```

The server runs on `http://localhost:8081` by default.

**Web Interfaces:**
- Control Panel: `http://localhost:8081/ui`
- State Monitor: `http://localhost:8081/ui/state`
- Show Logic Designer: `http://localhost:8081/ui/show-designer`
- Rules Editor: `http://localhost:8081/ui/rules`
- Show Logic Distributor: `http://localhost:8081/ui/register`

### 2. Start a Deployable

```bash
cd Deployable
go run ./cmd/deployable --server ws://localhost:8081/ws/deployable
```

The deployable runs on `http://localhost:8090` by default.

**Web Interfaces:**
- Status: `http://localhost:8090/`
- Mock Interactions: `http://localhost:8090/api/mock_event` (for testing)

### 3. Register and Assign Show Logic

1. Open `http://localhost:8080/ui/register` (Show Logic Distributor)
2. Find your deployable by its device ID or pairing code
3. Assign a show logic file (or create one in the Show Logic Designer)
4. The deployable will automatically download required media assets

### 4. Create Show Logic

1. Open `http://localhost:8080/ui/show-designer` (Show Logic Designer)
2. Create or edit a show logic file
3. Define states, actions (play video/audio), timers, and sensor handlers
4. Save the file (filename must match `logic_id`)

### 5. Create Rules

1. Open `http://localhost:8080/ui/rules` (Rules Editor)
2. Create rules that trigger state changes based on signals from deployables
3. Rules can target specific deployables or groups by tags

## Building for Production

### Cross-Compilation

Use the convenience scripts to build executables for different platforms:

**Windows (PowerShell):**
```powershell
.\Convienence\build-all.ps1
```

**Linux/macOS:**
```bash
./Convienence/build-all.sh
```

**Windows (CMD):**
```cmd
Convienence\build-all.cmd
```

This creates executables in the `build/` directory for:
- Windows (amd64)
- Raspberry Pi ARMv7 (32-bit)
- Raspberry Pi ARM64 (64-bit)

### Deployment

1. **State Server**: Copy `state-server-windows-amd64.exe` (or appropriate platform) to your server machine
2. **Deployables**: Copy `deployable-windows-amd64.exe` (or appropriate platform) to each media playback device
3. Configure network settings so deployables can reach the server
4. Place media assets in `State Server/Assets/`
5. Create show logic files in `State Server/show-logic/`

## Key Concepts

### States
States are **global** - when the server changes state, all deployables that have that state in their show logic will execute their "On Enter" actions simultaneously. This enables synchronized multi-device installations.

### Show Logic
Each deployable has a show logic file that defines:
- **States**: Named states (e.g., "intro", "interactive", "idle")
- **On Enter Actions**: Actions to execute when entering a state (play video, audio, etc.)
- **On Exit Actions**: Actions to execute when leaving a state
- **Timers**: Local timers that trigger handlers after a delay
- **Sensor Handlers**: Local handlers that react to hardware sensor events and execute actions

### Rules
Rules define when to change global state based on signals from deployables:
- **Conditions**: Evaluate signals (button presses, sensor values, etc.)
- **Targets**: Can target specific deployables or groups by tags
- **Actions**: Change global state when conditions are met

### Signals
Signals are events sent from deployables to the server:
- Automatically converted from sensor events (buttons, motion sensors, etc.)
- Can also be sent manually via the mock interaction UI
- Used by the rules engine to trigger state changes

## Architecture Highlights

- **Decentralized Execution**: Each deployable runs its show logic locally, reducing latency and server load
- **Centralized Orchestration**: State Server coordinates all devices through global state
- **Hardware Abstraction**: Deployables automatically discover hardware capabilities
- **Asset Management**: Automatic download and synchronization of media assets
- **Cross-Platform**: Runs on Windows, Linux, and Raspberry Pi
- **Web-Based Configuration**: No code changes needed to configure installations

## Development

See individual README files for detailed development information:
- `State Server/README.md` - Server architecture and API
- `Deployable/README.md` - Deployable architecture and configuration

## License

[Add your license here]
