# Implementation Plan - Refactoring script.js

Refactor the monolithic `script.js` (approx 800+ lines) into smaller, focused ES Modules (<100 lines each).

## Module Structure

We will use `<script type="module">` in `index.html`.

1.  **`js/state.js`**
    - Shared state object (`currentAnimationData`, `animation` instance wrapper, preferences).
    - Small file, just exports.

2.  **`js/utils.js`**
    - `hexToLottieColor`, `lottieColorToHex`.
    - General helpers.

3.  **`js/api.js`**
    - `fetchFileList` (server API interaction).
    - `loadJsonFile` (fetching specific file).

4.  **`js/file_io.js`**
    - Drag & Drop handlers.
    - File Input handler.
    - `FileReader` logic.

5.  **`js/player.js`**
    - `initLottie` (setup player).
    - `togglePlay`, `updateScrubber`, `setSpeed`, `setBackground`.
    - Manages the Lottie instance.

6.  **`js/layers_render.js`**
    - `renderLayersList`.
    - `getEyeIcon`.
    - `toggleLayerVisibility`.

7.  **`js/layers_color.js`**
    - `detectLayerColor`.
    - `updateLayerColor`.
    - `detectShapeColor`.
    - `updateShapesColor`.

8.  **`js/analyze.js`**
    - `analyzeAnimation` logic.
    - `renderAnalysisReport`.
    - `runAnalysis` event handler.

9.  **`js/fix.js`**
    - `autoFixAnimation` logic.
    - `runAutoFix` handler.

10. **`js/export.js`**
    - `downloadExport` logic.

11. **`js/main.js`**
    - Entry point.
    - DOMContentLoaded listener.
    - Wires up global event listeners (Buttons, DnD) by importing functions from other modules.

## Steps
1.  **Create Modules**: Create all the new `.js` files with migrated code.
2.  **Update HTML**: Replace `script.js` script tag with `main.js` type module.
3.  **Verify Server**: Ensure `server.js` serves `.js` files with strict MIME type `application/javascript` (ES modules are picky).

## Verification
- Load page.
- Test: File Browser, Drag&Drop, Playback, Layer Visibility, Color Picking, Analysis, Fix, Export.
- Ensure no console errors regarding imports.
