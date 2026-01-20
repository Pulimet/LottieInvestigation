import { state } from './state.js';
import { detectLayerColor, updateLayerColor } from './layers_color.js';

export function renderLayersList(layers) {
    const layersList = document.getElementById('layers-list');
    const layerCount = document.getElementById('layer-count');

    layersList.innerHTML = '';
    if (!layers || layers.length === 0) {
        layersList.innerHTML = '<div class="no-layers-msg">No layers found</div>';
        layerCount.textContent = '0';
        return;
    }

    // Build Asset Map for Precomps
    const assetMap = {};
    if (state.currentAnimationData && state.currentAnimationData.assets) {
        state.currentAnimationData.assets.forEach(asset => {
            assetMap[asset.id] = asset.layers;
        });
    }

    let totalRenderedCount = 0;

    function renderGroup(layerGroup, container, level, hierarchyPath = []) {
        if (!layerGroup) return;

        layerGroup.forEach((layer, index) => {
            totalRenderedCount++;
            const item = document.createElement('div');
            item.className = 'layer-item';
            // Store a way to ID this layer? simple index isn't enough for nested.
            // We'll keep passing the object reference to the toggle function.

            // Construct current path: Parent Path + Current Layer Index
            const currentPath = [...hierarchyPath, layer.ind];

            // Indentation
            const paddingLeft = 12 + (level * 20); // Base 12px + 20px per level
            item.style.paddingLeft = `${paddingLeft}px`;

            let iconPath = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z';
            let typeName = 'Data';
            switch (layer.ty) {
                case 0: iconPath = 'M4 6H20V18H4z'; typeName = 'Precomp'; break;
                case 1: iconPath = 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z'; typeName = 'Solid'; break;
                case 2: iconPath = 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'; typeName = 'Image'; break;
                case 3: iconPath = 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z'; typeName = 'Null'; break;
                case 4: iconPath = 'M12 2L2 22H22L12 2z'; typeName = 'Shape'; break;
                case 5: iconPath = 'M5 4v3h5.5v12h3V7H19V4z'; typeName = 'Text'; break;
            }

            let colorInputHtml = '';
            if (layer.ty === 4 || layer.ty === 5 || layer.ty === 0 || layer.ty === 1) {
                const initialColor = detectLayerColor(layer, state.currentAnimationData) || '#ffffff';
                colorInputHtml = `<input type="color" class="layer-color-picker" value="${initialColor}" title="Current: ${initialColor}">`;
            }

            const isHidden = layer.hd === true;
            item.innerHTML = `
                <svg class="layer-type-icon" viewBox="0 0 24 24" fill="currentColor" title="${typeName}"><path d="${iconPath}"/></svg>
                <span class="layer-name" title="${layer.nm || typeName}">${layer.nm || typeName}</span>
                ${colorInputHtml}
                <button class="visibility-btn" title="Toggle Visibility">${getEyeIcon(!isHidden)}</button>
            `;

            if (isHidden) item.classList.add('hidden-layer');

            item.querySelector('.visibility-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleLayerVisibility(layer, item, currentPath);
            });

            const colorInput = item.querySelector('.layer-color-picker');
            if (colorInput) {
                colorInput.addEventListener('input', (e) => {
                    e.stopPropagation();
                    updateLayerColor(layer, e.target.value, currentPath);
                });
            }
            container.appendChild(item);

            // Recursion for Precomps
            if (layer.ty === 0 && layer.refId && assetMap[layer.refId]) {
                renderGroup(assetMap[layer.refId], container, level + 1, currentPath);
            }
        });
    }

    renderGroup(layers, layersList, 0);
    layerCount.textContent = totalRenderedCount;
}

function getEyeIcon(visible) {
    return visible
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.94 17.94l-1.41 1.41-2.07-2.07c-1.42.64-3.03.96-4.96.96-4.65 0-8.65-3.26-10.5-7.5 1.15-2.64 3.39-4.78 6.09-5.96L3.06 2.73 4.47 1.32 17.94 17.94zM12 7c.2 0 .4.02.6.05L6.68 12.97c-.02-.19-.05-.39-.05-.6 0-2.92 2.7-5.32 5.37-5.37zM12 17c-1.12 0-2.16-.36-3.03-.97l2.45-2.45c.19.01.38.02.58.02 2.76 0 5-2.24 5-5 0-.2-.01-.39-.02-.58l2.45-2.45c.61.87.97 1.91.97 3.03 0 4.65-4.01 7.4-8.4 7.4z"/></svg>';
}

export function toggleLayerVisibility(layerData, itemElement, hierarchyPath) {
    if (!state.animation || !state.animation.renderer || !state.animation.renderer.elements) {
        console.warn('Animation state not ready for visibility toggle');
        return;
    }

    // New Helper: Traverse by path to strictly find the correct instance
    function findRenderElementByPath(elements, path) {
        if (!elements || path.length === 0) return null;
        const currentInd = path[0];

        // Find the element at this level matching the index
        let match = null;
        for (let i = 0; i < elements.length; i++) {
            if (elements[i] && elements[i].data && elements[i].data.ind === currentInd) {
                match = elements[i];
                break;
            }
        }

        if (!match) return null;

        // If we are at the end of the path, we found it
        if (path.length === 1) return match;

        // Otherwise, recurse if it has sub-elements (Precomp)
        if (match.elements) {
            return findRenderElementByPath(match.elements, path.slice(1));
        }

        return null;
    }

    // Use hierarchyPath if provided to find the exact render element
    let renderElement = null;
    if (hierarchyPath && hierarchyPath.length > 0) {
        renderElement = findRenderElementByPath(state.animation.renderer.elements, hierarchyPath);
    } else {
        // Fallback for top-level if path missing
        renderElement = findRenderElementByPath(state.animation.renderer.elements, [layerData.ind]);
    }

    if (!renderElement) {
        console.warn('RenderElement not found for:', layerData.nm, 'Path:', hierarchyPath);
        // We will still update the logical state (JSON) so it saves correctly
    } else {
        console.log('Toggling visibility for:', layerData.nm, 'Path:', hierarchyPath);
    }

    let isNowHidden = false;
    const wasHidden = itemElement.classList.contains('hidden-layer');

    // 1. Try Native Methods / DOM update if element found
    if (renderElement) {
        if (typeof renderElement.hide === 'function' && typeof renderElement.show === 'function') {
            wasHidden ? renderElement.show() : renderElement.hide();
        }

        // Force DOM update
        if (renderElement.layerElement) {
            const el = renderElement.layerElement;
            if (wasHidden) {
                el.style.display = 'block';
                el.style.opacity = '1';
                if (el.removeAttribute) el.removeAttribute('display');
                isNowHidden = false;
            } else {
                el.style.display = 'none';
                el.style.opacity = '0';
                isNowHidden = true;
            }
        } else {
            isNowHidden = !wasHidden;
        }
    } else {
        // Fallback or just logical processing
        isNowHidden = !wasHidden;
    }

    if (!state.isPlaying && state.animation) state.animation.renderer.renderFrame(null);

    // Update JSON model (layerData is the reference)
    layerData.hd = isNowHidden;

    // Update UI
    const btn = itemElement.querySelector('.visibility-btn');
    if (isNowHidden) { itemElement.classList.add('hidden-layer'); btn.innerHTML = getEyeIcon(false); }
    else { itemElement.classList.remove('hidden-layer'); btn.innerHTML = getEyeIcon(true); }
}
