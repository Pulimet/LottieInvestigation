import { state } from './state.js';
import { fetchFileList } from './api.js';
import { setupDragAndDrop, setupFileInput } from './file_io.js';
import { togglePlay, toggleLoop } from './player.js';
import { downloadExport } from './export.js';
import { runAnalysis } from './analyze.js';
import { runAutoFix } from './fix.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup API / Files
    fetchFileList();
    document.getElementById('refresh-files-btn')?.addEventListener('click', fetchFileList);
    setupDragAndDrop();
    setupFileInput();

    // 2. Playback Controls
    document.getElementById('play-pause-btn').addEventListener('click', togglePlay);
    document.getElementById('loop-btn').addEventListener('click', toggleLoop);

    // Scrubber
    const scrubber = document.getElementById('scrubber');
    scrubber.addEventListener('input', (e) => {
        if (!state.animation) return;
        state.isDraggingScrubber = true;
        state.animation.goToAndStop(parseFloat(e.target.value), true);
        state.isPlaying = false; // pause
        // update icon? we usually rely on togglePlay state logic but here we force pause
    });
    scrubber.addEventListener('change', () => { state.isDraggingScrubber = false; });

    // Speed
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!state.animation) return;
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.animation.setSpeed(parseFloat(btn.dataset.speed));
        });
    });

    // Background
    document.querySelectorAll('.bg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const color = btn.dataset.bg;
            const dropZone = document.getElementById('drop-zone');

            if (color === 'transparent') {
                dropZone.style.background = 'none';
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
        });
    });

    // 3. Actions
    document.getElementById('download-btn').addEventListener('click', downloadExport);
    document.getElementById('analyze-btn').addEventListener('click', runAnalysis);
    document.getElementById('fix-btn')?.addEventListener('click', runAutoFix);
});
