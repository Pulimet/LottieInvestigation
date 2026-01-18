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

export function updateLayerColor(layerData, color) {
    if (!state.animation || !state.animation.renderer || !state.animation.renderer.elements) return;

    let renderElement = null;
    for (let i = 0; i < state.animation.renderer.elements.length; i++) {
        const el = state.animation.renderer.elements[i];
        if (el && el.data && el.data.ind === layerData.ind) {
            renderElement = el;
            break;
        }
    }

    if (!renderElement || !renderElement.layerElement) return;

    const layerGroup = renderElement.layerElement;
    const paths = layerGroup.querySelectorAll('path, text, rect, circle, ellipse, line, polyline, polygon');

    console.log(`Tinting ${paths.length} elements in ${layerData.nm}`);

    paths.forEach(p => {
        const computed = getComputedStyle(p);
        if (computed.fill !== 'none' && computed.fill !== 'transparent') p.style.fill = color;
        if (computed.stroke !== 'none' && computed.stroke !== 'transparent' && computed.strokeWidth !== '0px') p.style.stroke = color;
    });

    if (state.currentAnimationData) {
        const jsonLayer = state.currentAnimationData.layers.find(l => l.ind === layerData.ind);
        if (jsonLayer) {
            const lottieColor = hexToLottieColor(color);
            if (jsonLayer.ty === 5 && jsonLayer.t && jsonLayer.t.d) { // Text
                const docs = jsonLayer.t.d.k;
                if (Array.isArray(docs)) {
                    docs.forEach(frame => {
                        if (frame.s) { frame.s.fc = [...lottieColor, 1]; frame.s.sc = [...lottieColor, 1]; frame.s.sw = 0; }
                    });
                }
            }
            if (jsonLayer.shapes) updateShapesColor(jsonLayer.shapes, lottieColor); // Shape
            if (jsonLayer.ty === 0 && jsonLayer.refId) { // Precomp
                const asset = state.currentAnimationData.assets.find(a => a.id === jsonLayer.refId);
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
            if (jsonLayer.ty === 1) jsonLayer.sc = color; // Solid
        }
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
