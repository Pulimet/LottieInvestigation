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

                // 1. Fix Fill Color (RN Black Text)
                if (animator.a) {
                    if (!animator.a.fc) {
                        animator.a.fc = {
                            a: 0,
                            k: fillColor,
                            ix: 0
                        };
                        if (!stats.textFixes) stats.textFixes = 0;
                        stats.textFixes++;
                    }
                }

                // 2. Fix Range Selector Units & Offset
                if (animator.s && animator.s.o && animator.s.o.a === 1 && animator.s.o.k) {

                    // A: Fix Units (Convert to Percentage)
                    // React Native Lottie has trouble with Index Units (rn: 1) and small End values.
                    // The most robust fix is to convert everything to Percentage (rn: 0, End: 100).

                    let endVal = 100; // Default
                    if (animator.s.e && typeof animator.s.e.k === 'number') {
                        endVal = animator.s.e.k;
                    }

                    // If End is small (e.g. < 50), assume it was meant to be Indices (e.g. 3 words).
                    // We convert it to 100% and scale the Offset/Start values.
                    if (endVal < 50 && endVal > 0) {
                        // REWRITE: Standard "Left-to-Right Reveal" (Percentage)
                        // Instead of scaling potentially weird Offsets, we wipe the slate clean.
                        // We set up a standard 0% -> 100% "Start" animation.
                        // T0: Start 0, End 100 (Range 0-100% Selected) -> All Hidden.
                        // T1: Start 100, End 100 (Range 100-100% Selected) -> Empty -> All Visible.

                        // 1. Force Properties
                        animator.s.rn = 0; // Percent
                        animator.s.sh = 1; // Square
                        // animator.s.b = 1; // Characters (Optional, but safe)

                        if (!animator.s.e) animator.s.e = {};
                        animator.s.e.a = 0;
                        animator.s.e.k = 100; // End fixed at 100%

                        // 2. Get Timing from existing Offset Keyframes
                        let times = [];
                        if (animator.s.o.k && Array.isArray(animator.s.o.k)) {
                            // Extract T start/end from first two keyframes or just start/end of array
                            const first = animator.s.o.k[0];
                            const last = animator.s.o.k[animator.s.o.k.length - 1]; // or look for hold input
                            // Simple assumption: 2 keyframes usually.
                            if (first && typeof first.t === 'number') times.push(first.t);
                            if (last && typeof last.t === 'number' && last !== first) times.push(last.t);
                        }

                        // Fallback timing if missing
                        if (times.length < 2) {
                            times = [layer.ip, layer.ip + 60]; // 1 second duration default?
                        }

                        // 3. Create Start Animation (0 -> 100)
                        animator.s.s = {
                            a: 1,
                            ix: 4, // 'Start' property index
                            k: [
                                {
                                    t: times[0],
                                    s: [0],
                                    i: { x: [0.833], y: [0.833] }, // Standard ease
                                    o: { x: [0.167], y: [0.167] }
                                },
                                {
                                    t: times[1],
                                    s: [100]
                                }
                            ]
                        };

                        // 4. Kill Offset Animation (Set to 0)
                        animator.s.o = {
                            a: 0,
                            k: 0,
                            ix: 6
                        };

                        if (!stats.textFixes) stats.textFixes = 0;
                        stats.textFixes++;
                        // console.log(`[Fixed] Rewrote Animator to Standard Start Wipe (0->100%)`);
                    }

                    // B: Fix Negative Offset - REMOVED (Obsolete with rewrite)
                }

            });
        }
    } catch (e) {
        console.warn('Error fixing text layer:', e);
    }
}

// Helper to update Text Layer IP based on Animator start
// This fixes the "Shown Always" issue in RN by ensuring the layer doesn't exist 
// before the animation actually starts.
function syncTextLayerIP(layer, stats) {
    if (layer.ty !== 5 || !layer.t || !layer.t.a) return;

    try {
        let minKeyitme = Infinity;
        let hasAnimatedSelector = false;

        layer.t.a.forEach(animator => {
            // Check Range Selector Offset
            if (animator.s && animator.s.o && animator.s.o.a === 1 && animator.s.o.k) {
                animator.s.o.k.forEach(kf => {
                    if (kf.t !== undefined && kf.t < minKeyitme) minKeyitme = kf.t;
                });
                hasAnimatedSelector = true;
            }
            // Check Range Selector Start/End if animated? Usually Offset is used for "write-on"
        });

        if (hasAnimatedSelector && minKeyitme !== Infinity) {
            // If the layer starts significantly earlier than the animation, 
            // clamp the layer start to the animation start.
            // Using minKeyitme directly, or maybe -1 frame for safety.
            // Current file: ip=6, anim=96. we want ip=96.
            if (layer.ip < minKeyitme - 5) { // Threshold to avoid micro-adjustments
                const oldIp = layer.ip;
                layer.ip = minKeyitme;
                if (!stats.ipFixes) stats.ipFixes = 0;
                stats.ipFixes++;
                // console.log(`[Fixed] Shifted Text Layer IP from ${oldIp} to ${layer.ip} to match animator.`);
            }
        }
    } catch (e) {
        console.warn('Error syncing text layer IP:', e);
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
