const fs = require('fs');
const path = require('path');

const filePath = process.argv[2] || 'lottie.json';

try {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }
    const rawData = fs.readFileSync(filePath);
    const animation = JSON.parse(rawData);

    console.log(`Analyzing: ${filePath}`);
    console.log(`Version: ${animation.v}`);
    console.log(`Dimensions: ${animation.w}x${animation.h}`);
    console.log(`Frame Rate: ${animation.fr}`);
    console.log('---');

    const issues = [];

    // Check Assets (Images)
    if (animation.assets) {
        const imageAssets = animation.assets.filter(a => a.p && (a.p.includes('.png') || a.p.includes('.jpg') || a.p.includes('data:image')));
        if (imageAssets.length > 0) {
            issues.push({
                type: 'Assets',
                message: `Contains ${imageAssets.length} image assets. Ensure these are bundled correctly in React Native or encoded as Base64.`
            });
        }
    }

    // Helper to check layers
    function checkLayer(layer, path = '') {
        const layerName = layer.nm || 'Unnamed Layer';
        const layerPath = path ? `${path} > ${layerName}` : layerName;

        // 1. Track Mattes
        if (layer.tt) {
            issues.push({
                type: 'Track Matte',
                layer: layerPath,
                message: `Uses Track Matte (tt: ${layer.tt}). Some matte modes (especially Luma) can be problematic on Android.`
            });
        }

        // 2. 3D Layers
        if (layer.ddd) {
            issues.push({
                type: '3D Layer',
                layer: layerPath,
                message: '3D Layer enabled. Partial support in React Native.'
            });
        }

        // 3. Effects
        if (layer.ef && layer.ef.length > 0) {
            const effectNames = layer.ef.map(e => e.nm).join(', ');
            issues.push({
                type: 'Effects',
                layer: layerPath,
                message: `Uses Effects: ${effectNames}. Most After Effects effects are NOT supported in React Native.`
            });
        }

        // 4. Time Remapping
        if (layer.tm) {
            issues.push({
                type: 'Time Remapping',
                layer: layerPath,
                message: 'Uses Time Remapping. May have performance or rendering issues.'
            });
        }

        // 5. Blending Modes
        if (layer.bm && layer.bm !== 0) {
            issues.push({
                type: 'Blending Mode',
                layer: layerPath,
                message: `Uses Blending Mode (bm: ${layer.bm}). Many blending modes are not supported on Android/iOS.`
            });
        }

        // 6. Layer Styles
        // In Lottie, layer styles are usually inside 'sy' array? Actual spec is fuzzy on export, 
        // usually they are not exported or exported as shapes. If they exist as 'sy':
        if (layer.sy && layer.sy.length > 0) {
            issues.push({
                type: 'Layer Styles',
                layer: layerPath,
                message: 'Uses Layer Styles (Drop Shadow, Inner Glow, etc.). These are generally NOT supported.'
            });
        }

        // 7. Expressions (Naive check in transform properties)
        const checkPropForExpression = (prop, context) => {
            if (prop && prop.x) { // 'x' is expression string
                issues.push({
                    type: 'Expression',
                    layer: layerPath,
                    message: `Uses Expression in ${context}. Expressions cause performance issues and may break if not supported by the player.`
                });
            }
        };

        if (layer.ks) {
            ['o', 'r', 'p', 'a', 's'].forEach(k => checkPropForExpression(layer.ks[k], `Transform ${k}`));
        }

        // 8. Text Layers
        if (layer.ty === 5) {
            issues.push({
                type: 'Text Layer',
                layer: layerPath,
                message: 'Text Layer found. Ensure fonts are loaded (Glyphs) or text is converted to shapes.'
            });
        }

        // 9. Shapes - Merge Paths
        if (layer.shapes) {
            checkShapes(layer.shapes, layerPath);
        }
    }

    function checkShapes(shapes, layerPath) {
        shapes.forEach(shape => {
            if (shape.ty === 'mm') {
                issues.push({
                    type: 'Merge Paths',
                    layer: layerPath,
                    message: 'Uses Merge Paths. Not supported on many Android versions (requires API 19+ and enablement).'
                });
            }
            if (shape.it) {
                checkShapes(shape.it, layerPath); // Recursive
            }
        });
    }

    if (animation.layers) {
        animation.layers.forEach(l => checkLayer(l));
    }

    // Check Precomps contents
    if (animation.assets) {
        animation.assets.forEach(asset => {
            if (asset.layers) {
                asset.layers.forEach(l => checkLayer(l, `Asset (${asset.id})`));
            }
        });
    }

    // Report
    if (issues.length === 0) {
        console.log('No obvious issues found in verifyable features.');
    } else {
        console.log(`Found ${issues.length} potential issues:`);
        issues.forEach((issue, i) => {
            console.log(`${i + 1}. [${issue.type}] ${issue.layer ? `in "${issue.layer}"` : ''}: ${issue.message}`);
        });
    }

} catch (e) {
    console.error('Error analyzing file:', e);
}
