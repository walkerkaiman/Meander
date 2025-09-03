# MEANDER Editor

A powerful, type-safe authoring tool for creating interactive theatrical choose-your-own-adventure experiences.

## Overview

MEANDER Editor empowers writers, directors, and designers to craft immersive branching narratives where live audiences vote to shape the story in real-time. Built with modern web technologies and enterprise-grade type safety, the Editor provides an intuitive visual interface for story creation and configuration, producing portable show packages that integrate seamlessly with the MEANDER Conductor runtime.

## 🌟 Key Features

### 🎨 Visual Story Building
- **Drag-and-Drop Connections**: Visual connection system with clickable connection points
- **Node-Based Editor**: Intuitive canvas for creating and connecting story nodes
- **Real-Time Visual Feedback**: Live connection previews and hover effects
- **Zoom & Pan**: Smooth canvas navigation with mouse wheel and drag controls
- **Mini-Map**: Overview navigation for complex story structures

### 🏗️ Node Management
- **Scene Nodes**: Story moments with performer cues, audience media, and outputs
- **Fork Nodes**: Binary choices with audience voting and countdown timers
- **Visual Connection Points**: Each node has 1 input and 2 output connection points
- **Connection Deletion**: Click connections to delete them with visual feedback

### 🎛️ Advanced Properties System
- **Tabbed Interface**: Organized editing of general, media, and output properties
- **Rich Text Support**: Markdown-style descriptions and performer cues
- **Media Integration**: Drag-and-drop media file management
- **Output Configuration**: OSC, DMX, and MQTT message setup
- **Position Controls**: Precise node positioning on canvas

### 🔍 Validation & Quality Assurance
- **Real-Time Validation**: Automatic checks during save and export operations
- **Comprehensive Rules**: Missing fields, invalid connections, orphaned states
- **Clear Error Messages**: Specific feedback about validation issues
- **Flexible Workflow**: Save anytime, validate only when exporting

### 💾 Persistence & Export
- **Local Storage**: Automatic project saving with change detection
- **Export Validation**: Ensures complete shows before packaging
- **JSON Export**: Clean, portable show packages
- **Version Tracking**: Automatic timestamping and versioning

### 🎨 Modern UI/UX
- **Dark Theme**: Professional dark mode optimized for theater environments
- **Responsive Design**: Clean, modern interface with smooth animations
- **Accessibility**: Keyboard navigation and screen reader support
- **TypeScript**: 100% type-safe codebase with IntelliSense support

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 16 or higher (recommended: 18+)
- **npm**: Version 8 or higher (comes with Node.js)
- **Modern Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Git**: For version control (optional but recommended)

### 🛠️ Installation

1. **Clone or navigate to the project**:
   ```bash
   cd path/to/meander-project/Editor
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```
   This will install all required packages including React, TypeScript, Vite, and UI libraries.

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

### 🏗️ Building for Production

```bash
# Create optimized production build
npm run build

# Preview the production build locally
npm run preview
```

The built files will be in the `dist` directory, ready for deployment.

### 🧪 Development Scripts

```bash
# Development server with hot reload
npm run dev

# Type checking only
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code (if ESLint is configured)
npm run lint
```

### 🔧 Environment Setup

The editor works out-of-the-box with no additional configuration required. It uses:
- **Vite** for fast development and building
- **Local Storage** for project persistence
- **Browser APIs** for file export functionality

## 🎮 Usage Guide

### 🆕 Creating a New Show

1. **Launch the Editor** at `http://localhost:3000`
2. **Click "Create New Show"** on the welcome screen
3. **Enter show details**:
   - **Show Name**: Your project's title
   - **Author**: Your name or team name
4. **Click "Create Show"** to enter the editor

### 🏗️ Building Your Story

#### Adding Story Nodes

1. **Use Toolbar Buttons**:
   - **🎭 Scene Button**: Creates story moments
   - **🔀 Choice Button**: Creates decision points

2. **Node Types**:
   - **Scenes**: Story moments with performer cues and audience media
   - **Forks**: Binary choices where audiences vote

#### Connecting Nodes with Drag-and-Drop

Each node has **connection points**:
- **🟢 Green Circle (Left)**: Input - receives connections from other nodes
- **🔵 Blue Circles (Right)**: Outputs - sends connections to other nodes

**To connect nodes**:
1. **Click** a blue output circle on any node
2. **Drag** towards another node's green input circle
3. **Release** to create the connection
4. **Click connections** to delete them (red highlight appears)

#### Editing Node Properties

1. **Select a node** by clicking it on the canvas
2. **Use the right Properties Panel** with three tabs:

   **🎯 General Tab**:
   - **Title**: Node name
   - **Description**: Story content (required for scenes)
   - **Performer Text**: Hidden cues for actors/musicians
   - **Position**: X/Y coordinates for precise placement

   **🎬 Media Tab**:
   - **Audience Media**: Images/videos shown to the audience
   - **File Management**: Upload and organize media assets

   **⚡ Outputs Tab**:
   - **OSC Messages**: Open Sound Control for lighting/audio
   - **DMX Signals**: Lighting control protocols
   - **MQTT Messages**: IoT and system integration

#### Canvas Navigation

- **🖱️ Mouse Wheel**: Zoom in/out
- **🖱️ Middle Mouse + Drag**: Pan around the canvas
- **🎯 Mini-Map**: Bottom-right overview for navigation
- **🔍 Zoom Controls**: Top-right buttons for precise zoom

### ✅ Saving and Exporting

#### Flexible Saving
- **Save Anytime**: Click the "Save" button to persist your work
- **No Validation Required**: Save work-in-progress without completing everything
- **Auto-Persistence**: Projects automatically save to browser local storage
- **Change Detection**: Visual indicators show unsaved changes

#### Exporting Complete Shows
- **Export Button**: Creates production-ready show packages
- **Validation Required**: Ensures all required fields are complete
- **File Download**: Automatically downloads JSON package to your computer
- **Production Ready**: Validated shows ready for MEANDER Conductor

### 🔍 Understanding Validation

The editor validates your show automatically when exporting. Common requirements:

**Required for All Nodes**:
- ✅ Node title
- ✅ At least one output connection

**Required for Scenes**:
- ✅ Description (story content)
- ✅ Valid output connections

**Required for Forks**:
- ✅ Audience text (voting prompt)
- ✅ Two choice labels
- ✅ Valid connections for both choices

**Optional Fields**:
- 🔄 Performer text (can be empty)
- 🔄 Media files (can be added later)
- 🔄 Output configurations (advanced feature)

### 🎨 UI Features

#### Dark Mode Theme
- **Theater-Optimized**: Professional dark interface
- **High Contrast**: Clear visibility in low-light environments
- **Accessibility**: Reduced eye strain during long editing sessions

#### Visual Feedback
- **Connection Highlights**: Hover over connections to see deletion options
- **Node Selection**: Clear visual feedback for selected nodes
- **Drag Previews**: Live preview of connections being created
- **Validation States**: Color-coded feedback for validation issues

## 📁 Project Architecture

### Directory Structure

```
Editor/
├── 📁 src/
│   ├── 📁 components/          # React Components (100% TypeScript)
│   │   ├── 🎨 Canvas.tsx       # Visual node editor with drag-and-drop
│   │   ├── 🏠 EditorLayout.tsx # Main application layout
│   │   ├── ⚙️ PropertiesPanel.tsx # Node properties editor (3 tabs)
│   │   ├── 🌳 StateTree.tsx    # Left sidebar node navigation
│   │   ├── 🔧 Toolbar.tsx      # Top toolbar with project controls
│   │   └── 🏁 WelcomeScreen.tsx # Initial project creation screen
│   ├── 📁 types/               # TypeScript type definitions
│   │   └── 🏷️ index.ts         # Complete type system
│   ├── 📁 utils/               # Utility functions
│   │   └── 💾 fileOperations.ts # Persistence, validation, export
│   ├── 🖥️ App.tsx              # Main application component
│   ├── 🎨 App.css              # Complete styling system
│   └── 🚀 main.tsx             # Application entry point
├── 📦 package.json            # Dependencies and npm scripts
├── ⚙️ tsconfig.json            # TypeScript configuration
├── ⚡ vite.config.ts           # Vite build configuration
├── 🌐 index.html              # HTML template
└── 📖 README.md               # This comprehensive guide
```

### Technology Stack

- **⚛️ React 18**: Modern React with hooks and concurrent features
- **🔷 TypeScript**: 100% type-safe codebase with strict mode
- **⚡ Vite**: Lightning-fast development and optimized production builds
- **🎨 Lucide React**: Modern icon library for consistent UI
- **💾 Local Storage**: Client-side persistence for project data
- **🎯 Modern CSS**: Responsive design with dark theme optimization

## 📊 Data Model & Types

### Core Type System

```typescript
// Main data structures
interface ProjectData {
  show: Show;
  states: State[];
  connections: Connection[];  // New: Visual connections
  metadata: ShowMetadata;
}

interface Connection {
  id: string;
  fromNodeId: string;
  fromOutputIndex: number;  // 0 or 1 for two outputs
  toNodeId: string;
  label?: string;
}

type State = Scene | Fork;
type StateUpdate = SceneUpdate | ForkUpdate;  // Type-safe updates
```

### Node Types

#### 🎭 Scenes (Story Moments)
```typescript
interface Scene {
  id: string;
  type: 'scene';
  title: string;              // Required: Node name
  description: string;        // Required: Story content
  performerText: string;      // Optional: Actor cues
  audienceMedia: AudienceMedia[]; // Optional: Images/videos
  outputIds: string[];        // Optional: OSC/DMX/MQTT outputs
  position: Position;          // Canvas coordinates
  connections: string[];      // Outgoing connection IDs
}
```

#### 🔀 Forks (Decision Points)
```typescript
interface Fork {
  id: string;
  type: 'fork';
  title: string;              // Required: Choice description
  audienceText: string;       // Required: Voting prompt
  performerText: string;      // Optional: Performer cues
  countdownSeconds: number;   // Voting timer duration
  choices: Choice[];          // Two choice options
  position: Position;          // Canvas coordinates
  connections: string[];      // Outgoing connection IDs
}
```

### Supporting Types

#### 🎬 Media Assets
```typescript
interface AudienceMedia {
  type: 'image' | 'video';
  file: string;  // File path or URL
}
```

#### 🎯 Output Configurations
```typescript
interface Output {
  id: string;
  sceneId: string;
  type: 'OSC' | 'DMX' | 'MQTT';
  messages: Array<{
    path: string;
    value: any;
  }>;
}
```

## 💾 File Format & Persistence

### Export Package Structure

Shows are exported as self-contained JSON files with complete project data:

```json
{
  "show": {
    "showName": "My Interactive Play",
    "version": "1.0",
    "created": "2024-01-15T10:30:00Z",
    "lastEdited": "2024-01-15T14:45:00Z",
    "initialStateId": "scene_1"
  },
  "states": [...],           // All scenes and forks
  "connections": [...],      // Visual connection data
  "outputs": [...],          // OSC/DMX/MQTT configurations
  "metadata": {
    "author": "Director Name",
    "version": "1.0",
    "notes": "Production notes"
  },
  "exportedAt": "2024-01-15T14:45:00Z",
  "version": "1.0"
}
```

### Persistence Strategy

- **🖥️ Local Storage**: Automatic browser-based persistence
- **🔄 Change Detection**: Visual indicators for unsaved changes
- **📦 Export Validation**: Ensures complete shows before packaging
- **⏰ Version Tracking**: Automatic timestamps and versioning
- **🔒 Type Safety**: All data operations are type-safe

## 🛠️ Development Guide

### 🔧 Adding New Features

#### New Node Types
```typescript
// 1. Extend the State union in types/index.ts
export interface NewNodeType {
  id: string;
  type: 'new_type';
  // ... specific properties
}

// 2. Add to State union
export type State = Scene | Fork | NewNodeType;
```

#### New Properties
```typescript
// Add fields to appropriate interfaces
interface Scene {
  // ... existing fields
  newProperty?: string;
}
```

#### UI Components
```typescript
// Create in components/ directory
export const NewComponent: React.FC<Props> = ({ ... }) => {
  // Component logic with full TypeScript support
};
```

#### Validation Rules
```typescript
// Add to FileOperations.validateProject()
if (state.type === 'new_type') {
  // Custom validation logic
}
```

### 🎨 Styling System

The application uses a comprehensive CSS design system:

#### Key Style Classes
```css
/* Buttons */
.btn, .btn-primary, .btn-secondary, .btn-outline, .btn-sm

/* Panels */
.panel-*, .editor-*, .properties-panel

/* Canvas */
.canvas, .canvas-node, .connection-line, .connection-point

/* Nodes */
.scene-node, .fork-node, .node-header, .node-content

/* Interactive States */
.selected, .connection-point:hover, .connection-line:hover
```

#### Design Principles
- **Dark Theme Optimized**: Professional theater environment colors
- **High Contrast**: Accessibility-compliant color ratios
- **Smooth Animations**: 0.2s transitions for all interactions
- **Responsive Grid**: 20px snap-to-grid for precise alignment

### 🏪 State Management Architecture

#### Current Architecture
- **React Hooks**: useState for component state
- **Props Drilling**: Clean data flow through component hierarchy
- **Type-Safe Updates**: All mutations use StateUpdate types
- **Local Storage**: Automatic persistence layer

#### Future Enhancements
```typescript
// Potential state management libraries
// 1. Zustand - Lightweight global state
// 2. Redux Toolkit - Complex state logic
// 3. React Context - Global app state
```

### 🔍 Type Safety Features

#### 100% TypeScript Coverage
- **Strict Mode**: All TypeScript strict checks enabled
- **Interface Compliance**: All components implement proper contracts
- **Union Types**: Safe handling of Scene | Fork distinctions
- **Generic Types**: Proper use of TypeScript generics
- **IntelliSense**: Full IDE support and auto-completion

#### Type Definitions
```typescript
// Complete type system in types/index.ts
export interface ProjectData    // Main project structure
export type State              // Scene | Fork union
export type StateUpdate        // Type-safe partial updates
export interface Connection    // Visual connection data
export interface ValidationError // Comprehensive error types
```

## 🤝 Contributing

### Development Workflow

1. **🍴 Fork the repository**
2. **🌿 Create feature branch**: `git checkout -b feature/new-feature`
3. **💻 Make changes** with full TypeScript support
4. **✅ Test thoroughly**: All features must work with drag-and-drop
5. **📝 Update documentation** if needed
6. **🔧 Run type check**: `npm run type-check`
7. **📤 Submit pull request** with detailed description

### Code Quality Standards

- **TypeScript First**: All code must be type-safe
- **Component Structure**: Functional components with hooks
- **Naming Convention**: PascalCase for components, camelCase for functions
- **Import Organization**: Group by external libraries, then internal modules
- **Error Handling**: Proper try/catch with user-friendly messages

### Testing Strategy

```typescript
// Component testing example
describe('Canvas Component', () => {
  it('should create connections on drag-and-drop', () => {
    // Test drag-and-drop connection creation
  });

  it('should validate node connections', () => {
    // Test validation logic
  });
});
```

## 📋 Issue Reporting

### Bug Reports
```markdown
**Title**: Clear, descriptive title

**Description**:
- What happened?
- What should have happened?
- Steps to reproduce

**Environment**:
- Browser: Chrome 120.0
- OS: Windows 11
- Node version: 18.17.0

**Screenshots**: If applicable
```

### Feature Requests
```markdown
**Title**: Feature request title

**Description**: Detailed description of the requested feature

**Use Case**: How would this feature be used?

**Alternatives**: Any alternative solutions considered
```

## 📜 License

This project is part of the MEANDER interactive theater platform. See the main project license for details.

## 🆘 Support & Troubleshooting

### Common Issues

#### Connection Issues
- **Problem**: Connections not creating properly
- **Solution**: Ensure output points (blue) connect to input points (green)
- **Check**: Verify node positioning and zoom level

#### Validation Errors
- **Problem**: Export fails with validation errors
- **Solution**: Check all required fields are filled
- **Required**: Titles, descriptions, at least one connection per node

#### Performance Issues
- **Problem**: Canvas becomes slow with many nodes
- **Solution**: Use mini-map for navigation, reduce zoom level
- **Optimization**: Large projects may need pagination

### Getting Help

1. **📖 Check this README** for detailed usage instructions
2. **🔍 Search existing issues** for similar problems
3. **🐛 Create detailed bug report** with reproduction steps
4. **💡 Feature requests** welcome with use case descriptions

### Browser Compatibility

- ✅ **Chrome 90+**: Fully supported
- ✅ **Firefox 88+**: Fully supported
- ✅ **Safari 14+**: Fully supported
- ✅ **Edge 90+**: Fully supported

## 🗺️ Roadmap & Future Features

### 🎯 Immediate Priorities
- [x] **Drag-and-drop connections** ✅
- [x] **Type safety improvements** ✅
- [x] **Enhanced validation** ✅
- [x] **Connection deletion** ✅
- [x] **Mini-map navigation** ✅

### 🚀 Upcoming Features
- [ ] **Asset management** with drag-and-drop upload
- [ ] **Show templates** and example projects
- [ ] **Collaboration features** for team editing
- [ ] **Real-time preview** mode
- [ ] **Advanced output configuration** GUI
- [ ] **Show versioning** and history tracking
- [ ] **Keyboard shortcuts** for power users
- [ ] **Export to multiple formats** (PDF, video)
- [ ] **Performance optimization** for large projects
- [ ] **Mobile editing support**

### 💭 Long-term Vision
- **🎭 Integration** with MEANDER Conductor runtime
- **🌐 Web-based deployment** options
- **📊 Analytics** and audience engagement metrics
- **🎨 Advanced theming** and customization
- **🔗 Plugin system** for custom node types
- **📚 Educational content** and tutorials

---

## 🎉 Acknowledgments

Built with modern web technologies and a passion for interactive theater. Special thanks to the theater community for inspiration and feedback.

**Happy Storytelling! 🎭✨**
