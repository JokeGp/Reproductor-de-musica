// main.js (versión corregida y consolidada)
document.addEventListener('DOMContentLoaded', async () => {
  console.log("🎧 Iniciando...");

  // === REFERENCIAS DOM ===
  const playPauseBtn = document.getElementById('play-pause-btn');
  const shuffleBtn = document.getElementById('shuffle-btn');
  const canvas = document.getElementById('audio-visualizer');
  const currentTimeSpan = document.getElementById('current-time');
  const totalTimeSpan = document.getElementById('total-time');
  const progressBar = document.getElementById('progress-bar');
  const albumList = document.getElementById('album-list');
  const trackList = document.getElementById('track-list');
  const showAlbumsBtn = document.getElementById('show-albums-btn');
  const showTracksBtn = document.getElementById('show-tracks-btn');
  const songTitleElem = document.getElementById('song-title');
  const albumNameElem = document.getElementById('album-name');
  const viewModeSelect = document.getElementById('view-mode');

  // === ESTADO GLOBAL ===
  let albums = [];
  let selectedAlbum = null;     // objeto album seleccionado (null si ninguno)
  let currentTrackIndex = null; // índice dentro del album seleccionado (si aplica)

  // shuffleState centraliza TODO lo relativo al shuffle
  let shuffleState = {
    type: null,    // null | 'global' | 'album'
    playlist: [],  // [{album, index}, ...]
    position: 0,   // índice dentro de playlist
    albumId: null  // si type === 'album' -> id del álbum
  };

  // === AUDIO ===
  const audio = document.getElementById('player-audio') || new Audio("./assets/audio/el-diablito-loco.mp3");
  audio.crossOrigin = "anonymous";

  const audioMotion = new AudioMotionAnalyzer(canvas, {
    source: audio,
    height: canvas.clientHeight,
    mode: 10,
    smoothing: 0.9,
    mirror: false,
    showPeaks: false,
    showScaleX: true,
    showScaleY: true,
    lumiBars: true,
    colorMode: 'gradient',
    gradient: 'rainbow',
    analyzerType: 'frequency',
    fadePeaks: true,
    frequencyScale: 'log', 
    minFreq: 180,
    maxFreq: 18900, 
    bgAlpha: 0.5,
  });

  // === UTILIDADES ===
  const formatTime = sec => {
    const m = Math.floor(sec / 60) || 0;
    const s = Math.floor(sec % 60) || 0;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const updateProgress = () => {
    currentTimeSpan.textContent = formatTime(audio.currentTime);
    progressBar.value = (audio.currentTime / audio.duration) * 100 || 0;
  };

  const togglePlayPause = async () => {
    try {
      if (audio.paused) {
        await audio.play();
        playPauseBtn.textContent = "⏸ Pausar";
      } else {
        audio.pause();
        playPauseBtn.textContent = "▶ Reproducir";
      }
    } catch (err) {
      console.error('Error play/pause', err);
    }
  };

  const highlightAlbum = albumId => {
    document.querySelectorAll('.album-card').forEach(card =>
      card.classList.toggle('selected', albumId && card.dataset.id == albumId)
    );
  };

  const highlightTrackInList = index => {
    document.querySelectorAll('#track-list li').forEach((li, i) =>
      li.classList.toggle('current', i === index)
    );
  };

  // === SHUFFLE HELPERS ===
  const shuffleArray = arr => {
    // Fisher-Yates
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const createGlobalShuffle = () => {
    const list = albums.flatMap(album =>
      album.tracks.map((_, index) => ({ album, index }))
    );
    shuffleState.type = 'global';
    shuffleState.playlist = shuffleArray(list);
    shuffleState.position = 0;
    shuffleState.albumId = null;
  };

  const createAlbumShuffle = albumObj => {
    const list = albumObj.tracks.map((_, i) => ({ album: albumObj, index: i }));
    shuffleState.type = 'album';
    shuffleState.playlist = shuffleArray(list);
    shuffleState.position = 0;
    shuffleState.albumId = albumObj.id;
  };

  const updateShufflePositionFor = (albumObj, trackIndex) => {
    if (!shuffleState.type) return;
    const pos = shuffleState.playlist.findIndex(
      p => p.album.id === albumObj.id && p.index === trackIndex
    );
    if (pos >= 0) shuffleState.position = pos;
  };

  // === REPRODUCCIÓN DE TRACKS ===
  const setTrack = (albumObj, index, playNow = true) => {
    const track = albumObj?.tracks?.[index];
    if (!track) return;

    // Cambiar src si es distinto (evita recargas innecesarias)
    if (!audio.src || !audio.src.endsWith(track.file) && audio.src !== track.file) {
      audio.src = track.file;
    }

    currentTrackIndex = index;

    // IMPORTANT: No sobreescribir selectedAlbum si estamos en super shuffle global.
    // - Si shuffleState.type === 'global' -> NO cambiar selectedAlbum.
    // - Si shuffleState.type === 'album' -> selectedAlbum debe reflejar ese album.
    // - Si no hay shuffle -> selectedAlbum = albumObj.
    if (shuffleState.type === 'global') {
      // mantener selectedAlbum tal cual (puede ser null o lo que haya)
    } else if (shuffleState.type === 'album') {
      selectedAlbum = albumObj;
    } else {
      selectedAlbum = albumObj;
    }

    // actualizar posición si corresponde
    if (shuffleState.type) updateShufflePositionFor(albumObj, index);

    // UI
    songTitleElem.textContent = track.title;
    albumNameElem.textContent = `${albumObj.title} - ${albumObj.artist}`;
    highlightAlbum(selectedAlbum ? selectedAlbum.id : null);

    // Resaltar pista dependiendo si estamos mostrando shuffle o lista normal
    if (shuffleState.type) {
      highlightTrackInList(shuffleState.position);
    } else {
      highlightTrackInList(index);
    }

    if (playNow) {
      audio.play().catch(err => console.error("play error:", err));
      playPauseBtn.textContent = "⏸ Pausar";
    }
  };

  // === RENDERIZADO ===
  const renderAlbums = () => {
    albumList.innerHTML = albums.map(a => `
      <div class="album-card" data-id="${a.id}">
        <img src="${a.cover}" alt="${a.title}" />
        <h3>${a.title}</h3>
        <p>${a.artist}</p>
      </div>
    `).join('');

    // listeners
    document.querySelectorAll('.album-card').forEach(card => {
      card.addEventListener('click', () => {
        const album = albums.find(a => a.id == card.dataset.id);
        if (!album) return;

        // seleccionar album en vista
        selectedAlbum = album;
        highlightAlbum(album.id);

        // si hay shuffle por album y coincide -> mostrar shuffle de ese album
        if (shuffleState.type === 'album' && shuffleState.albumId === album.id) {
          renderShuffleTracklist();
          shuffleBtn.classList.add('active');
        } else {
          // vista normal del álbum
          renderTrackList(album);
          shuffleBtn.classList.remove('active');
        }

        showTracksSection();
      });
    });

    // si ya había album seleccionado, resaltarlo
    if (selectedAlbum) highlightAlbum(selectedAlbum.id);
  };

  const renderTrackList = albumObj => {
    // muestra la lista normal del álbum (orden natural)
    trackList.innerHTML = albumObj.tracks.map((t, i) => `
      <li data-index="${i}">
        <span>${i + 1}. ${t.title}</span>
        <span>${t.duration}</span>
      </li>
    `).join('');

    document.querySelectorAll('#track-list li').forEach((li, i) =>
      li.addEventListener('click', () => setTrack(albumObj, i))
    );

    // resaltar según índice actual (si pertenece a este album)
    if (!shuffleState.type && selectedAlbum && selectedAlbum.id === albumObj.id) {
      highlightTrackInList(currentTrackIndex);
    } else {
      highlightTrackInList(-1);
    }
  };

  const renderShuffleTracklist = () => {
    // pinta la playlist del shuffleState tal cual
    trackList.innerHTML = shuffleState.playlist.map((item, i) => `
      <li data-shuffle-index="${i}">
        <span>${i + 1}. ${item.album.tracks[item.index].title}</span>
        <span>${item.album.tracks[item.index].duration}</span>
      </li>
    `).join('');

    document.querySelectorAll('#track-list li').forEach((li, i) =>
      li.addEventListener('click', () => {
        const { album, index } = shuffleState.playlist[i];
        shuffleState.position = i;
        setTrack(album, index);
      })
    );

    highlightTrackInList(shuffleState.position);
  };

  const showAlbumsSection = () => {
    albumList.style.display = 'grid';
    trackList.style.display = 'none';
    showAlbumsBtn.classList.add('active');
    showTracksBtn.classList.remove('active');
  };

  const showTracksSection = () => {
    albumList.style.display = 'none';
    trackList.style.display = 'block';
    showAlbumsBtn.classList.remove('active');
    showTracksBtn.classList.add('active');
  };

  // === EVENTOS ===
  playPauseBtn.addEventListener('click', togglePlayPause);

  // --- Botón de Shuffle (control centralizado de shuffles) ---
  shuffleBtn.addEventListener('click', () => {
    // Si hay un album seleccionado -> toggle shuffle por álbum para ese album
    if (selectedAlbum) {
      if (shuffleState.type === 'album' && shuffleState.albumId === selectedAlbum.id) {
        // desactivar album-shuffle
        shuffleState = { type: null, playlist: [], position: 0, albumId: null };
        renderTrackList(selectedAlbum);
        shuffleBtn.classList.remove('active');
      } else {
        // activar album-shuffle (genera nueva orden)
        createAlbumShuffle(selectedAlbum);
        renderShuffleTracklist();
        // si ya suena una pista del album, mantenerla resaltada; si no, reproducir la primera
        if (!audio.paused && audio.src && audio.src.includes(selectedAlbum.id)) {
          highlightTrackInList(shuffleState.position);
        } else {
          const first = shuffleState.playlist[0];
          setTrack(first.album, first.index);
        }
        shuffleBtn.classList.add('active');
      }
      showTracksSection();
      return;
    }

    // Sin album seleccionado -> toggle super shuffle global
    if (shuffleState.type === 'global') {
      // desactivar global shuffle
      shuffleState = { type: null, playlist: [], position: 0, albumId: null };
      renderAlbums();
      showAlbumsSection();
      shuffleBtn.classList.remove('active');
    } else {
      // activar global shuffle
      createGlobalShuffle();
      renderShuffleTracklist();
      const first = shuffleState.playlist[0];
      setTrack(first.album, first.index);
      shuffleBtn.classList.add('active');
      showTracksSection();
    }
  });

  // --- Botón mostrar Álbumes ---
  showAlbumsBtn.addEventListener('click', () => {
    renderAlbums();
    showAlbumsSection();
  });

  // --- Botón Tracklist ---
  showTracksBtn.addEventListener('click', () => {
    // OJO: Tracklist solo MUESTRA lo que corresponda. NO crea shuffles.
    // Prioridad:
    // 1) Si hay shuffle global activo -> mostrar playlist shuffle global (sin regenerar).
    if (shuffleState.type === 'global') {
      renderShuffleTracklist();
      shuffleBtn.classList.add('active');
      showTracksSection();
      return;
    }

    // 2) Si hay shuffle por álbum activo -> mostrar esa playlist (sin regenerar).
    if (shuffleState.type === 'album') {
      renderShuffleTracklist();
      shuffleBtn.classList.add('active');
      showTracksSection();
      return;
    }

    // 3) Si hay un álbum seleccionado -> mostrar su tracklist normal (sin shuffle).
    if (selectedAlbum) {
      renderTrackList(selectedAlbum);
      shuffleBtn.classList.remove('active');
      showTracksSection();
      return;
    }

    // 4) Ningún álbum ni shuffle activo -> mostrar TODAS las canciones en orden natural (sin mezclar).
    // Esto es la PRIORIDAD 4 que solicitaste mantener.
    const allTracks = albums.flatMap(a =>
      a.tracks.map(t => ({ album: a, title: t.title, duration: t.duration }))
    );

    trackList.innerHTML = allTracks.map((t, i) => `
      <li data-index="${i}">
        <span>${i + 1}. ${t.title} <em>(${t.album.title})</em></span>
        <span>${t.duration}</span>
      </li>
    `).join('');

    // Al clicar una pista en la vista "allTracks" -> seleccionar el álbum y reproducir la pista
    document.querySelectorAll('#track-list li').forEach((li, i) => {
      const { album } = allTracks[i];
      li.addEventListener('click', () => {
        selectedAlbum = album;
        highlightAlbum(album.id);
        const trackIdx = album.tracks.findIndex(tt => tt.title === allTracks[i].title);
        setTrack(album, trackIdx);
      });
    });

    // Visualmente quitar el estado "activo" del botón shuffle (no estamos activando el shuffle here)
    shuffleBtn.classList.remove('active');
    showTracksSection();
  });

  // === EVENTOS AUDIO ===
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', () => {
    totalTimeSpan.textContent = formatTime(audio.duration);
  });
  progressBar.addEventListener('input', () => {
    audio.currentTime = (progressBar.value / 100) * audio.duration;
  });

//espectrograma

// === REFERENCIAS ===
const audioMotionContainer = document.getElementById('audio-visualizer');
const spectroCanvas = document.getElementById('spectrogram-canvas');
const spectroCtx = spectroCanvas.getContext('2d');

// === VARIABLES DE CONTROL ===
let spectroAnimation = null;
let spectroActive = false;
let sharedAnalyser = null;

// Mostrar AudioMotion y ocultar espectrograma al inicio
audioMotionContainer.style.display = 'block';
spectroCanvas.style.display = 'none';

// === CREAR FUENTE DE AUDIO COMPARTIDA ===
let sharedAudioCtx = null;
let sharedSource = null;

function initSharedAudioContext() {
  if (sharedAudioCtx) return; // ya inicializado

  // Reutilizamos el contexto de audioMotion
  sharedAudioCtx = audioMotion.audioCtx;
  sharedSource = sharedAudioCtx.createMediaElementSource(audio);

  // Creamos un analyser compartido
  sharedAnalyser = sharedAudioCtx.createAnalyser();
  sharedAnalyser.fftSize = 1024;

  // Conectamos la fuente a ambos: a audioMotion y al analyser
  sharedSource.connect(sharedAnalyser);
  sharedSource.connect(audioMotion.audioCtx.destination);

  console.log("🔗 Fuente de audio compartida creada.");
}

// === FUNCIONES ===
const startSpectrogram = () => {
  if (!sharedAnalyser) {
    console.warn("⚠️ El analyser aún no está disponible.");
    return;
  }

  const bufferLength = sharedAnalyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const drawSpectrogram = () => {
    if (!spectroActive) return;

    sharedAnalyser.getByteFrequencyData(dataArray);

    const width = spectroCanvas.width;
    const height = spectroCanvas.height;

    // Desplazar el canvas hacia arriba
    const imageData = spectroCtx.getImageData(0, 0, width, height);
    spectroCtx.putImageData(imageData, 0, -1);

    // Dibujar la nueva línea (abajo)
    for (let x = 0; x < width; x++) {
      const i = Math.floor((x / width) * bufferLength);
      const value = dataArray[i];
      const hue = 240 - (value / 255) * 240;
      spectroCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      spectroCtx.fillRect(x, height - 1, 1, 1);
    }

    spectroAnimation = requestAnimationFrame(drawSpectrogram);
  };

  console.log("🎨 Iniciando espectrograma...");
  drawSpectrogram();
};

// === EVENTO PRINCIPAL ===
viewModeSelect.addEventListener("change", (e) => {
  const mode = e.target.value;

  // Detener animaciones previas
  if (spectroAnimation) cancelAnimationFrame(spectroAnimation);
  spectroActive = false;

  // Modo barras o forma de onda
  if (mode === "bars" || mode === "wave") {
    spectroCanvas.style.display = "none";
    audioMotionContainer.style.display = "block";
    spectroActive = false;

    // Configurar AudioMotion
    audioMotion.mode = mode === "bars" ? 0 : 1;
    audioMotion.analyzerType = mode === "bars" ? "frequency" : "waveform";

    console.log(`🎛️ Cambiado a modo ${mode}`);
    return;
  }

  // Modo espectrograma
  if (mode === "spectrogram") {
    console.log("🎚️ Activando espectrograma...");
    audioMotionContainer.style.display = "none";
    spectroCanvas.style.display = "block";
    spectroActive = true;

    // Inicializar fuente compartida si no existe
    initSharedAudioContext();

    // Ajustar tamaño del canvas
    spectroCanvas.width = spectroCanvas.clientWidth;
    spectroCanvas.height = spectroCanvas.clientHeight;

    // Arrancar espectrograma cuando haya audio
    if (!audio.paused) {
      startSpectrogram();
    } else {
      audio.addEventListener("play", startSpectrogram, { once: true });
    }
  }
});







  // === CARGA INICIAL (albums.json) ===
  try {
    const res = await fetch('./data/albums.json');
    albums = await res.json();
    renderAlbums();
  } catch (err) {
    console.error("❌ Error al cargar álbumes:", err);
  }

  console.log("✅ Setup completo. Listo para reproducir.");
});
