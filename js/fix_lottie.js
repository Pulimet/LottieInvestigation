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
                            if (animator.a && !animator.a.fc) {
                                animator.a.fc = { a: 0, k: fillColor, ix: 0 };
                                console.log(`  [Fixed] Injected Fill Color into Text Animator in "${layerName}"`);
                            }
                        });
                    }
                }
            } catch (e) {
                console.warn(`  [Warn] Failed to fix text layer "${layerName}"`, e);
            }
        }


        // 2. Process Effects (specifically Fill)
        if (layer.ef && layer.ef.length > 0) {
            const newEffects = [];
            layer.ef.forEach(effect => {
                // Effect Type 21 is Fill? Or check matchName/nm
                // Verify Effect: "Fill" usually has ty: 21 or string match
                // In Lottie, effect type is often just mapped. Let's check name.
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
