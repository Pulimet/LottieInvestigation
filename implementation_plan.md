# Implementation Plan - Fix Button

We will add a "Fix" button that runs the optimization logic (removing expressions, merge paths, etc.) directly on the loaded animation in the browser.

## UI Changes
- **File**: `index.html`
- **Location**: Metadata row, next to "Analyze".
- **Element**: `<button id="fix-btn" class="secondary-btn">Fix</button>`

## Logic Implementation
- **File**: `js/script.js`
- **Function**: `autoFixAnimation(animationData)`
    - Port logic from `js/fix_lottie.js`:
        - Remove expressions (`x` property).
        - Remove Merge Paths (`ty === 'mm'`).
        - Remove/convert unsupported Effects.
    - **Return**: A modified copy of the animation data.
- **Event Handler**:
    - On Click:
        - Clone `currentAnimationData`.
        - Run `autoFixAnimation`.
        - Update `currentAnimationData` with result.
        - Reload player (`initLottie`).
        - Show success message / alert ("Fixed X issues").
        - (Optional) Re-run analysis automatically to show clean state.

## Step-by-Step
1.  **Update `index.html`**: Add the button.
2.  **Update `js/script.js`**: Implement the fix logic and event listener.

## Verification
1.  Load `lottie.json` (original).
2.  Click "Analyze" -> Verify errors exist.
3.  Click "Fix" -> Player reloads.
4.  Click "Analyze" -> Verify errors are gone.
5.  Click "Download" -> Verify filename is `[name]_exported.json` and content is fixed.
