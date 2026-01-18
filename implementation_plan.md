# Implementation Plan - Fix File Loading & Listing

To resolve the "Failed to fetch" (CORS) error and ensure all files are listed, we will switch from `fetch()` to a bundled data approach.

## Strategy: Data Bundling
Since the total size of JSON files is small (~1.3MB), we can wrap them into a JavaScript file (`js/files_bundle.js`) that defines a global variable. This avoids network requests entirely, bypassing CORS rules on local files systems.

## Changes

### 1. `js/files_bundle.js` (Generated)
- **Format**:
  ```javascript
  window.LOTTIE_FILES = {
      "lottie.json": { ...json content... },
      "lottie_fixed.json": { ...json content... },
      ...
  };
  ```
- **Generation**: I will create a Node.js script `js/generate_bundle.js` to build this file automatically from the `json/` directory.

### 2. `index.html`
- Include the bundle script *before* the main script.
  ```html
  <script src="js/files_bundle.js"></script>
  <script src="js/script.js"></script>
  ```

### 3. `js/script.js`
- **Remove**: `KNOWN_FILES` array and `fetch` logic.
- **Update**: `renderFileList` to keys of `window.LOTTIE_FILES`.
- **Update**: `loadJsonFile` to simply access `window.LOTTIE_FILES[filename]`.

## Helper Script
- `js/generate_bundle.js`:
    - Reads `json/` directory.
    - Reads each `.json` file.
    - Writes `js/files_bundle.js`.

## Step-by-Step
1.  **Create Generator**: Write `js/generate_bundle.js`.
2.  **Run Generator**: Execute it to create the initial bundle.
3.  **Update `index.html`**: Add script tag.
4.  **Update `js/script.js`**: Refactor loading logic.

## Verification
- Reload page (no server needed).
- "Files" list should show ALL files (including `lottie_fixed_exported.json`).
- Clicking a file should load it instantly (no fetch error).
