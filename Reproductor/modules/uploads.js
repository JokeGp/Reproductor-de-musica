import { state } from './state.js';
import { DOM } from './dom.js';
import { renderAlbums, renderTrackList, showTracksSection } from './render.js';
import { setTrack } from './controls.js';
import { formatDuration } from './utils.js';
import { showToast } from './toast.js';

// helper: ensureUploadsAlbum (internal)
export function ensureUploadsAlbum() {
    let album = state.albums.find(a => a.id === state.UPLOADS_ALBUM_ID);
    if (!album) {
        album = {
            id: state.UPLOADS_ALBUM_ID,
            title: 'Local uploads',
            artist: 'Mis archivos',
            cover: './assets/covers/local-uploads.jpg',
            tracks: []
        };
        state.albums.unshift(album);
    }
    return album;
}

// init listeners (call once)
export function initUploadListeners() {
    const uploadBtn = DOM.uploadBtn;
    const fileInput = DOM.fileInput;

    if (!uploadBtn || !fileInput) {
        console.warn('uploadBtn o fileInput no encontrados en DOM. Si querés subir archivos añade el HTML correspondiente.');
        return;
    }

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        state.shuffleState = { type: null, playlist: [], position: 0, albumId: null };
        DOM.shuffleBtn.classList.remove('active');

        const uploadsAlbum = ensureUploadsAlbum();
        const firstNewIndex = uploadsAlbum.tracks.length;

        for (const file of files) {
            if (!file.type.startsWith('audio') && !file.type.includes('mp4')) {
                console.warn('Archivo no soportado:', file.name);
                continue;
            }
            const objectUrl = URL.createObjectURL(file);
            uploadsAlbum.tracks.push({
                title: file.name.replace(/\.[^/.]+$/, ''),
                file: objectUrl,
                duration: '...'
            });
        }

        state.selectedAlbum = uploadsAlbum;
        renderAlbums();
        renderTrackList(uploadsAlbum);
        showTracksSection();

        if (uploadsAlbum.tracks[firstNewIndex]) {
            setTrack(uploadsAlbum, firstNewIndex, false);
        }

        showToast(`Se subieron ${files.length} archivo(s).`, 1500);

        files.forEach((file, idx) => {
            const trackIndex = firstNewIndex + idx;
            const tmpAudio = document.createElement('audio');
            tmpAudio.preload = 'metadata';
            const u = URL.createObjectURL(file);
            tmpAudio.src = u;
            tmpAudio.addEventListener('loadedmetadata', () => {
                uploadsAlbum.tracks[trackIndex].duration = formatDuration(tmpAudio.duration);
                URL.revokeObjectURL(u);
                if (state.selectedAlbum && state.selectedAlbum.id === uploadsAlbum.id) renderTrackList(uploadsAlbum);
            }, { once: true });
            tmpAudio.addEventListener('error', () => {
                uploadsAlbum.tracks[trackIndex].duration = '0:00';
                if (state.selectedAlbum && state.selectedAlbum.id === uploadsAlbum.id) renderTrackList(uploadsAlbum);
            }, { once: true });
        });

        fileInput.value = '';
    });
}
