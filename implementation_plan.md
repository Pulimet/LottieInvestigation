# Implementation Plan - Dynamic File Access via Local Server

To provide a fully dynamic view of the `json/` folder without manual bundling, we will switch to a Client-Server architecture.

## The Solution
We will create a simple Node.js server that:
1.  **Serves the App**: Hosts `index.html`, `js/`, `css/` files.
2.  **Lists Files**: Provides an API endpoint `/api/files` that scans the `json/` directory in real-time.
3.  **Serves JSON**: Allows fetching JSON files directly.

This removes the need for `files_bundle.js` and `generate_bundle.js`.

## Changes

### 1. `server.js` [NEW]
- A minimal Node.js server using built-in `http` and `fs` modules (no extra dependencies needed).
- **Routes**:
    - `/api/files`: Returns JSON array of filenames in `json/`.
    - `/`: Serves `index.html`.
    - `*.js`, `*.css`, `*.json`: Serves static files.

### 2. `js/script.js`
- **Remove**: Logic related to `window.LOTTIE_FILES`.
- **Add**: `fetchFileList()` function that hits `/api/files`.
- **Update**: `loadJsonFile(filename)` to `fetch('/json/' + filename)`.

### 3. `index.html`
- **Remove**: `<script src="js/files_bundle.js"></script>`.

## Cleanup
- Delete `js/files_bundle.js`.
- Delete `js/generate_bundle.js`.

## Workflow
Instead of double-clicking `index.html`, the user will:
1.  Run `node server.js` in the terminal.
2.  Open `http://localhost:8000`.

## Verification
- Start server.
- Open browser.
- Sidebar should show `input.json` and others.
- Add a new file to `json/`.
- Refresh browser -> New file appears instantly.
