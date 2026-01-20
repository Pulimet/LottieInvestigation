import { state } from './state.js';
import { hexToLottieColor, lottieColorToHex } from './utils.js';

export function detectLayerColor(layer, animationData) {
    try {
        if (layer.ty === 1 && layer.sc) return layer.sc; // Solid
        if (layer.ty === 4 && layer.shapes) return detectShapeColor(layer.shapes); // Shape
        if (layer.ty === 5 && layer.t && layer.t.d) { // Text
            const doc = layer.t.d.k;
            const firstFrame = Array.isArray(doc) ? doc[0] : doc;
            if (firstFrame && firstFrame.s && firstFrame.s.fc) {
                return lottieColorToHex(firstFrame.s.fc);
            }
        }
        if (layer.ty === 0 && layer.refId && animationData.assets) { // Precomp
            const asset = animationData.assets.find(a => a.id === layer.refId);
            if (asset && asset.layers) {
                for (const l of asset.layers) {
                    const col = detectLayerColor(l, animationData);
                    if (col) return col;
                }
            }
        }
    } catch (e) { console.warn('Error detecting color', e); }
    return null;
}

export function detectShapeColor(shapes) {
    for (const s of shapes) {
        if (s.ty === 'fl') {
            if (s.c && s.c.k) {
                const k = s.c.k;
                if (Array.isArray(k) && typeof k[0] === 'number') return lottieColorToHex(k);
            }
        }
        if (s.it) {
            const c = detectShapeColor(s.it);
            if (c) return c;
        }
    }
    return null;
}

export function updateLayerColor(layerData, color, hierarchyPath) {
    if (!state.animation || !state.animation.renderer || !state.animation.renderer.elements) return;

    // Helper to find render element recursively (duplicated for now to keep encapsulated)
    function findRenderElementByPath(elements, path) {
        if (!elements || path.length === 0) return null;
        const currentInd = path[0];
        let match = null;
        for (let i = 0; i < elements.length; i++) {
            if (elements[i] && elements[i].data && elements[i].data.ind === currentInd) {
                match = elements[i];
                break;
            }
        }
        if (!match) return null;
        if (path.length === 1) return match;
        if (match.elements) return findRenderElementByPath(match.elements, path.slice(1));
        return null;
    }

    let renderElement = null;
    if (hierarchyPath && hierarchyPath.length > 0) {
        renderElement = findRenderElementByPath(state.animation.renderer.elements, hierarchyPath);
    } else {
        renderElement = findRenderElementByPath(state.animation.renderer.elements, [layerData.ind]);
    }

    if (!renderElement || !renderElement.layerElement) {
        console.warn("Could not find render element for color update", layerData.nm);
        return;
    }

    const layerGroup = renderElement.layerElement;
    const paths = layerGroup.querySelectorAll('path, text, rect, circle, ellipse, line, polyline, polygon');

    console.log(`Tinting ${paths.length} elements in ${layerData.nm}`);

    paths.forEach(p => {
        const computed = getComputedStyle(p);
        if (computed.fill !== 'none' && computed.fill !== 'transparent') p.style.fill = color;
        if (computed.stroke !== 'none' && computed.stroke !== 'transparent' && computed.strokeWidth !== '0px') p.style.stroke = color;
    });

    if (state.currentAnimationData) {
        // We need to update the correct layer in JSON. 
        // If hierarchyPath is deep, we need to traverse assets.
        // Or since we have layerData reference passed directly, we can just update it?
        // Wait, updateShapesColor modifies the object in place. 
        // layerData is the object reference from the JSON tree.
        // So we can just use layerData directly!

        // However, the original code looked it up. Let's trust layerData reference.

        const lottieColor = hexToLottieColor(color);
        if (layerData.ty === 5 && layerData.t && layerData.t.d) { // Text
            const docs = layerData.t.d.k;
            if (Array.isArray(docs)) {
                docs.forEach(frame => {
                    if (frame.s) { frame.s.fc = [...lottieColor, 1]; frame.s.sc = [...lottieColor, 1]; frame.s.sw = 0; }
                });
            }
        }
        if (layerData.shapes) updateShapesColor(layerData.shapes, lottieColor); // Shape

        // For precomps, we usually don't tint the precomp container itself in JSON but the elements inside?
        // But the user action is "Change color of this layer".
        // If it's a precomp layer, we might want to recurse down to its asset layers?
        // The original code did that.

        if (layerData.ty === 0 && layerData.refId) { // Precomp
            const asset = state.currentAnimationData.assets.find(a => a.id === layerData.refId);
            if (asset && asset.layers) {
                asset.layers.forEach(l => {
                    if (l.shapes) updateShapesColor(l.shapes, lottieColor);
                    if (l.ty === 5 && l.t && l.t.d) {
                        const docs = l.t.d.k;
                        if (Array.isArray(docs)) docs.forEach(f => { if (f.s) { f.s.fc = [...lottieColor, 1]; f.s.sc = [...lottieColor, 1]; } });
                    }
                });
            }
        }
        if (layerData.ty === 1) layerData.sc = color; // Solid
    }
}

export function updateShapesColor(shapes, rgbColor) {
    shapes.forEach(shape => {
        if (shape.ty === 'fl' || shape.ty === 'st') {
            if (shape.c) {
                shape.c.k = [...rgbColor, 1];
                delete shape.c.x;
            }
        }
        if (shape.it) updateShapesColor(shape.it, rgbColor);
    });
}
