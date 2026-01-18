import { state } from './state.js';

export function runAnalysis() {
    if (!state.currentAnimationData) { alert('No animation loaded.'); return; }
    document.getElementById('analysis-results').innerHTML = '';
    document.getElementById('analysis-panel').classList.remove('hidden');
    const issues = analyzeAnimation(state.currentAnimationData);
    renderAnalysisReport(issues);
}

export function renderAnalysisReport(issues) {
    const container = document.getElementById('analysis-results');
    if (issues.length === 0) {
        container.innerHTML = '<div class="analysis-item success">✔ No critical compatibility issues found!</div>';
        return;
    }
    issues.forEach(issue => {
        const div = document.createElement('div');
        div.className = `analysis-item ${issue.severity}`;
        div.innerHTML = `<strong>${issue.type}</strong>: ${issue.message} <br><div style="font-size:0.85em; opacity:0.75; margin-top:4px">${issue.layer ? 'Layer: ' + issue.layer : ''}</div>`;
        container.appendChild(div);
    });
}

function analyzeAnimation(animation) {
    const issues = [];
    if (animation.assets) {
        const imgs = animation.assets.filter(a => a.p && (a.p.includes('.png') || a.p.includes('.jpg')));
        if (imgs.length > 0) issues.push({ type: 'Assets', message: `Contains ${imgs.length} raster images.`, severity: 'warning' });
    }

    function checkLayer(layer, path = '') {
        const lPath = path ? `${path} > ${layer.nm}` : layer.nm;
        if (layer.tt) issues.push({ type: 'Track Matte', layer: lPath, message: 'Uses Track Matte.', severity: 'warning' });
        if (layer.ddd) issues.push({ type: '3D Layer', layer: lPath, message: '3D Layer enabled.', severity: 'warning' });
        if (layer.ef && layer.ef.length > 0) issues.push({ type: 'Effects', layer: lPath, message: `Effects: ${layer.ef.map(e => e.nm).join(',')}`, severity: 'error' });
        if (layer.tm) issues.push({ type: 'Time Remapping', layer: lPath, message: 'Uses Time Remapping.', severity: 'warning' });
        if (layer.bm && layer.bm !== 0) issues.push({ type: 'Blending Mode', layer: lPath, message: `Mode ${layer.bm} used.`, severity: 'warning' });
        if (layer.sy) issues.push({ type: 'Layer Styles', layer: lPath, message: 'Uses Layer Styles.', severity: 'error' });

        if (layer.ks) ['o', 'r', 'p', 'a', 's'].forEach(k => { if (layer.ks[k] && layer.ks[k].x) issues.push({ type: 'Expression', layer: lPath, message: `Expression on ${k}`, severity: 'error' }); });

        if (layer.ty === 5) issues.push({ type: 'Text Layer', layer: lPath, message: 'Ensure fonts are handled.', severity: 'warning' });
        if (layer.shapes) checkShapes(layer.shapes, lPath);
    }

    function checkShapes(shapes, lPath) {
        shapes.forEach(img => {
            if (img.ty === 'mm') issues.push({ type: 'Merge Paths', layer: lPath, message: 'Merge Paths not supported on older Android.', severity: 'error' });
            if (img.it) checkShapes(img.it, lPath);
        });
    }

    if (animation.layers) animation.layers.forEach(l => checkLayer(l));
    if (animation.assets) animation.assets.forEach(a => { if (a.layers) a.layers.forEach(l => checkLayer(l, `Asset ${a.id}`)); });

    return issues;
}
