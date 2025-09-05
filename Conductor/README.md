# MEANDER Conductor

## Overview

MEANDER Conductor is a part of the MEANDER platform designed to orchestrate interactive, audience-driven performances. It serves as the runtime environment for shows created in the MEANDER Editor, managing state transitions, audience interactions, and broadcasting OSC (Open Sound Control) messages to external systems.

Conductor consists of two main components:
- **Conductor Server**: A Node.js/Express application handling WebSocket connections, REST APIs for audience voting, OSC broadcasting, and show state management with persistence using LevelDB.
- **Conductor Client**: A React-based UI built with Vite and Mantine, providing operators with a visual interface to load shows, monitor progress, and manually advance states.

This project is organized as a monorepo using `pnpm` workspaces, including shared packages for types, validation logic, and UI components to ensure consistency with the MEANDER Editor.

## Features

- **Show Execution**: Loads and runs show packages (ZIP files) exported from MEANDER Editor.
- **State Management**: Manages active states (scenes or forks) with safeguards like debouncing and error handling.
- **Audience Interaction**: Supports voting via REST API with rate limiting and CSRF protection.
- **OSC Broadcasting**: Sends state changes and heartbeats over UDP to external systems.
- **UI Control**: Offers a node graph canvas (mirroring Editor's visuals), progress sidebar, and control bar for operators.
- **Accessibility**: Includes high-contrast mode, reduced motion preference support, and a color-blind safe palette.
- **Error Handling**: Provides toasts for recoverable issues and modals for blocking errors.

## Installation

### Prerequisites
- **Node.js**: Version 18 or higher.
- **pnpm**: Version 8.6.10 or higher (install via `npm install -g pnpm` or `corepack enable`).

### Setup
1. **Clone the Repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd Meander/Conductor
   ```
2. **Install Dependencies**:
   ```bash
   pnpm install
   ```
3. **Environment Configuration**:
   - Create a `.env` file in the `packages/conductor-server` directory with necessary configurations (e.g., `SERVER_PORT=4000`, `OSC_PORT=57121`).

## Usage

### Development
Run both server and client in development mode with a single command:
```bash
pnpm run conductor
```
This will start the Conductor server on `localhost:4000` and the client UI on `localhost:5173`, with automatic browser opening once the client is ready.

### Production
1. Build all packages:
   ```bash
   pnpm run build
   ```
2. Start the server in production mode:
   ```bash
   pnpm run start
   ```
3. Access the client UI via a separately hosted build or serve it statically.

### Loading a Show
- Use the "Load Show" option in the UI (via MenuBar or initial screen) to upload a ZIP file exported from MEANDER Editor.
- The system validates the package and loads it into the sequencer if valid.

### Advancing States
- Use the large "Advance" button in the Control Bar to move to the next state (disabled during vote countdowns for fork nodes).
- Manually jump to any node via the `/jump` endpoint (accessible through UI interactions in a full implementation).

## Project Structure

- **packages/conductor-server**: Backend server handling state, API, WebSocket, and OSC.
- **packages/conductor-client**: Frontend UI for operators.
- **packages/conductor-types**: Shared TypeScript interfaces.
- **packages/editor-validator**: Validation logic shared with Editor.
- **packages/graph-components**: Shared UI components for node graph consistency with Editor.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please submit issues or pull requests to the repository.

## Contact

For support or inquiries, contact the MEANDER team at <support-email>.
