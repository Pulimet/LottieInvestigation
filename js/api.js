import { state } from './state.js';
import { initLottie } from './player.js';

export function fetchFileList() {
    const fileListElement = document.getElementById('file-list');
    if (!fileListElement) return;

    fileListElement.innerHTML = '<div style="padding:10px; color:#888">Loading files...</div>';

    fetch('/api/files')
        .then(response => {
            if (!response.ok) throw new Error('API Error');
            return response.json();
        })
        .then(files => {
            fileListElement.innerHTML = '';
            if (files.length === 0) {
                fileListElement.innerHTML = '<div style="padding:10px; color:#888">No files found</div>';
                return;
            }

            files.forEach(filename => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.textContent = filename;

                if (filename === state.currentFileName) {
                    item.classList.add('active');
                }

                item.addEventListener('click', () => {
                    loadJsonFile(filename);
                });

                fileListElement.appendChild(item);
            });
        })
        .catch(err => {
            console.error('Error fetching file list:', err);
            fileListElement.innerHTML = '<div style="padding:10px; color:red">Error: Run server.js</div>';
        });
}

export function loadJsonFile(filename) {
    // Update UI
    state.currentFileName = filename;
    document.querySelectorAll('.file-item').forEach(el => {
        el.classList.toggle('active', el.textContent === filename);
    });

    // Fetch File
    fetch(`json/${filename}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(data => {
            state.currentAnimationData = data;
            initLottie(data);
        })
        .catch(err => {
            console.error('Error loading file:', err);
            alert(`Error loading ${filename}: ${err.message}`);
        });
}
