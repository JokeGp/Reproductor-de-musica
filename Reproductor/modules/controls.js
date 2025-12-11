import { audio, sharedAnalyser } from './audio.js'; // sharedAnalyser imported indirectly if needed
import { state } from './state.js';
import { renderAlbums, renderTrackList, renderShuffleTracklist, highlightAlbum, highlightTrackInList, showTracksSection } from './render.js';
import { showToast } from './toast.js';
import { updateShufflePositionFor } from './shuffle.js';
import { DOM } from './dom.js';
import { formatTime } from './utils.js';

// play/pause toggle
export async function togglePlayPause() {
    try {
        if (audio.paused) await audio.play();
        else audio.pause();
    } catch (err) {
        console.error('Error play/pause', err);
    }
}

// setTrack
export function setTrack(albumObj, index, playNow = true) {
    const track = albumObj?.tracks?.[index];
    if (!track) return;

    // Encode URL to handle special characters/spaces
    // We assume track.file is a relative path like "./assets/..."
    const encodedSrc = encodeURI(track.file);

    if (!audio.src || (!audio.src.endsWith(encodedSrc) && audio.src !== encodedSrc && !audio.src.endsWith(encodeURI(track.file)))) {
        audio.src = encodedSrc;
    }

    state.currentTrackIndex = index;

    if (state.shuffleState.type === 'album') state.selectedAlbum = albumObj;
    else if (!state.shuffleState.type) state.selectedAlbum = albumObj;

    if (state.shuffleState.type) updateShufflePositionFor(albumObj, index);

    DOM.songTitleElem.textContent = track.title;
    DOM.albumNameElem.textContent = `${albumObj.title} - ${albumObj.artist}`;
    highlightAlbum(state.selectedAlbum ? state.selectedAlbum.id : null);

    if (state.shuffleState.type) highlightTrackInList(state.shuffleState.position);
    else highlightTrackInList(index);

    if (playNow) {
        // Handle race conditions (AbortError) and loading errors
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                if (err.name === 'AbortError') {
                    // This is expected when switching tracks quickly
                    console.log('Playback aborted due to new load request.');
                } else if (err.name === 'NotSupportedError') {
                    console.error('Audio source not supported or failed to load:', encodedSrc);
                    showToast('❌ Error: Formato de audio no soportado o archivo no encontrado.');
                } else {
                    console.error("Play error:", err);
                }
            });
        }
    }
}

// next
export function playNextTrack() {
    if (state.shuffleState.type) {
        state.shuffleState.position++;
        if (state.shuffleState.position >= state.shuffleState.playlist.length) {
            if (state.repeatMode === 2) state.shuffleState.position = 0;
            else {
                state.shuffleState.position = state.shuffleState.playlist.length - 1;
                return;
            }
        }
        const nextItem = state.shuffleState.playlist[state.shuffleState.position];
        if (!nextItem) return;
        const { album, index } = nextItem;
        setTrack(album, index);
        return;
    }

    if (!state.selectedAlbum) return;
    let next = state.currentTrackIndex + 1;
    if (next >= state.selectedAlbum.tracks.length) {
        if (state.repeatMode === 2) next = 0;
        else return;
    }
    setTrack(state.selectedAlbum, next);
}

// prev
export function playPrevTrack() {
    if (audio.currentTime > 2) {
        audio.currentTime = 0;
        return;
    }

    if (state.shuffleState.type) {
        state.shuffleState.position--;
        if (state.shuffleState.position < 0) {
            if (state.repeatMode === 2) state.shuffleState.position = state.shuffleState.playlist.length - 1;
            else {
                state.shuffleState.position = 0;
                return;
            }
        }
        const item = state.shuffleState.playlist[state.shuffleState.position];
        if (!item) return;
        const { album, index } = item;
        setTrack(album, index);
        return;
    }

    if (!state.selectedAlbum) return;
    let prev = state.currentTrackIndex - 1;
    if (prev < 0) {
        if (state.repeatMode === 2) prev = state.selectedAlbum.tracks.length - 1;
        else return;
    }

    setTrack(state.selectedAlbum, prev);
}

// progress update bound to audio events
export function updateProgressUI() {
    // Prevent NaN or Infinity if duration is not available yet
    const currentTime = audio.currentTime || 0;
    const duration = audio.duration || 1; // avoid division by zero

    DOM.currentTimeSpan.textContent = formatTime(currentTime);
    const value = (currentTime / duration) * 100 || 0;
    DOM.progressBar.value = value;
    DOM.progressBar.style.setProperty("--progress", value + "%");
}
