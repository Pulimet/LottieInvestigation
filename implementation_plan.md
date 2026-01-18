# Implementation Plan - Client-Side Lottie Analysis

We will integrate the analysis logic from `analyze_lottie.js` directly into the web viewer, allowing users to scan their animation for compatibility issues.

## User Interface Changes
- **File**: `index.html`
- **Change**: Add an "Analyze" button next to "Download Export".
- **Change**: Add a new "Analysis Results" card section below the player to display the report.

## Logic Implementation
- **File**: `script.js` (or a new module, but `script.js` is fine for this size)
- **Goal**: Port the `checkLayer`, `checkShapes`, and traversal logic from `analyze_lottie.js`.

### 1. Analysis Function (`analyzeAnimation(animationData)`)
- Iterate through `animationData.layers` and `animation.assets`.
- Checks to implement (parity with `analyze_lottie.js`):
    - **Assets**: Large images/base64 checking.
    - **Track Mattes**: `tt` property.
    - **3D Layers**: `ddd` property.
    - **Effects**: `ef` array.
    - **Time Remapping**: `tm`.
    - **Blending Modes**: `bm`.
    - **Layer Styles**: `sy`.
    - **Expressions**: Keyframe properties ending in `x`.
    - **Text Layers**: `ty === 5`.
    - **Merge Paths**: `ty === 'mm'`.

### 2. UI Rendering (`renderAnalysisReport(issues)`)
- Clear previous results.
- If no issues: Show a success message ("No major issues found").
- If issues: Render a list/table of issues.
    - **Format**: `[Type] Layer Name: Message`
    - Use color coding (Yellow/Red) for severity if possible (all seem to be warnings/errors).

### 3. Integration
- Button `click` event listener calling `analyzeAnimation(currentAnimationData)`.
- **Note**: This runs on the *current* data, so it will reflect any visibility/color changes if they introduced new issues (unlikely for visibility/color, but good for verification).

## Step-by-Step
1.  **Edit `index.html`**: Add Button and Results Container.
2.  **Edit `style.css`**: Style the results container (card style, scrollable if long).
3.  **Edit `script.js`**:
    - Copy logic from `analyze_lottie.js`.
    - Adapt `console.log` generic output to return an array of objects.
    - Implement the UI rendering function.

## Verification
- Load `lottie.json` (original).
- Click "Analyze".
- Verify report matches the terminal output we saw earlier.
- Load `lottie_fixed.json`.
- Click "Analyze".
- Verify report is clean (or has fewer issues).
