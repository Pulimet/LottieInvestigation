# Implementation Plan - Lottie Layer Color Picker

We will add a feature to change the color of specific layers in the Lottie Viewer.

## User Interface Changes
- **File**: `script.js` (DOM generation)
- **Change**: In `renderLayersList`, add an `<input type="color">` element to each layer item.
- **Constraints**:
    - Only show the color picker for Shape Layers (`ty === 4`) initially, as these are the most likely to have simple controllable colors.
    - Set the initial value to a default (e.g., black or white) or try to detect the first color (advanced). For now, we'll default to `#ffffff` or allow the user to pick.

## Logic Implementation
- **File**: `script.js`
- **Function**: `updateLayerColor(layerData, color)`
- **Strategy**:
    - When the color input changes:
        1.  Find the corresponding renderer element for the layer.
        2.  Traverse the SVG DOM elements associated with that layer.
        3.  Look for `<path>` or `<g>` elements carrying a `fill` or `stroke` attribute.
        4.  Update the `fill` (and potentially `stroke`) to the selected color.
    - **Why SVG DOM?**: It's the most reliable way to visually update specific elements in `lottie-web` without triggering a full re-render or modifying the deep JSON structure which might reset on loop.
    - **Fallback**: If `animation.renderer.elements[i]` exposes the internal shape data, we could update that and call `renderFrame`, but direct DOM manipulation is often smoother for simple color tints.

## Step-by-Step
1.  **Modify `renderLayersList`**:
    - Inject `<input type="color" class="layer-color-picker">` into the template string.
    - Add event listener `input` or `change`.
2.  **Implement `updateLayerColor`**:
    - Access `animation.renderer.elements`.
    - Find the element matching the layer index.
    - Query `querySelectorAll("path")` inside the layer's group.
    - Set `style.fill` and `style.stroke` (if they exist) to the new color.

## Verification
- Open the viewer in a browser (or mock environment).
- Load `lottie.json`.
- Pick a color for a shape layer.
- Verify the color updates on the screen.
