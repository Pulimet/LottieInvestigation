# Lottie Viewer & Debugger Tool

A powerful local web application for viewing, inspecting, analyzing, and fixing Lottie animation files (`.json`). This tool helps developers and designers ensure their Lottie files are performant and compatible across different platforms (iOS, Android, Web).

## 🚀 Features

### 1. Advanced Viewer
- **Playback Controls**: Play, Pause, Scrub through frames.
- **Speed Control**: Test animation at 0.5x, 1x, 1.5x, 2x speeds.
- **Backgrounds**: Toggle between Black, White, or Transparent (Checkerboard) backgrounds to check asset boundaries.
- **Drag & Drop**: Drag `.json` files directly onto the viewer to load them instantly.

### 2. File Browser
- **Local Access**: Automatically lists all `.json` files located in the `json/` directory.
- **One-click Loading**: Switch between animations quickly using the sidebar.
- **Real-time Refresh**: Update the file list without reloading the page.

### 3. Layer Inspector & Modifier
- **Layer List**: See all layers (Shapes, Text, Images, Precomps, Nulls) with type icons.
- **Visibility Toggle**: Hide/Show specific layers to debug complex compositions.
- **Color Tinting**: 
    - **Smart Detection**: Automatically detects the current color of Shapes, Solids, Text, and Precomps.
    - **Real-time Editing**: Change colors on the fly using the native color picker.
    - **Deep Tinting**: recursively tints elements inside Groups and Precomps.

### 4. Analysis & Debugging
- **Analyze Button**: Scans the animation for common issues that break mobile rendering:
    - Expressions (unsupported on some mobile players).
    - Merge Paths (performance killer on Android).
    - Unsupported Effects (Fill, Stroke effects outside of shapes).
    - Raster Images (which increase file size).
    - 3D Layers / Layer Styles.
- **Auto-Fix**: 
    - Removes unsupported expressions (`.x`).
    - Removes "Merge Paths".
    - Converts basic "Fill" effects to native shape fills where possible.

### 5. Export
- **Save Changes**: Export the modified/fixed/tinted animation as a new JSON file to your downloads folder.

---

## 🛠️ Setup & Usage

### Prerequisites
- **Node.js** (Installed on your machine).

### Installation
1.  Clone or download this repository.
2.  Open the folder in your terminal.
3.  Ensure your Lottie files are in the `json/` folder.

### Running the App
The app requires a local server to handle file operations and ES Modules.

```bash
node server.js
```

Then open your browser to: **`http://localhost:8000`**

---

## 📂 Project Structure

The project uses modern, modular vanilla JavaScript (ES Modules).

| Directory / File | Description |
| :--- | :--- |
| **`js/`** | **Application Logic (Modules)** |
| `├── main.js` | Entry point. Wires up event listeners. |
| `├── player.js` | Manages `lottie-web` instance, playback, and scrubbing. |
| `├── layers_render.js` | Renders the layer list and handles visibility toggling. |
| `├── layers_color.js` | Handles color detection and tinting logic. |
| `├── analyze.js` | Logic for scanning JSON for compatibility issues. |
| `├── fix.js` | Logic for auto-fixing animations. |
| `├── api.js` | Communicates with `server.js` to fetch files. |
| `├── file_io.js` | Handles Drag-and-Drop and File Inputs. |
| `├── state.js` | Shares global state (current animation, player instance). |
| `└── utils.js` | Helper functions (Color conversion). |
| **`json/`** | **Asset Folder**. Place your Lottie files here. |
| **`server.js`** | **Local Server**. Node.js script to serve files and list API. |
| **`index.html`** | Main UI structure. |
| **`style.css`** | Application styling (Glassmorphism design). |

## 📦 Dependencies
- **Lottie-Web**: Loaded via CDN (`cdnjs.cloudflare.com`). No `npm install` required for client-side libraries.

## 🤝 Troubleshooting
- **CORS Errors?**: Make sure you are using `node server.js` and accessing via `localhost`. You cannot open `index.html` directly from the file system.
- **Changes not showing?**: If you edited code, hard refresh (Cmd+Shift+R) to clear the module cache.
