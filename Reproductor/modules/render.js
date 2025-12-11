import { DOM } from './dom.js';
import { state } from './state.js';
import { showToast } from './toast.js';

// Highlight helpers
export function highlightAlbum(albumId) {
    document.querySelectorAll('.album-card').forEach(card =>
        card.classList.toggle('selected', albumId && card.dataset.id == albumId)
    );
}

export function highlightTrackInList(index) {
    document.querySelectorAll('#track-list li').forEach((li, i) =>
        li.classList.toggle('current', i === index)
    );
}

// Render functions
export function renderAlbums() {
    DOM.albumList.innerHTML = state.albums.map(a => `
    <div class="album-card" data-id="${a.id}">
      <img src="${a.cover}" alt="${a.title}" />
      <div class="album-info">
        <h3>${a.title}${a.id === state.UPLOADS_ALBUM_ID ? ' <small>(Uploads)</small>' : ''}</h3>
        <p>- ${a.artist}</p>
      </div>
    </div>
  `).join('');

    // attach listeners to album-cards
    document.querySelectorAll('.album-card').forEach(card => {
        card.addEventListener('click', () => {
            const album = state.albums.find(a => a.id == card.dataset.id);
            if (!album) return;

            state.selectedAlbum = album;
            highlightAlbum(album.id);

            if (state.shuffleState.type === 'global') {
                state.shuffleState = { type: null, playlist: [], position: 0, albumId: null };
            }

            if (state.shuffleState.type === 'album' && state.shuffleState.albumId === album.id) {
                renderShuffleTracklist();
                DOM.shuffleBtn.classList.add('active');
            } else {
                if (state.shuffleState.type === 'album') {
                    state.shuffleState = { type: null, playlist: [], position: 0, albumId: null };
                }
                renderTrackList(album);
                DOM.shuffleBtn.classList.remove('active');
            }

            showTracksSection();
        });
    });

    if (state.selectedAlbum) highlightAlbum(state.selectedAlbum.id);
}

export function renderTrackList(albumObj) {
    DOM.trackList.innerHTML = albumObj.tracks.map((t, i) => `
    <li data-index="${i}">
      <span>${i + 1}. ${t.title}</span>
      <span>${t.duration || '0:00'}</span>
    </li>
  `).join('');

    document.querySelectorAll('#track-list li').forEach((li, i) =>
        li.addEventListener('click', () => {
            // setTrack will be called externally through event wiring
            const ev = new CustomEvent('track-click', { detail: { albumId: albumObj.id, index: i } });
            document.dispatchEvent(ev);
        })
    );

    if (!state.shuffleState.type && state.selectedAlbum && state.selectedAlbum.id === albumObj.id) {
        highlightTrackInList(state.currentTrackIndex);
    } else {
        highlightTrackInList(-1);
    }
}

export function renderShuffleTracklist() {
    DOM.trackList.innerHTML = state.shuffleState.playlist.map((item, i) => `
    <li data-shuffle-index="${i}">
      <span>${i + 1}. ${item.album.tracks[item.index].title}</span>
      <span>${item.album.tracks[item.index].duration || '0:00'}</span>
    </li>
  `).join('');

    document.querySelectorAll('#track-list li').forEach((li, i) =>
        li.addEventListener('click', () => {
            const ev = new CustomEvent('shuffle-track-click', { detail: { shuffleIndex: i } });
            document.dispatchEvent(ev);
        })
    );

    highlightTrackInList(state.shuffleState.position);
}

export function showAlbumsSection() {
    DOM.albumList.style.display = 'grid';
    DOM.trackList.style.display = 'none';
    DOM.showAlbumsBtn.classList.add('active');
    DOM.showTracksBtn.classList.remove('active');
}

export function showTracksSection() {
    DOM.albumList.style.display = 'none';
    DOM.trackList.style.display = 'block';
    DOM.showAlbumsBtn.classList.remove('active');
    DOM.showTracksBtn.classList.add('active');
}
