import { state } from './state.js';
import { renderAnalysisReport } from './analyze.js'; // Cyclic dependency? analyze calls render, fix calls analyze. 
// Ideally runAnalysis should be exported.
import { runAnalysis } from './analyze.js';
import { initLottie } from './player.js';

export function runAutoFix() {
    if (!state.currentAnimationData) { alert('No animation loaded.'); return; }
    if (!confirm('This will modify the animation in memory. Proceed?')) return;

    const fixStats = { expressions: 0, effectsRemoved: 0, mergePathsRemoved: 0, fillFixes: 0 };

    try {
        autoFixAnimation(state.currentAnimationData, fixStats);
        initLottie(state.currentAnimationData);
        alert(`Fix Complete!\nExpressions: ${fixStats.expressions}\nMerge Paths: ${fixStats.mergePathsRemoved}\nEffects: ${fixStats.effectsRemoved}`);
        runAnalysis();
    } catch (err) {
        console.error('Error fixing animation:', err);
        alert('An error occurred while fixing.');
    }
}

function autoFixAnimation(animation, stats) {
    // 0. Timeline Normalization (Fix Playback Issue)
    let minIP = Infinity;
    const processGlobalStats = (layers) => {
        layers.forEach(l => {
            if (l.ip < minIP) minIP = l.ip;
        });
    };
    if (animation.layers) processGlobalStats(animation.layers);

    // If animation starts late (e.g. > 15 frames), shift everything back
    if (minIP > 15 && minIP !== Infinity) {
        const shiftAmount = minIP;
        const shiftLayer = (l) => {
            l.ip -= shiftAmount;
            l.op -= shiftAmount;
            if (l.st !== undefined) l.st -= shiftAmount;
            // Also shift keyframes if necessary? Usually shifting ip/op/st is enough for simple layers.
            // For rigorous fix, would need to shift all keyframes timeline, but start simple.
        };

        if (animation.layers) animation.layers.forEach(l => shiftLayer(l));
        if (animation.assets) animation.assets.forEach(a => { if (a.layers) a.layers.forEach(l => shiftLayer(l)); });

        // Adjust animation markers if any
        if (animation.markers) {
            animation.markers.forEach(m => {
                m.tm -= shiftAmount;
                m.dr -= shiftAmount;
            });
        }

        // Adjust global in/out points
        animation.ip = Math.max(0, animation.ip - shiftAmount);
        animation.op -= shiftAmount;

        stats.timelineShifted = shiftAmount;
    }

    function fixLayer(layer) {
        const removeExpressions = (obj) => {
            if (!obj || typeof obj !== 'object') return;
            if (obj.k && obj.x) { delete obj.x; stats.expressions++; }
            Object.keys(obj).forEach(key => removeExpressions(obj[key]));
        };
        if (layer.ks) removeExpressions(layer.ks);
        if (layer.ef) removeExpressions(layer.ef);
        if (layer.shapes) removeExpressions(layer.shapes);

        // Fix Text Layer (RN Black Letters Issue)
        if (layer.ty === 5 && layer.t && layer.t.d) {
            fixTextLayer(layer, stats);
        }

        if (layer.ef && layer.ef.length > 0) {
            const newEffects = [];
            layer.ef.forEach(effect => {
                const isFill = effect.nm && effect.nm.toLowerCase().includes('fill');
                if (isFill) {
                    const color = effect.ef ? effect.ef.find(p => p.nm === 'Color') : null;
                    if (color && color.v) {
                        if (applyColorToShape(layer.shapes, color.v)) stats.fillFixes++;
                    }
                    stats.effectsRemoved++;
                } else {
                    newEffects.push(effect);
                }
            });
            layer.ef = newEffects;
        }

        if (layer.shapes) layer.shapes = filterShapes(layer.shapes, stats);
    }

    if (animation.layers) animation.layers.forEach(l => fixLayer(l));
    if (animation.assets) animation.assets.forEach(a => { if (a.layers) a.layers.forEach(l => fixLayer(l)); });
}

function fixTextLayer(layer, stats) {
    // Attempt to inject Fill Color into Text Animators if missing
    // React Native Lottie can default to black if animators don't explicitly specify color
    // but the text document does.
    try {
        const textDoc = layer.t.d;
        // Check first keyframe for style
        const firstKeyframe = textDoc.k ? (Array.isArray(textDoc.k) ? textDoc.k[0] : textDoc) : null;
        if (!firstKeyframe || !firstKeyframe.s) return;

        const style = firstKeyframe.s;
        const fillColor = style.fc; // [r, g, b, a]

        if (fillColor && layer.t.a && Array.isArray(layer.t.a)) {
            layer.t.a.forEach(animator => {
                if (!animator.s) animator.s = {};

                // If the animator modifies properties but doesn't have Fill Color, add it.
                // We mainly care if it doesn't have it.
                if (!animator.s.fc) {
                    // We add a Fill Color property to the animator style
                    // However, Lottie animator style properties usually follow a specific structure
                    // For 'fc' (Fill Color), it expects an iterator/value. 
                    // Actually, in Text Animators, you add 'fc' to the 'a' (properties) object of the animator, 
                    // NOT the 's' (selector).
                    // Wait, let's check structure: layer.t.a[0].a (properties)

                    if (animator.a) {
                        if (!animator.a.fc) {
                            // Inject Fill Color into the animator properties
                            // Using the color from the text document
                            animator.a.fc = {
                                a: 0,
                                k: fillColor,
                                ix: 0 // Index might matter? 
                            };
                            if (!stats.textFixes) stats.textFixes = 0;
                            stats.textFixes++;
                        }
                    }
                }
            });
        }
    } catch (e) {
        console.warn('Error fixing text layer:', e);
    }
}

function applyColorToShape(shapes, colorValue) {
    if (!shapes) return false;
    let applied = false;
    for (const shape of shapes) {
        if (shape.ty === 'fl') {
            if (!shape.c) shape.c = { a: 0, k: [1, 1, 1, 1] };
            shape.c.k = colorValue.k || colorValue;
            if (shape.c.x) delete shape.c.x;
            applied = true;
        }
        if (shape.it && applyColorToShape(shape.it, colorValue)) applied = true;
    }
    return applied;
}

function filterShapes(shapes, stats) {
    return shapes.filter(shape => {
        if (shape.ty === 'mm') { stats.mergePathsRemoved++; return false; }
        if (shape.it) shape.it = filterShapes(shape.it, stats);
        return true;
    });
}
