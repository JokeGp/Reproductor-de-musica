import { state } from './state.js';
import { shuffleArray } from './utils.js';

export function createGlobalShuffle() {
    const list = state.albums.flatMap(album =>
        album.tracks.map((_, index) => ({ album, index }))
    );
    state.shuffleState.type = 'global';
    state.shuffleState.playlist = shuffleArray(list);
    state.shuffleState.position = 0;
    state.shuffleState.albumId = null;
}

export function createAlbumShuffle(albumObj) {
    const list = albumObj.tracks.map((_, i) => ({ album: albumObj, index: i }));
    state.shuffleState.type = 'album';
    state.shuffleState.playlist = shuffleArray(list);
    state.shuffleState.position = 0;
    state.shuffleState.albumId = albumObj.id;
}

export function updateShufflePositionFor(albumObj, trackIndex) {
    if (!state.shuffleState.type) return;
    const pos = state.shuffleState.playlist.findIndex(
        p => p.album.id === albumObj.id && p.index === trackIndex
    );
    if (pos >= 0) state.shuffleState.position = pos;
}
