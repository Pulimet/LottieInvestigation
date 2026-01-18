document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const emptyState = document.getElementById('empty-state');
    const playerContainer = document.getElementById('lottie-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const scrubber = document.getElementById('scrubber');
    const frameDisplay = document.getElementById('frame-display');
    const speedBtns = document.querySelectorAll('.speed-btn');
    const bgBtns = document.querySelectorAll('.bg-btn');
    const metaVersion = document.getElementById('meta-version');
    const metaFps = document.getElementById('meta-fps');
    const metaDims = document.getElementById('meta-dims');
    const layersList = document.getElementById('layers-list');
    const layerCount = document.getElementById('layer-count');

    // State
    let animation = null;
    let isPlaying = false;
    let totalFrames = 0;
    let isDraggingScrubber = false;
    let currentAnimationData = null;
    let currentFileName = 'lottie.json';

    // File Browser Logic
    // Uses window.LOTTIE_FILES populated by js/files_bundle.js

    const fileListElement = document.getElementById('file-list');

    function renderFileList() {
        if (!fileListElement) return;

        fileListElement.innerHTML = '';

        // Check if bundle exists
        if (!window.LOTTIE_FILES) {
            fileListElement.innerHTML = '<div style="padding:10px; color:red">No files loaded (bundle missing)</div>';
            return;
        }

        const files = Object.keys(window.LOTTIE_FILES);

        files.forEach(filename => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.textContent = filename;

            if (filename === currentFileName) {
                item.classList.add('active');
            }

            item.addEventListener('click', () => {
                loadJsonFile(filename);
            });

            fileListElement.appendChild(item);
        });
    }

    function loadJsonFile(filename) {
        if (!window.LOTTIE_FILES || !window.LOTTIE_FILES[filename]) {
            alert('File not found in bundle');
            return;
        }

        // Update UI
        currentFileName = filename;
        document.querySelectorAll('.file-item').forEach(el => {
            el.classList.toggle('active', el.textContent === filename);
        });

        // Load Data (Synchronous)
        try {
            const data = window.LOTTIE_FILES[filename];
            // Clone data to avoid mutating the original bundle reference during edits
            currentAnimationData = JSON.parse(JSON.stringify(data));
            initLottie(currentAnimationData);
        } catch (err) {
            console.error('Error loading file:', err);
            alert(`Error loading ${filename}: ${err.message}`);
        }
    }

    // Initialize File List
    renderFileList();


    // --- Drag & Drop ---

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    dropZone.addEventListener('dragenter', highlight, false);
    dropZone.addEventListener('dragover', highlight, false);
    dropZone.addEventListener('dragleave', unhighlight, false);
    dropZone.addEventListener('drop', handleDrop, false);

    function highlight() {
        dropZone.classList.add('drag-over');
    }

    function unhighlight() {
        dropZone.classList.remove('drag-over');
    }

    function handleDrop(e) {
        unhighlight();
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    // --- File Input ---

    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', function () {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                currentFileName = file.name;
                loadLottieFile(file);
            } else {
                alert('Please upload a valid JSON file.');
            }
        }
    }

    function loadLottieFile(file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const animationData = JSON.parse(e.target.result);
                currentAnimationData = animationData; // Store for reference
                initLottie(animationData);
            } catch (err) {
                console.error('Error parsing JSON:', err);
                alert('Error parsing JSON file. Please check if it is a valid Lottie file.');
            }
        };
        reader.readAsText(file);
    }

    // --- Lottie Player ---

    function initLottie(animationData) {
        // Cleanup existing
        if (animation) {
            animation.destroy();
        }

        emptyState.classList.add('hidden');
        playerContainer.innerHTML = '';

        // Initialize Lottie
        animation = lottie.loadAnimation({
            container: playerContainer,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData: JSON.parse(JSON.stringify(animationData)) // Deep copy to prevent mutation issues if we reload
        });

        isPlaying = true;
        updatePlayPauseIcon();

        // Metadata
        updateMetadata(animationData);

        // Layers
        renderLayersList(animationData.layers);

        // Events
        animation.addEventListener('DOMLoaded', () => {
            totalFrames = animation.totalFrames;
            scrubber.max = totalFrames;
            scrubber.value = 0;
            updateFrameDisplay();

            // Map renderer elements to layers for toggling
            // setTimeout to ensure SVG is fully composed if needed, though DOMLoaded should be enough
        });

        // Frame Loop for scrubber update
        // Using requestAnimationFrame to sync scrubber with animation
        const updateScrubberLoop = () => {
            if (animation && isPlaying && !isDraggingScrubber) {
                scrubber.value = animation.currentFrame;
                updateFrameDisplay();
            }
            requestAnimationFrame(updateScrubberLoop);
        };
        requestAnimationFrame(updateScrubberLoop);

        // ... (keep scrubber loop) ...
    }

    // --- Layers Logic ---

    function renderLayersList(layers) {
        layersList.innerHTML = '';
        if (!layers || layers.length === 0) {
            layersList.innerHTML = '<div class="no-layers-msg">No layers found</div>';
            layerCount.textContent = '0';
            return;
        }

        layerCount.textContent = layers.length;

        layers.forEach((layer, index) => {
            const item = document.createElement('div');
            item.className = 'layer-item';
            item.dataset.index = index;

            // Icons based on type (ty): 0: Precomp, 1: Solid, 2: Image, 3: Null, 4: Shape, 5: Text
            let iconPath = '';
            switch (layer.ty) {
                case 0: iconPath = 'M4 6H20V18H4z'; break; // Rect (Precomp)
                case 4: iconPath = 'M12 2L2 22H22L12 2z'; break; // Triangle (Shape)
                case 2: iconPath = 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'; break; // Image
                case 5: iconPath = 'M5 4v3h5.5v12h3V7H19V4z'; break; // Text
                case 3: iconPath = 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z'; break; // Null (Cross/Box)
                default: iconPath = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'; // Info/Circle
            }

            const isHidden = layer.hd === true;

            // NEW: Color logic
            let colorInputHtml = '';
            // Only add color picker for Shape Layers (ty=4) or Text Layers (ty=5)
            if (layer.ty === 4 || layer.ty === 5) {
                colorInputHtml = `<input type="color" class="layer-color-picker" value="#ffffff" title="Change Color">`;
            }

            item.innerHTML = `
                <svg class="layer-type-icon" viewBox="0 0 24 24" fill="currentColor"><path d="${iconPath}"/></svg>
                <span class="layer-name" title="${layer.nm || 'Unnamed Layer'}">${layer.nm || 'Unnamed Layer'}</span>
                ${colorInputHtml}
                <button class="visibility-btn" title="Toggle Visibility">
                    ${getEyeIcon(!isHidden)}
                </button>
            `;

            if (isHidden) {
                item.classList.add('hidden-layer');
            }

            // Toggle Handler
            const toggleBtn = item.querySelector('.visibility-btn');
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleLayerVisibility(layer, item);
            });

            // Color Handler
            const colorInput = item.querySelector('.layer-color-picker');
            if (colorInput) {
                colorInput.addEventListener('input', (e) => {
                    e.stopPropagation();
                    updateLayerColor(layer, e.target.value);
                });
                // Try to detect initial color? (Advanced, skipping for now, default is white/black)
            }

            layersList.appendChild(item);
        });
    }

    function getEyeIcon(visible) {
        if (visible) {
            return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
        } else {
            return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.94 17.94l-1.41 1.41-2.07-2.07c-1.42.64-3.03.96-4.96.96-4.65 0-8.65-3.26-10.5-7.5 1.15-2.64 3.39-4.78 6.09-5.96L3.06 2.73 4.47 1.32 17.94 17.94zM12 7c.2 0 .4.02.6.05L6.68 12.97c-.02-.19-.05-.39-.05-.6 0-2.92 2.7-5.32 5.37-5.37zM12 17c-1.12 0-2.16-.36-3.03-.97l2.45-2.45c.19.01.38.02.58.02 2.76 0 5-2.24 5-5 0-.2-.01-.39-.02-.58l2.45-2.45c.61.87.97 1.91.97 3.03 0 4.65-4.01 7.4-8.4 7.4z"/></svg>';
        }
    }

    function updateLayerColor(layerData, color) {
        if (!animation || !animation.renderer || !animation.renderer.elements) return;

        // Find the render element
        let renderElement = null;
        for (let i = 0; i < animation.renderer.elements.length; i++) {
            const el = animation.renderer.elements[i];
            if (el && el.data && el.data.ind === layerData.ind) {
                renderElement = el;
                break;
            }
        }

        if (!renderElement || !renderElement.layerElement) {
            console.warn('Render element or DOM node not found for layer color update.');
            return;
        }

        // Apply color to SVG paths
        // This is a "brute force" tint. It updates fill and stroke.
        // For more precision, we'd need to parse the shapes.
        const layerGroup = renderElement.layerElement;
        const paths = layerGroup.querySelectorAll('path, g, text');

        paths.forEach(p => {
            // Check if it has a fill or stroke style/attribute before overriding
            // Or just force it. forcing is easiest for "tint this layer".

            // Note: Lottie maps "Fill" to 'fill' attribute or style.
            // We set it on the style to override attributes.
            if (getComputedStyle(p).fill !== 'none') {
                p.style.fill = color;
            }
            if (getComputedStyle(p).stroke !== 'none') {
                p.style.stroke = color;
            }
        });

        // Also try to set on the group itself if it has properties
        if (layerGroup.style) {
            // layerGroup.style.fill = color; // usually paths handle it
        }

        console.log(`Updated color for layer ${layerData.nm} to ${color}`);

        // Update JSON Data
        if (currentAnimationData) {
            const jsonLayer = currentAnimationData.layers.find(l => l.ind === layerData.ind);
            if (jsonLayer) {
                const lottieColor = hexToLottieColor(color);

                // 1. Text Layers
                if (jsonLayer.ty === 5 && jsonLayer.t && jsonLayer.t.d) {
                    // Provide support for text docs
                    const docs = jsonLayer.t.d.k;
                    // k can be array of keyframes or just values. usually array.
                    if (Array.isArray(docs)) {
                        docs.forEach(frame => {
                            if (frame.s) {
                                frame.s.fc = [...lottieColor, 1]; // Fill
                                frame.s.sc = [...lottieColor, 1]; // Stroke
                                frame.s.sw = 0; // Ensure stroke width is handled if needed
                            }
                        });
                    }
                }

                // 2. Shape Layers (Recursive)
                if (jsonLayer.shapes) {
                    updateShapesColor(jsonLayer.shapes, lottieColor);
                }
            }
        }
    }

    function updateShapesColor(shapes, rgbColor) {
        shapes.forEach(shape => {
            if (shape.ty === 'fl' || shape.ty === 'st') { // Fill or Stroke
                if (shape.c) {
                    // Update k value. remove x (expression) if present to be safe
                    shape.c.k = [...rgbColor, 1];
                    delete shape.c.x;
                }
            }
            if (shape.it) {
                updateShapesColor(shape.it, rgbColor);
            }
        });
    }

    function toggleLayerVisibility(layerData, itemElement) {
        if (!animation || !animation.renderer || !animation.renderer.elements) {
            console.warn('Animation or renderer not ready.');
            return;
        }

        // Find the render element that matches this layer (by ind)
        let renderElement = null;
        for (let i = 0; i < animation.renderer.elements.length; i++) {
            const el = animation.renderer.elements[i];
            if (el && el.data && el.data.ind === layerData.ind) {
                renderElement = el;
                break;
            }
        }

        if (!renderElement) {
            console.warn(`Render element not found for layer: ${layerData.nm} (ind: ${layerData.ind})`);
            return;
        }

        console.log(`Toggling layer: ${layerData.nm}`, renderElement);

        let isNowHidden = false;
        const wasHidden = itemElement.classList.contains('hidden-layer');

        // 1. Try lottie-web's native hide/show methods
        if (typeof renderElement.hide === 'function' && typeof renderElement.show === 'function') {
            if (wasHidden) {
                renderElement.show();
                isNowHidden = false;
            } else {
                renderElement.hide();
                isNowHidden = true;
            }
        }

        // 2. Direct DOM manipulation as fallback
        if (renderElement.layerElement) {
            const el = renderElement.layerElement;
            if (wasHidden) {
                if (el.style) {
                    el.style.opacity = '1';
                    el.style.display = 'block';
                }
                if (el.removeAttribute) el.removeAttribute('display');
                isNowHidden = false;
            } else {
                // If native hide didn't update internal state or DOM effectively
                if (el.style) {
                    el.style.opacity = '0';
                    el.style.display = 'none';
                }
                isNowHidden = true;
            }
        } else if (!renderElement.hide) {
            // If no native method and no DOM element, just toggle state
            isNowHidden = !wasHidden;
        }

        // Force a redraw
        if (!isPlaying && animation) {
            try {
                animation.renderer.renderFrame(null);
            } catch (e) { console.error('Error rendering frame:', e); }
        }

        // Update JSON Data
        if (currentAnimationData) {
            const jsonLayer = currentAnimationData.layers.find(l => l.ind === layerData.ind);
            if (jsonLayer) {
                jsonLayer.hd = isNowHidden;
            }
        }

        // Update UI
        const btn = itemElement.querySelector('.visibility-btn');
        if (isNowHidden) {
            itemElement.classList.add('hidden-layer');
            btn.innerHTML = getEyeIcon(false);
        } else {
            itemElement.classList.remove('hidden-layer');
            btn.innerHTML = getEyeIcon(true);
        }
    }

    // --- Controls --- (Rest remains similar, ensure functions don't overlap)

    // --- Controls ---

    playPauseBtn.addEventListener('click', togglePlay);

    function togglePlay() {
        if (!animation) return;
        if (isPlaying) {
            animation.pause();
        } else {
            animation.play();
        }
        isPlaying = !isPlaying;
        updatePlayPauseIcon();
    }

    function updatePlayPauseIcon() {
        if (isPlaying) {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        } else {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        }
    }

    // Scrubber
    scrubber.addEventListener('input', (e) => {
        if (!animation) return;
        isDraggingScrubber = true;
        const frame = parseFloat(e.target.value);
        animation.goToAndStop(frame, true);
        isPlaying = false; // Pause while scrubbing
        updatePlayPauseIcon();
        updateFrameDisplay();
    });

    scrubber.addEventListener('change', () => {
        isDraggingScrubber = false;
        // Optionally resume play if it was playing before? For now leave paused basically.
    });

    function updateFrameDisplay() {
        if (!animation) return;
        const current = Math.round(animation.currentFrame);
        const total = Math.round(totalFrames);
        frameDisplay.textContent = `${current} / ${total}`;
    }

    // Speed
    speedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!animation) return;
            // UI
            speedBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Logic
            const speed = parseFloat(btn.dataset.speed);
            animation.setSpeed(speed);
        });
    });

    // Background
    bgBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI
            bgBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Logic
            const color = btn.dataset.bg;
            dropZone.style.backgroundColor = color;
            dropZone.style.backgroundImage = color === 'transparent' ? '' : 'none'; // logic handled in CSS class mostly for transparent pattern

            if (color === 'transparent') {
                // The CSS class logic handles the pattern, we just need to unset solid color
                dropZone.style.backgroundColor = 'transparent';
                // We might need a class update instead of inline style for cleaner code, but inline works for solid colors.
                // Re-applying the CSS class logic:
                dropZone.className = 'viewer-container'; // reset
                // Since I used inline style 'backgroundColor' logic in CSS, let's just rely on the 'transparent' class if I had one, 
                // but better: 
                if (btn.classList.contains('transparent')) {
                    dropZone.style.background = 'none'; // clear solid
                    dropZone.classList.add('bg-transparent-pattern'); // Add a utility class if needed, OR just use the CSS variables I defined earlier? 
                    // Actually looking at style.css, I didn't make a utility class for the container pattern. 
                    // Let's manually apply the gradient for now as it's simplest.
                    dropZone.style.backgroundImage = `
                        linear-gradient(45deg, #333 25%, transparent 25%), 
                        linear-gradient(-45deg, #333 25%, transparent 25%), 
                        linear-gradient(45deg, transparent 75%, #333 75%), 
                        linear-gradient(-45deg, transparent 75%, #333 75%)`;
                    dropZone.style.backgroundSize = "20px 20px";
                    dropZone.style.backgroundPosition = "0 0, 0 10px, 10px -10px, -10px 0px";
                } else {
                    dropZone.style.backgroundImage = 'none';
                    dropZone.style.backgroundColor = color;
                }
            } else {
                dropZone.style.backgroundImage = 'none';
                dropZone.style.backgroundColor = color;
            }
        });
    });

    function updateMetadata(data) {
        metaVersion.textContent = data.v || '-';
        metaFps.textContent = data.fr ? Math.round(data.fr) : '-';
        metaDims.textContent = (data.w && data.h) ? `${data.w} x ${data.h}` : '-';
    }

    // --- Export Logic ---

    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.addEventListener('click', downloadExport);

    function downloadExport() {
        if (!currentAnimationData) {
            alert('No animation loaded.');
            return;
        }

        const dataStr = JSON.stringify(currentAnimationData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const exportName = currentFileName.toLowerCase().endsWith('.json')
            ? currentFileName.replace(/\.json$/i, '_exported.json')
            : `${currentFileName}_exported.json`;

        console.log(`Starting download for: ${exportName}`);

        const a = document.createElement('a');
        a.href = url;
        a.download = exportName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function hexToLottieColor(hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, (m, r, g, b) => {
            return r + r + g + g + b + b;
        });

        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : [1, 1, 1]; // Default white
    }

    // Ensure we expose these helpers or integrate them into existing functions
    // We need to override/hook into updateLayerColor and toggleLayerVisibility to update currentAnimationData

    // Hooking into existing functions by redefining them or adding the logic there.
    // Since I'm appending this code or replacing blocks, best to integrate in the original function definitions.
    // However, the tool replaces blocks. I will update the definitions in place below.

    // --- Analysis Logic ---

    const analyzeBtn = document.getElementById('analyze-btn');
    const analysisPanel = document.getElementById('analysis-panel');
    const analysisResults = document.getElementById('analysis-results');

    analyzeBtn.addEventListener('click', runAnalysis);

    function runAnalysis() {
        if (!currentAnimationData) {
            alert('No animation loaded.');
            return;
        }

        analysisResults.innerHTML = '';
        analysisPanel.classList.remove('hidden');

        const issues = analyzeAnimation(currentAnimationData);
        renderAnalysisReport(issues);
    }

    function analyzeAnimation(animation) {
        const issues = [];

        // Check Assets
        if (animation.assets) {
            const imageAssets = animation.assets.filter(a => a.p && (a.p.includes('.png') || a.p.includes('.jpg') || a.p.includes('data:image')));
            if (imageAssets.length > 0) {
                issues.push({
                    type: 'Assets',
                    message: `Contains ${imageAssets.length} image assets. Ensure these are bundled correctly in React Native or encoded as Base64.`,
                    severity: 'warning'
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
                    message: `Uses Track Matte (tt: ${layer.tt}). Some matte modes (especially Luma) can be problematic on Android.`,
                    severity: 'warning'
                });
            }

            // 2. 3D Layers
            if (layer.ddd) {
                issues.push({
                    type: '3D Layer',
                    layer: layerPath,
                    message: '3D Layer enabled. Partial support in React Native.',
                    severity: 'warning'
                });
            }

            // 3. Effects
            if (layer.ef && layer.ef.length > 0) {
                const effectNames = layer.ef.map(e => e.nm).join(', ');
                issues.push({
                    type: 'Effects',
                    layer: layerPath,
                    message: `Uses Effects: ${effectNames}. Most After Effects effects are NOT supported in React Native.`,
                    severity: 'error'
                });
            }

            // 4. Time Remapping
            if (layer.tm) {
                issues.push({
                    type: 'Time Remapping',
                    layer: layerPath,
                    message: 'Uses Time Remapping. May have performance or rendering issues.',
                    severity: 'warning'
                });
            }

            // 5. Blending Modes
            if (layer.bm && layer.bm !== 0) {
                issues.push({
                    type: 'Blending Mode',
                    layer: layerPath,
                    message: `Uses Blending Mode (bm: ${layer.bm}). My not be supported on all native platforms.`,
                    severity: 'warning'
                });
            }

            // 6. Layer Styles (sy)
            if (layer.sy && layer.sy.length > 0) {
                issues.push({
                    type: 'Layer Styles',
                    layer: layerPath,
                    message: 'Uses Layer Styles (Drop Shadow, Inner Glow, etc.). These are generally NOT supported.',
                    severity: 'error'
                });
            }

            // 7. Expressions (Naive check)
            const checkPropForExpression = (prop, context) => {
                if (prop && prop.x) {
                    issues.push({
                        type: 'Expression',
                        layer: layerPath,
                        message: `Uses Expression in ${context}. Expressions cause performance issues and may break if not supported by the player.`,
                        severity: 'error'
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
                    message: 'Text Layer found. Ensure fonts are loaded (Glyphs) or text is converted to shapes.',
                    severity: 'warning'
                });
            }

            // 9. Merge Paths
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
                        message: 'Uses Merge Paths. Not supported on many Android versions (requires API 19+).',
                        severity: 'error'
                    });
                }
                if (shape.it) {
                    checkShapes(shape.it, layerPath);
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

        return issues;
    }

    function renderAnalysisReport(issues) {
        if (issues.length === 0) {
            analysisResults.innerHTML = '<div class="analysis-success">✅ No critical issues found!</div>';
            return;
        }

        issues.forEach(issue => {
            const item = document.createElement('div');
            item.className = `analysis-item ${issue.severity}`;
            item.innerHTML = `
                <span class="analysis-type">[${issue.type}]</span>
                ${issue.layer ? `<span class="analysis-layer">${issue.layer}</span>` : ''}
                <span class="analysis-message">${issue.message}</span>
            `;
            analysisResults.appendChild(item);
        });
    }

});
