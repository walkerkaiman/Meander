# MEANDER Editor

## 🎭 Complete Theatrical Experience Creator

MEANDER is a powerful visual editor for creating interactive theatrical choose-your-own-adventure experiences. Design branching narratives, upload media, and export complete show packages ready for performance.

### ✨ Key Features

- **Visual Node Editor**: Drag-and-drop interface for story creation
- **Multiple Node Types**: Scenes, Forks, Opening, and Ending nodes
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

#### **Fork/Choice** (🔀)
- One input connection
- Two output connections (story branches)
- Decision points for audience interaction

#### **Ending Scene** (🟦)
- One input connection
- No output connections (story conclusion)
- Final presentation with media

### 🚀 Getting Started

1. **Create a New Show**: Start with Opening Scene
2. **Add Content**: Upload media and write scene descriptions
3. **Build Branches**: Use Forks to create choice points
4. **Add Endings**: Create conclusion scenes
5. **Validate**: Check for errors and missing connections
6. **Export**: Download complete show package

### 🎨 Media Support

- **Images**: JPG, PNG, GIF, WebP
- **Videos**: MP4, WebM, MOV
- **Full Screen Display**: Media appears on audience second screens
- **Automatic Packaging**: All media included in export ZIP

### 🔗 Integration

Exported packages are designed to work seamlessly with the MEANDER Conductor software for live performance control.

---

**Built for theatrical innovation and interactive storytelling** 🎭✨

