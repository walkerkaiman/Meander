# MEANDER Editor

## 🎭 Complete Theatrical Experience Creator

MEANDER is a powerful visual editor for creating interactive theatrical choose-your-own-adventure experiences. Design branching narratives, upload media, and export complete show packages ready for performance.

### ✨ Key Features

- **Visual Node Editor**: Drag-and-drop interface for story creation
- **Multiple Node Types**: Scenes, Forks, Opening, and Ending nodes
- **Crisp Infinite Canvas**: High-performance pan/zoom, fit-to-view button, mini-map
- **Dynamic Node Layout**: Nodes grow to fit titles & multi-line text; connection points auto-align
- **Edge Management**: Drag to create, hover to delete, labels for fork choices
- **Real-time Validation**: Ensures every fork output is connected & other structural rules
- **Media Integration**: Upload images and videos for audience second screens
- **Complete Package Export**: Export self-contained ZIP packages with all media
- **Real-time Validation**: Built-in validation with helpful error messages
- **Professional Output**: Ready for Conductor software integration

### 📦 Package Export System

When you export your show, MEANDER creates a complete, self-contained package:

```
Your_Show_Name_2025-01-03T123456.zip
├── config/
│   ├── states.json      # Story structure and node definitions
│   ├── outputs.json     # Technical outputs (lighting, sound, etc.)
│   └── metadata.json    # Show metadata and author information
├── media/
│   ├── scene_image_1.jpg
│   ├── background_video.mp4
│   └── character_portrait.png
└── show.json            # Main configuration file
```

### 🎯 Node Types

#### **Opening Scene** (🟦)
- No input connections (story starting point)
- One output connection
- Can contain media for initial presentation

#### **Regular Scene** (▶️)
- One input connection
- One output connection
- Main story content with media support

#### **Fork / Choice** (🔀)
- One input connection
- Any number of output connections (one per choice)
- Audience text + timer; each choice rendered as separate branch

#### **Ending Scene** (🟦)
- One input connection
- No output connections (story conclusion)
- Final presentation with media

### 🚀 Getting Started

1. **Create a New Show**: An Opening Scene is added automatically
2. **Add Content**: Type multi-line descriptions – nodes resize automatically
3. **Branch**: Use Fork nodes, add choices (plus button) then drag outputs to target scenes
4. **Add Endings**: Create Ending scenes (no outputs)
5. **Validate & Fit View**: Click ✅ and Fit-view button (🔍) to see entire tree
6. **Export**: Download ready-to-run show package

### 🎨 Media Support

- **Images**: JPG, PNG, GIF, WebP
- **Videos**: MP4, WebM, MOV
- **Full Screen Display**: Media appears on audience second screens
- **Automatic Packaging**: All media included in export ZIP

### 🔗 Integration

Exported packages are designed to work seamlessly with the MEANDER Conductor software for live performance control.

---

**Built for theatrical innovation and interactive storytelling** 🎭✨

