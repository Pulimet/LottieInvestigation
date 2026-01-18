# Lottie Animation Analysis Report

## Overview
We analyzed `lottie.json` to understand why it renders differently in React Native compared to the Web. The analysis revealed 5 specific categories of potential issues that are known to cause discrepancies in React Native (iOS/Android).

## Findings for `lottie.json`

| Issue Type | Location | Details & Recommendation |
| :--- | :--- | :--- |
| **Text Layer** | `YEARS OF CONNECTING -Aleck` | **Critical**: Text layers rely on fonts. In React Native, if the font isn't loaded natively or if the text isn't converted to shapes (Glyphs) during export, it will likely be invisible or fall back to a system font.<br>**Fix**: Convert text to shapes in After Effects (Create Shapes from Text) OR ensure the font file is linked in your React Native project. |
| **Effects (Fill)** | `YEARS OF CONNECTING -Aleck`<br>`150_stroke_show` | **Warning**: The `Fill` effect from the "Effects" menu is often not supported. <br>**Fix**: Use the standard "Fill" property of the Shape Layer instead of applying an Effect. |
| **Merge Paths** | `150 mask` | **Critical (Android)**: "Merge Paths" are not supported on older Android devices and require `enableMergePathsAndroidForKitKatAndAbove` to be true in the LottieView props on newer ones. Even then, they are buggy.<br>**Fix**: Avoid Merge Paths. flatten shapes where possible. |
| **Track Matte** | `150_stroke_show` | **Verification Needed**: Track Mattes (Alpha/Luma) are generally supported but can behave differently across platforms (especially Luma mattes).<br>**Fix**: If it looks wrong, try switching to Alpha Matte or Inverted Alpha Matte. |
| **Expression** | `Asset (comp_0) > att_symbol_globe_In` | **Performance/Support**: Expressions (JavaScript logic inside AE) for the `Opacity` property. Complex expressions may fail.<br>**Fix**: Bake expressions to keyframes in After Effects before exporting. |

## How to Check (The Tool)
I have created a script `analyze_lottie.js` in your directory. You can use this to check any Lottie file in the future.

**Usage:**
```bash
node analyze_lottie.js <filename.json>
```

## Recommended Next Steps
1.  **Open the After Effects project** for this animation.
2.  **Convert Text to Shapes**: Right-click text layers -> Create Shapes from Text.
3.  **Bake Expressions**: Keyframe Assistant -> Convert Expression to Keyframes.
4.  **Remove 'Effect' Fills**: Remove the Fill effect and change the Fill color property of the shape itself.
5.  **Simplify Masks**: If possible, remove usage of "Merge Paths".
6.  **Re-export** the JSON.
