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
    document.querySelectorAll('#playlist li').forEach((li, i) =>
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

            // Just show the playlist for this album (view mode)
            // Do NOT touch shuffleState or playingAlbum here
            renderPlaylist(album);
            showPlaylistSection();

            showPlaylistSection();
        });
    });

    if (state.selectedAlbum) highlightAlbum(state.selectedAlbum.id);
}

// Helper to get theme suffix
function getCurrentThemeSuffix() {
    if (document.body.classList.contains('secret-mode')) return '-secret';
    if (document.body.classList.contains('christmas-mode')) return '-christmas';
    if (document.body.classList.contains('dark-mode')) return '-night';
    return '-light';
}

function getFavIcon(isFav) {
    const suffix = getCurrentThemeSuffix();
    return isFav ? `./assets/icons/fav-active${suffix}.png` : `./assets/icons/fav${suffix}.png`;
}

const FAV_ID_KEY = '_favOriginId';

// Logic to toggle favorite
function toggleFavorite(track, albumId, index) {
    const favAlbum = state.albums.find(a => a.id === 'favorites');
    if (!favAlbum) return;

    // Determine unique ID
    let uniqueId;
    if (albumId === 'favorites') {
        uniqueId = track[FAV_ID_KEY];
        // Fallback if missing (shouldn't happen for new favs)
        if (!uniqueId) return;
    } else {
        uniqueId = `${albumId}-${index}`;
    }

    // Check if exists
    const existingIndex = favAlbum.tracks.findIndex(t => t[FAV_ID_KEY] === uniqueId);

    if (existingIndex >= 0) {
        // Remove
        favAlbum.tracks.splice(existingIndex, 1);
        showToast("💔 Eliminado de favoritos");
    } else {
        // Add (only if not viewing favorites)
        if (albumId !== 'favorites') {
            favAlbum.tracks.push({ ...track, [FAV_ID_KEY]: uniqueId });
            showToast("❤️ Añadido a favoritos");
        }
    }
}

function isTrackFavorite(albumId, index) {
    if (albumId === 'favorites') return true;

    const favAlbum = state.albums.find(a => a.id === 'favorites');
    if (!favAlbum) return false;

    const targetId = `${albumId}-${index}`;
    return favAlbum.tracks.some(t => t[FAV_ID_KEY] === targetId);
}

export function renderPlaylist(albumObj) {
    // Update Header
    if (DOM.albumArtHeader) {
        DOM.albumArtHeader.style.display = 'flex';
        if (DOM.playlistAlbumTitle) DOM.playlistAlbumTitle.textContent = albumObj.title;
        if (DOM.playlistAlbumArtist) DOM.playlistAlbumArtist.textContent = albumObj.artist;
        DOM.blurBg.style.backgroundImage = `url('${albumObj.cover}')`;
        // Overlay color is handled by CSS classes on body
    }

    DOM.playlist.innerHTML = albumObj.tracks.map((t, i) => {
        const isFav = isTrackFavorite(albumObj.id, i);
        const iconSrc = getFavIcon(isFav);

        return `
    <li data-index="${i}" class="${state.currentTrackIndex === i && (!state.shuffleState.type && state.playingAlbum && state.playingAlbum.id === albumObj.id) ? 'current' : ''}">
      <span class="track-info-left">${i + 1}. ${t.title}</span>
      <span class="track-info-right">
        <span class="duration">${t.duration || '0:00'}</span>
        <img src="${iconSrc}" class="fav-icon" data-index="${i}" alt="fav">
      </span>
    </li>
  `}).join('');

    // Click on row -> play
    document.querySelectorAll('#playlist li').forEach((li, i) => {
        li.addEventListener('click', (e) => {
            // If clicked on fav icon, don't play, toggle fav
            if (e.target.classList.contains('fav-icon')) {
                e.stopPropagation();
                const track = albumObj.tracks[i];
                toggleFavorite(track, albumObj.id, i);

                // If we are currently viewing the FAVORITES album, re-render to remove the item
                if (albumObj.id === 'favorites') {
                    renderPlaylist(albumObj);
                } else {
                    // Otherwise just update the icon
                    e.target.src = getFavIcon(isTrackFavorite(albumObj.id, i));
                }
                return;
            }
            const ev = new CustomEvent('track-click', { detail: { albumId: albumObj.id, index: i } });
            document.dispatchEvent(ev);
        });
    });

    if (!state.shuffleState.type && state.playingAlbum && state.playingAlbum.id === albumObj.id) {
        highlightTrackInList(state.currentTrackIndex);
    } else {
        highlightTrackInList(-1);
    }
}

export function renderShufflePlaylist() {
    // Update Header
    let coverImg = './assets/icons/music-icon.png';
    let title = "Shuffle Global";
    let artist = "Varios Artistas";

    if (state.selectedAlbum) {
        coverImg = state.selectedAlbum.cover;
        title = state.selectedAlbum.title;
        artist = state.selectedAlbum.artist;
    }
    else if (state.shuffleState.playlist.length > 0) {
        coverImg = state.shuffleState.playlist[0].album.cover;
        if (state.shuffleState.type === 'global') {
            title = "Shuffle Global";
            artist = "Mix de canciones";
        } else {
            title = state.shuffleState.playlist[0].album.title;
            artist = state.shuffleState.playlist[0].album.artist;
        }
    }

    if (DOM.albumArtHeader) {
        DOM.albumArtHeader.style.display = 'flex';
        if (DOM.playlistAlbumTitle) DOM.playlistAlbumTitle.textContent = title;
        if (DOM.playlistAlbumArtist) DOM.playlistAlbumArtist.textContent = artist;

        DOM.blurBg.style.backgroundImage = `url('${coverImg}')`;
    }

    DOM.playlist.innerHTML = state.shuffleState.playlist.map((item, i) => {
        const track = item.album.tracks[item.index];
        // Use original album id and index
        const isFav = isTrackFavorite(item.album.id, item.index);
        const iconSrc = getFavIcon(isFav);

        return `
    <li data-shuffle-index="${i}">
      <span class="track-info-left">${i + 1}. ${track.title}</span>
      <span class="track-info-right">
        <span class="duration">${track.duration || '0:00'}</span>
        <img src="${iconSrc}" class="fav-icon" data-shuffle-idx="${i}" alt="fav">
      </span>
    </li>
  `}).join('');

    document.querySelectorAll('#playlist li').forEach((li, i) => {
        li.addEventListener('click', (e) => {
            if (e.target.classList.contains('fav-icon')) {
                e.stopPropagation();
                const item = state.shuffleState.playlist[i];
                const track = item.album.tracks[item.index];
                toggleFavorite(track, item.album.id, item.index);
                e.target.src = getFavIcon(isTrackFavorite(item.album.id, item.index));
                return;
            }
            const ev = new CustomEvent('shuffle-track-click', { detail: { shuffleIndex: i } });
            document.dispatchEvent(ev);
        })
    });

    highlightTrackInList(state.shuffleState.position);
}

export function showAlbumsSection() {
    DOM.albumList.style.display = 'grid';
    DOM.playlist.style.display = 'none';
    if (DOM.albumArtHeader) DOM.albumArtHeader.style.display = 'none'; // Hide header
    DOM.showAlbumsBtn.classList.add('active');
    DOM.showPlaylistBtn.classList.remove('active');
}

export function showPlaylistSection() {
    DOM.albumList.style.display = 'none';
    DOM.playlist.style.display = 'block';
    if (DOM.albumArtHeader) DOM.albumArtHeader.style.display = 'flex'; // Show header
    DOM.showAlbumsBtn.classList.remove('active');
    DOM.showPlaylistBtn.classList.add('active');
}
