# Implementation Plan - Layout & Scrolling Improvements

We will adjust the CSS to allow the page to scroll naturally and style the analysis results as a distinct, independent card.

## Goals
1.  **Enable Page Scroll**: Remove `overflow: hidden` from `body` and fixed heights from containers.
2.  **Detached Analysis Card**: Ensure the analysis panel looks like a separate module that flows naturally below the main content without squishing it.

## Proposed Changes

### 1. `style.css` - Global & Layout
- **`body`**: Remove `overflow: hidden` and `height: 100vh`. Allow `min-height: 100vh` for background but let content grow.
- **`.app-container`**:
    - Remove `height: 90vh`.
    - Change to `min-height: 90vh` or just allow auto height with padding.
    - Ensure it centers content but grows.
- **`.main-content-wrapper`**: Ensure it wraps or flexes correctly. Currently `flex: 1` might try to fill a fixed parent. It should be flexible.

### 2. `style.css` - Analysis Panel
- **`.analysis-panel`**:
    - Ensure it has the same "Glass" style as other panels (unify with `.glass-panel` class if possible, or copy properties).
    - Give it margin-top to separate it visually.
    - Ensure internal scrolling (`max-height`) is preserved if the list is huge, *or* removing max-height if the user wants "whole page scrollable" to implies seeing everything. The user said "Analyzed data should be shown in sapareted card", so internal scroll is arguably better for a "card", but if they want "whole page scrollable", maybe they want the card to grow?
    - **Decision**: Keep `max-height` for the *results list* inside the card, but let the card itself be part of the page flow.
    - style `border-radius`, `background`, `backdrop-filter` to match `.glass-panel`.

## Step-by-Step
1.  **Modify `body`**: Remove scroll lock.
2.  **Modify `.app-container`**: Remove fixed height, allow growth.
3.  **Update `.analysis-panel`**: Add glassmorphism styles and ensure separation.

## Verification
- Resize window height to be small -> Page should scroll.
- Run Analysis -> Results appear below.
- Check that opening results doesn't squish the player.
