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
    function fixLayer(layer) {
        const removeExpressions = (obj) => {
            if (!obj || typeof obj !== 'object') return;
            if (obj.k && obj.x) { delete obj.x; stats.expressions++; }
            Object.keys(obj).forEach(key => removeExpressions(obj[key]));
        };
        if (layer.ks) removeExpressions(layer.ks);
        if (layer.ef) removeExpressions(layer.ef);
        if (layer.shapes) removeExpressions(layer.shapes);

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
