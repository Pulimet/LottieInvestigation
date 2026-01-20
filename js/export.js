import { state } from './state.js';

export function downloadExport() {
    if (!state.currentAnimationData) {
        alert('No animation loaded.');
        return;
    }

    const minify = document.getElementById('minify-checkbox')?.checked;
    const dataStr = minify
        ? JSON.stringify(state.currentAnimationData)
        : JSON.stringify(state.currentAnimationData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const exportName = state.currentFileName.toLowerCase().endsWith('.json')
        ? state.currentFileName.replace(/\.json$/i, '_exported.json')
        : `${state.currentFileName}_exported.json`;

    console.log(`Starting download for: ${exportName}`);

    const a = document.createElement('a');
    a.href = url;
    a.download = exportName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
}
