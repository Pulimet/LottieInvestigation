# Implementation Plan - Lottie JSON Export

We will add functionality to export the modified Lottie JSON, preserving visibility and color changes made in the viewer.

## User Interface Changes
- **File**: `index.html`
- **Change**: Add a "Download JSON" button to the header or controls area.
- **File**: `style.css`
- **Change**: Style the new button.

## Logic Implementation
- **File**: `script.js`
- **Goal**: Synchronize UI changes to `currentAnimationData` and implement export.

### 1. Synchronizing Changes
We need to update the source JSON (`currentAnimationData`) whenever the user interacts with the UI.

*   **Visibility (`toggleLayerVisibility`)**:
    *   Update `layer.hd` in the JSON data.
    *   `currentAnimationData.layers.find(l => l.ind === layerData.ind).hd = isHidden`

*   **Color (`updateLayerColor`)**:
    *   This requires a new helper `applyColorToJson(layer, hexColor)`.
    *   **Hex to RGB conversion**: Lottie uses normalized RGB [0-1, 0-1, 0-1].
    *   **Shape Layers (`ty: 4`)**:
        *   Traverse `shapes`.
        *   Find `ty: 'fl'` (Fill) and `ty: 'st'` (Stroke).
        *   Update `c.k` to the new RGB array.
    *   **Text Layers (`ty: 5`)**:
        *   Access `layer.t.d.k` (Document Data).
        *   Iterate keyframes (usually just one).
        *   Update `s.fc` (Fill Color) and `s.sc` (Stroke Color) with the new RGB array.

### 2. Export Functionality
*   **Function**: `downloadJson()`
*   Create a `Blob` from `currentAnimationData`.
*   Trigger a browser download for `lottie_exported.json`.

## Helper Functions needed
```javascript
function hexToLottieColor(hex) {
    // #RRGGBB -> [r/255, g/255, b/255, 1]
}

function updateJsonLayerColor(layerIndex, hexColor) {
    // Find layer in currentAnimationData
    // Recursive traversal for shapes
    // Update text data
}
```

## Step-by-Step
1.  **Edit `index.html`**: Insert button.
2.  **Edit `script.js`**:
    - Add `hexToLottieColor`.
    - Add `updateJsonLayerColor` (handles Shapes and Text).
    - Modify `updateLayerColor` to call `updateJsonLayerColor`.
    - Modify `toggleLayerVisibility` to update `layer.hd`.
    - Add click listener for Download button.

## Verification
- Load file.
- Hide a layer.
- Change a color.
- Click "Download".
- Open the downloaded file in the viewer (or inspect in text editor) to verify attributes `hd` and `c.k`.
