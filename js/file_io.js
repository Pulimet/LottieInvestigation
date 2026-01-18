import { state } from './state.js';
import { initLottie } from './player.js';

export function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    dropZone.addEventListener('dragenter', () => dropZone.classList.add('drag-over'), false);
    dropZone.addEventListener('dragover', () => dropZone.classList.add('drag-over'), false);
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'), false);
    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        dropZone.classList.remove('drag-over');
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }
}

export function setupFileInput() {
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');

    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', function () {
        handleFiles(this.files);
    });
}

function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        if (file.type === 'application/json' || file.name.endsWith('.json')) {
            state.currentFileName = file.name;
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
            state.currentAnimationData = animationData;
            initLottie(animationData);
        } catch (err) {
            console.error('Error parsing JSON:', err);
            alert('Error parsing JSON file. Please check if it is a valid Lottie file.');
        }
    };
    reader.readAsText(file);
}
