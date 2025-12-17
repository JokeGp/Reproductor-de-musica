import { audio, sharedAnalyser } from './audio.js'; // sharedAnalyser imported indirectly if needed
import { state } from './state.js';
import { renderAlbums, renderPlaylist, renderShufflePlaylist, highlightAlbum, highlightTrackInList, showPlaylistSection } from './render.js';
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
    state.playingAlbum = albumObj;

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

    if (!state.playingAlbum) return;
    let next = state.currentTrackIndex + 1;
    if (next >= state.playingAlbum.tracks.length) {
        if (state.repeatMode === 2) {
            next = 0;
        } else if (state.repeatMode === 1) {
            // Find current album index
            const currentAlbumIdx = state.albums.findIndex(a => a.id === state.playingAlbum.id);
            if (currentAlbumIdx !== -1) {
                let nextAlbumIdx = currentAlbumIdx + 1;
                let albumsChecked = 0;
                let foundValidAlbum = false;

                // Loop to find next non-empty album
                while (albumsChecked < state.albums.length) {
                    if (nextAlbumIdx >= state.albums.length) {
                        nextAlbumIdx = 0; // Wrap to first album
                    }

                    if (state.albums[nextAlbumIdx].tracks.length > 0) {
                        foundValidAlbum = true;
                        break;
                    }

                    nextAlbumIdx++;
                    albumsChecked++;
                }

                if (foundValidAlbum) {
                    const nextAlbum = state.albums[nextAlbumIdx];
                    setTrack(nextAlbum, 0);
                    return;
                } else {
                    return;
                }
            } else {
                return;
            }
        } else {
            // Repeat Mode 0 (Default) -> Continuous Play
            const currentAlbumIdx = state.albums.findIndex(a => a.id === state.playingAlbum.id);
            if (currentAlbumIdx !== -1) {
                let nextAlbumIdx = currentAlbumIdx + 1;
                let albumsChecked = 0;
                let foundValidAlbum = false;

                // Loop to find next non-empty album
                while (albumsChecked < state.albums.length) {
                    if (nextAlbumIdx >= state.albums.length) {
                        nextAlbumIdx = 0;
                    }

                    if (state.albums[nextAlbumIdx].tracks.length > 0) {
                        foundValidAlbum = true;
                        break;
                    }

                    nextAlbumIdx++;
                    albumsChecked++;
                }

                if (foundValidAlbum) {
                    const nextAlbum = state.albums[nextAlbumIdx];
                    setTrack(nextAlbum, 0);
                    return;
                } else {
                    return;
                }
            } else {
                return;
            }
        }
    }
    setTrack(state.playingAlbum, next);
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

    if (!state.playingAlbum) return;
    let prev = state.currentTrackIndex - 1;
    if (prev < 0) {
        if (state.repeatMode === 2) prev = state.playingAlbum.tracks.length - 1;
        else return;
    }

    setTrack(state.playingAlbum, prev);
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
