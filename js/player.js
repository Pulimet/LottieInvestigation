import { state } from './state.js';
import { renderLayersList } from './layers_render.js';

export function initLottie(animationData) {
    if (state.animation) state.animation.destroy();

    const container = document.getElementById('lottie-player');
    const emptyState = document.getElementById('empty-state');

    emptyState.classList.add('hidden');
    container.innerHTML = '';

    state.animation = lottie.loadAnimation({
        container: container,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: JSON.parse(JSON.stringify(animationData))
    });

    state.isPlaying = true;
    updatePlayPauseIcon();
    updateMetadata(animationData);
    renderLayersList(animationData.layers);

    const scrubber = document.getElementById('scrubber');
    const frameDisplay = document.getElementById('frame-display');

    state.animation.addEventListener('DOMLoaded', () => {
        state.totalFrames = state.animation.totalFrames;
        scrubber.max = state.totalFrames;
        scrubber.value = 0;
        updateFrameDisplay(frameDisplay);
    });

    const updateLoop = () => {
        if (state.animation && state.isPlaying && !state.isDraggingScrubber) {
            scrubber.value = state.animation.currentFrame;
            updateFrameDisplay(frameDisplay);
        }
        requestAnimationFrame(updateLoop);
    };
    requestAnimationFrame(updateLoop);
}

export function togglePlay() {
    if (!state.animation) return;
    if (state.isPlaying) state.animation.pause();
    else state.animation.play();
    state.isPlaying = !state.isPlaying;
    updatePlayPauseIcon();
}

function updatePlayPauseIcon() {
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    if (state.isPlaying) { playIcon.classList.add('hidden'); pauseIcon.classList.remove('hidden'); }
    else { playIcon.classList.remove('hidden'); pauseIcon.classList.add('hidden'); }
}

function updateMetadata(data) {
    document.getElementById('meta-version').textContent = data.v || '-';
    document.getElementById('meta-fps').textContent = data.fr ? Math.round(data.fr) : '-';
    document.getElementById('meta-dims').textContent = (data.w && data.h) ? `${data.w} x ${data.h}` : '-';
}

function updateFrameDisplay(el) {
    if (!state.animation) return;
    el.textContent = `${Math.round(state.animation.currentFrame)} / ${Math.round(state.totalFrames)}`;
}
