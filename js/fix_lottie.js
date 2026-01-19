const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2] || 'lottie.json';
const outputFile = process.argv[3] || 'lottie_fixed.json';

try {
    if (!fs.existsSync(inputFile)) {
        console.error(`File not found: ${inputFile}`);
        process.exit(1);
    }
    const rawData = fs.readFileSync(inputFile);
    let animation = JSON.parse(rawData);

    console.log(`Fixing: ${inputFile} -> ${outputFile}`);
    let fixesCount = {
        expressions: 0,
        effectsRemoved: 0,
        mergePathsRemoved: 0,
        fillFixes: 0
    };

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

        console.log(`  [Fixed] Timeline shifted by ${shiftAmount} frames to start at 0.`);
    }

    // Helper to update Text Layer IP based on Animator start
    function syncTextLayerIP(layer) {
        if (layer.ty !== 5 || !layer.t || !layer.t.a) return;
        try {
            let minKeyTime = Infinity;
            let hasAnimatedSelector = false;

            layer.t.a.forEach(animator => {
                if (animator.s) {
                    // Check Offset (o), Start (s), End (e) for animation keys
                    ['o', 's', 'e'].forEach(prop => {
                        if (animator.s[prop] && animator.s[prop].a === 1 && animator.s[prop].k && Array.isArray(animator.s[prop].k)) {
                            animator.s[prop].k.forEach(kf => {
                                if (kf.t !== undefined && kf.t < minKeyTime) minKeyTime = kf.t;
                            });
                            hasAnimatedSelector = true;
                        }
                    });
                }
            });

            if (hasAnimatedSelector && minKeyTime !== Infinity) {
                // Buffer: If IP is significantly earlier (more than 5 frames), shift it.
                if (layer.ip < minKeyTime - 1) { // Tighten buffer from 5 to 1
                    console.log(`  [Fixed] Shifted Text Layer "${layer.nm}" IP from ${layer.ip} to ${minKeyTime} to match animator.`);
                    layer.ip = minKeyTime;
                }
            }
        } catch (e) { console.warn('Error syncing IP:', e); }
    }

    // Helper to traverse and fix
    function fixLayer(layer, pathVal = '') {
        const layerName = layer.nm || 'Unnamed Layer';

        // 1. Clean Expressions
        // Recursive function to remove 'x' keys from properties
        function removeExpressions(obj) {
            if (!obj || typeof obj !== 'object') return;

            // If it's a property object with both 'k' and 'x', remove 'x'
            if (obj.hasOwnProperty('k') && obj.hasOwnProperty('x')) {
                delete obj.x;
                fixesCount.expressions++;
            }

            Object.keys(obj).forEach(key => {
                removeExpressions(obj[key]);
            });
        }

        // Apply expression cleaning to transform strings and other likely places
        if (layer.ks) removeExpressions(layer.ks);
        // Also check effects and shapes for nested expressions
        if (layer.ef) removeExpressions(layer.ef);
        if (layer.shapes) removeExpressions(layer.shapes);

        // Fix Text Layer (RN Black Letters Issue)
        if (layer.ty === 5 && layer.t && layer.t.d) {
            try {
                const textDoc = layer.t.d;
                const firstKeyframe = textDoc.k ? (Array.isArray(textDoc.k) ? textDoc.k[0] : textDoc) : null;
                if (firstKeyframe && firstKeyframe.s) {
                    const fillColor = firstKeyframe.s.fc;
                    if (fillColor && layer.t.a && Array.isArray(layer.t.a)) {
                        layer.t.a.forEach(animator => {
                            if (!animator.s) animator.s = {};
                            // 1. Fix Fill Color
                            if (animator.a && !animator.a.fc) {
                                animator.a.fc = { a: 0, k: fillColor, ix: 0 };
                                console.log(`  [Fixed] Injected Fill Color into Text Animator in "${layerName}"`);
                            }
                            // 2. Fix Range Selector Units & Offset
                            if (animator.s && animator.s.o && animator.s.o.a === 1 && animator.s.o.k) {
                                // A: Fix Units (Convert to Percentage)
                                let endVal = 100;
                                if (animator.s.e && typeof animator.s.e.k === 'number') endVal = animator.s.e.k;

                                if (endVal < 50 && endVal > 0) {
                                    const scaleFactor = 100 / endVal;

                                    // 1. Force Properties
                                    animator.s.rn = 0;
                                    animator.s.sh = 1;
                                    if (!animator.s.e) animator.s.e = {};
                                    animator.s.e.a = 0;
                                    animator.s.e.k = 100;

                                    // 2. Timing
                                    let times = [];
                                    if (animator.s.o.k && Array.isArray(animator.s.o.k)) {
                                        const first = animator.s.o.k[0];
                                        const last = animator.s.o.k[animator.s.o.k.length - 1];
                                        if (first && typeof first.t === 'number') times.push(first.t);
                                        if (last && typeof last.t === 'number' && last !== first) times.push(last.t);
                                    }
                                    if (times.length < 2) times = [layer.ip, layer.ip + 60];

                                    // 3. Create Start Animation
                                    animator.s.s = {
                                        a: 1, ix: 4,
                                        k: [
                                            { t: times[0], s: [0], i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] } },
                                            { t: times[1], s: [100] }
                                        ]
                                    };

                                    // 4. Kill Offset
                                    animator.s.o = { a: 0, k: 0, ix: 6 };

                                    console.log(`  [Fixed] Rewrote Range Selector to Standard Start Wipe (0->100%) in "${layerName}"`);
                                }
                                // B: Negative Offset - Removed due to overwrite
                            }
                        });
                    }
                }
            } catch (e) {
                console.warn(`  [Warn] Failed to fix text layer "${layerName}"`, e);
            }

            // 3. Inject Global Color Polyfill (Fix Base Color Black Bug)
            // RN defaults unselected text to Black. We need an animator that Keeps it White.
            try {
                if (!layer.t.a) layer.t.a = [];
                const hasPolyfill = layer.t.a.find(a => a.nm === 'Color Polyfill');
                if (!hasPolyfill) {
                    const polyfill = {
                        "nm": "Color Polyfill",
                        "s": {
                            "t": 0, "xe": { "k": 0 }, "ne": { "k": 100 }, "a": { "k": 100 },
                            "b": 1, // Characters
                            "rn": 0, // Percent
                            "sh": 1, // Square
                            "sm": { "k": 100 },
                            "s": { "k": 0 }, // Start 0%
                            "e": { "k": 100 }, // End 100%
                            "o": { "k": 0 } // Offset 0
                        },
                        "a": {
                            "fc": { "a": 0, "k": [1, 1, 1, 1], "ix": 0 } // White
                        }
                    };
                    // Add to START of list so it acts as base
                    layer.t.a.unshift(polyfill);
                    console.log(`  [Fixed] Injected 'Color Polyfill' Animator into "${layerName}"`);
                }
            } catch (e) {
                console.warn(`  [Warn] Failed to inject polyfill "${layerName}"`, e);
            }

            syncTextLayerIP(layer);
        }


        // 2. Process Effects (specifically Fill)
        if (layer.ef && layer.ef.length > 0) {
            const newEffects = [];
            layer.ef.forEach(effect => {
                // Effect Type 21 is Fill? Or check matchName/nm
                // Verify Effect: "Fill" usually has ty: 21 or string match
                const isFillEffect = effect.nm && effect.nm.toLowerCase().includes('fill');

                if (isFillEffect) {
                    // Try to find the color value
                    // Fill effect structure usually: ef -> [ { nm: "Color", v: { k: [r,g,b,a] } } ] 
                    const colorProp = effect.ef ? effect.ef.find(p => p.nm === 'Color') : null;

                    if (colorProp && colorProp.v) {
                        try {
                            const params = { color: colorProp.v };
                            if (applyColorToShape(layer.shapes, params.color)) {
                                console.log(`  [Fixed] Applied Effect Fill color to Shape in "${layerName}"`);
                                fixesCount.fillFixes++;
                                fixesCount.effectsRemoved++;
                                return; // Do not add this effect back (remove it)
                            }
                        } catch (e) {
                            console.warn(`  [Warn] Failed to apply fill color in "${layerName}"`, e);
                        }
                    }
                    console.log(`  [Removed] Removing unsupported Fill effect from "${layerName}" without applying (could not map)`);
                    fixesCount.effectsRemoved++;
                } else {
                    newEffects.push(effect);
                }
            });
            layer.ef = newEffects;
        }

        // 3. Process Shapes (Merge Paths)
        if (layer.shapes) {
            layer.shapes = filterShapes(layer.shapes, layerName);
        }
    }

    function applyColorToShape(shapes, colorValue) {
        if (!shapes) return false;
        let applied = false;

        for (const shape of shapes) {
            if (shape.ty === 'fl') { // Fill shape
                // shape.c is color
                shape.c = colorValue;
                applied = true;
                // Don't break, might want to apply to all fills in the group? 
                // Usually one main fill per group. Let's stop after first one to be safe or keep going?
                // Let's keep going if there are multiple geometries.
            }
            if (shape.it) { // Group
                if (applyColorToShape(shape.it, colorValue)) {
                    applied = true;
                }
            }
        }
        return applied;
    }

    function filterShapes(shapes, layerName) {
        return shapes.filter(shape => {
            if (shape.ty === 'mm') { // Merge Paths
                console.log(`  [Fixed] Removed Merge Paths from "${layerName}"`);
                fixesCount.mergePathsRemoved++;
                return false;
            }

            if (shape.it) { // Recursive for groups
                shape.it = filterShapes(shape.it, layerName);
            }
            return true;
        });
    }

    // Traverse layers
    if (animation.layers) {
        animation.layers.forEach(l => fixLayer(l));
    }

    // Traverse Assets (Precomps)
    if (animation.assets) {
        animation.assets.forEach(asset => {
            if (asset.layers) {
                asset.layers.forEach(l => fixLayer(l, `Asset ${asset.id}`));
            }
        });
    }

    // Write output
    fs.writeFileSync(outputFile, JSON.stringify(animation, null, 2));

    console.log('---');
    console.log('Fixing Complete.');
    console.log(`Expressions Removed: ${fixesCount.expressions}`);
    console.log(`Fill Effects Fixed/Removed: ${fixesCount.fillFixes}/${fixesCount.effectsRemoved}`);
    console.log(`Merge Paths Removed: ${fixesCount.mergePathsRemoved}`);
    console.log(`Saved to: ${outputFile}`);

} catch (e) {
    console.error('Error fixing file:', e);
}
