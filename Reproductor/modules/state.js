// Estado global centralizado
export const state = {
    albums: [],
    selectedAlbum: null,
    currentTrackIndex: null,
    shuffleState: {
        type: null,    // null | 'global' | 'album'
        playlist: [],  // [{album, index}, ...]
        position: 0,
        albumId: null
    },
    repeatMode: 0, // 0 off, 1 repeat track, 2 repeat playlist
    UPLOADS_ALBUM_ID: '__local_uploads__'
};
