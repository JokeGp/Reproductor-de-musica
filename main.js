// main.js (archivo completo integrado)
// Asegúrate de que este archivo sea cargado después del DOM (o usar defer en <script>).

document.addEventListener('DOMContentLoaded', async () => {
  console.log("🎧 Iniciando...");
  drawScale();

  // === REFERENCIAS DOM ===
  const playPauseBtn = document.getElementById('play-pause-btn');
  const shuffleBtn = document.getElementById('shuffle-btn');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const repeatBtn = document.getElementById('repeat-btn');
  const uploadBtn = document.getElementById('upload-btn');       // botón subir
  const fileInput = document.getElementById('file-input');       // input subir
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

  const themeButtons = document.querySelectorAll('.toggle-btn');

  // Toast pequeño (estilo dependiente de CSS)
  const toastEl = document.getElementById('toast');

  // === THEME BUTTONS (day/night swapping imágenes + redraw escala) ===
  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Quitar clase active de todos
      themeButtons.forEach(b => b.classList.remove('active'));
      // Poner active al botón clickeado
      btn.classList.add('active');

      const isDark = btn.dataset.theme === 'dark';
      document.body.classList.toggle('dark-mode', isDark);

      // Cambiar imágenes que tengan -day por -night (selección amplia)
      const imagesToSwap = document.querySelectorAll(
        '.forentec-icon, .controls img, .project-title img, .background-footer, .background-footer-night'
      );
      imagesToSwap.forEach(img => {
        if (!img || !img.src) return;
        if (isDark) {
          img.src = img.src.replace('-day', '-night');
        } else {
          img.src = img.src.replace('-night', '-day');
        }
      });

      // Redibujar la escala del canvas con el color correcto
      if (typeof drawScale === 'function') drawScale();
    });
  });

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
  let repeatMode = 0; // 0 = off, 1 = repeat track, 2 = repeat playlist

  // === CONSTANTES / HELPERS PARA UPLOADS ===
  const UPLOADS_ALBUM_ID = '__local_uploads__'; // id especial

  function ensureUploadsAlbum() {
    let album = albums.find(a => a.id === UPLOADS_ALBUM_ID);
    if (!album) {
      album = {
        id: UPLOADS_ALBUM_ID,
        title: 'Local uploads',
        artist: 'Mis archivos',
        cover: './assets/covers/local-uploads.jpg', // cambiar si no existe
        tracks: []
      };
      // Añadir al inicio para que sea visible (opcional)
      albums.unshift(album);
    }
    return album;
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function formatDuration(sec) {
    if (!isFinite(sec) || sec <= 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  const showToast = message => {
  const toast = document.getElementById("toast");
  if (!toast) return; // seguridad por si no existe
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
};

  // === AUDIO ===
  const audio = document.getElementById('player-audio') || new Audio("./assets/audio/el-diablito-loco.mp3");
  audio.crossOrigin = "anonymous";

  // Crear contexto de audio compartido primero
  const sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const sharedSource = sharedAudioCtx.createMediaElementSource(audio);
  const sharedAnalyser = sharedAudioCtx.createAnalyser();
  sharedAnalyser.fftSize = 2048;

  // Conectar el source al analyser
  sharedSource.connect(sharedAnalyser);
  sharedAnalyser.connect(sharedAudioCtx.destination);

  // Inicializar AudioMotion con el contexto compartido
  const audioMotion = new AudioMotionAnalyzer(canvas, {
    audioCtx: sharedAudioCtx,     // usar el contexto compartido
    source: sharedSource,         // usar la fuente compartida
    height: canvas.clientHeight,
    mode: 10,
    smoothing: 0.9,
    mirror: false,
    showPeaks: false,
    showScaleX: true,
    showScaleY: false,
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

  // === PROGRESO / UI ===
  const updateProgress = () => {
    currentTimeSpan.textContent = formatTime(audio.currentTime);
    const value = (audio.currentTime / audio.duration) * 100 || 0;
    progressBar.value = value;
    progressBar.style.setProperty("--progress", value + "%");
  };
  updateProgress();
  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("loadedmetadata", updateProgress);

  const togglePlayPause = async () => {
    try {
      if (audio.paused) await audio.play();
      else audio.pause();
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
    if (!audio.src || (!audio.src.endsWith(track.file) && audio.src !== track.file)) {
      audio.src = track.file;
    }

    currentTrackIndex = index;

    // actualizar álbum seleccionado según contexto
    if (shuffleState.type === 'album') selectedAlbum = albumObj;
    else if (!shuffleState.type) selectedAlbum = albumObj;

    // actualizar posición si corresponde
    if (shuffleState.type) updateShufflePositionFor(albumObj, index);

    // UI
    songTitleElem.textContent = track.title;
    albumNameElem.textContent = `${albumObj.title} - ${albumObj.artist}`;
    highlightAlbum(selectedAlbum ? selectedAlbum.id : null);

    // Resaltar pista dependiendo si estamos mostrando shuffle o lista normal
    if (shuffleState.type) highlightTrackInList(shuffleState.position);
    else highlightTrackInList(index);

    if (playNow) audio.play().catch(err => console.error("play error:", err));
  };

  // === RENDERIZADO ===
  const renderAlbums = () => {
    albumList.innerHTML = albums.map(a => `
      <div class="album-card" data-id="${a.id}">
        <img src="${a.cover}" alt="${a.title}" />
        <div class="album-info">
          <h3>${a.title}${a.id === UPLOADS_ALBUM_ID ? ' <small>(Uploads)</small>' : ''}</h3>
          <p>- ${a.artist}</p>
        </div>
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

        if (shuffleState.type === 'global') {
          shuffleState = { type: null, playlist: [], position: 0, albumId: null };
          shuffleBtn.classList.remove('active');
        }

        // si hay shuffle por album y coincide -> mostrar shuffle de ese album
        if (shuffleState.type === 'album' && shuffleState.albumId === album.id) {
          renderShuffleTracklist();
          shuffleBtn.classList.add('active');
        } else {
          // si había shuffle de otro álbum → APAGAR shuffle
          if (shuffleState.type === 'album') {
            shuffleState = { type: null, playlist: [], position: 0, albumId: null };
          }
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
        <span>${t.duration || '0:00'}</span>
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
    // muestra la lista del shuffle activo
    trackList.innerHTML = shuffleState.playlist.map((item, i) => `
      <li data-shuffle-index="${i}">
        <span>${i + 1}. ${item.album.tracks[item.index].title}</span>
        <span>${item.album.tracks[item.index].duration || '0:00'}</span>
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
        if (!audio.paused && audio.src && audio.src.includes(String(selectedAlbum.id))) {
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
      highlightAlbum(null);
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
    // 1) Si hay shuffle global activo -> mostrar playlist shuffle global (sin regenerar).
    if (shuffleState.type === 'global') {
      renderShuffleTracklist();
      shuffleBtn.classList.add('active');
      showTracksSection();
      return;
    }

    // 2) Si hay shuffle por álbum activo -> mostrar esa playlist (sin regenerar).
    if (shuffleState.type === 'album') {
      if (selectedAlbum && shuffleState.albumId === selectedAlbum.id) {
        renderShuffleTracklist();
        shuffleBtn.classList.add('active');
      } else {
        // apagar shuffle si es de otro álbum
        shuffleState = { type: null, playlist: [], position: 0, albumId: null };
        shuffleBtn.classList.remove('active');
        if (selectedAlbum) renderTrackList(selectedAlbum);
        else renderAlbums();
      }
      showTracksSection();
      return;
    }

    // 3) Si hay un álbum seleccionado -> mostrar su tracklist normal (sin shuffle).
    if (selectedAlbum && shuffleState.type !== 'global') {
      renderTrackList(selectedAlbum);
      shuffleBtn.classList.remove('active');
      showTracksSection();
      return;
    }

    // 4) Ningún álbum ni shuffle activo -> mostrar TODAS las canciones en orden natural (sin mezclar).
    const allTracks = albums.flatMap(a =>
      a.tracks.map(t => ({ album: a, title: t.title, duration: t.duration }))
    );

    trackList.innerHTML = allTracks.map((t, i) => `
      <li data-index="${i}">
        <span>${i + 1}. ${t.title} <em>(${t.album.title})</em></span>
        <span>${t.duration || '0:00'}</span>
      </li>
    `).join('');

    // Al clicar una pista en la vista "allTracks" -> seleccionar el álbum y reproducir la pista
    document.querySelectorAll('#track-list li').forEach((li, i) => {
      const { album } = allTracks[i];
      li.addEventListener('click', () => {
        selectedAlbum = album;
        highlightAlbum(album.id);
        shuffleState = { type: null, playlist: [], position: 0, albumId: null };
        shuffleBtn.classList.remove('active');
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
    if (!audio.duration) return;
    audio.currentTime = (progressBar.value / 100) * audio.duration;
  });

  // === ESPECTROGRAMA ===
  const audioMotionContainer = document.getElementById('audio-visualizer');
  const spectroCanvas = document.getElementById('spectrogram-canvas');

  // Mostrar AudioMotion y ocultar espectrograma al inicio
  if (audioMotionContainer) audioMotionContainer.style.display = 'block';
  if (spectroCanvas) spectroCanvas.style.display = 'none';

  let spectroCtx, spectroAnimation;
  let spectroActive = false;

  const startSpectrogram = () => {
    const canvasEl = document.getElementById("spectrogram-canvas");
    if (!canvasEl || !sharedAnalyser || !sharedAudioCtx) {
      console.warn("⚠️ No se pudo iniciar el espectrograma, falta canvas o analyser.");
      return;
    }

    const ctx = canvasEl.getContext("2d");
    spectroCtx = ctx;
    spectroActive = true;

    const minFreq = 180;
    const maxFreq = 18900;
    const fftSize = sharedAnalyser.fftSize;
    const bufferLength = sharedAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const positionToFreq = (position) => {
      const logMin = Math.log(minFreq);
      const logMax = Math.log(maxFreq);
      return Math.exp(logMin + position * (logMax - logMin));
    };

    const ffmpegColor = (value) => {
      const v = value / 255;
      let r = 0, g = 0, b = 0;
      if (v <= 0.25) { r = v * 4 * 64; g = 0; b = 128 + v * 4 * 127; }
      else if (v <= 0.5) { r = 64 + (v - 0.25) * 4 * 191; g = 0; b = 255 - (v - 0.25) * 4 * 64; }
      else if (v <= 0.75) { r = 255; g = (v - 0.5) * 4 * 128; b = 191 - (v - 0.5) * 4 * 191; }
      else { r = 255; g = 128 + (v - 0.75) * 4 * 127; b = 0; }
      return `rgb(${r},${g},${b})`;
    };

    const drawSpectrogram = () => {
      if (!spectroActive) return;
      sharedAnalyser.getByteFrequencyData(dataArray);

      // Desplaza la imagen 1 px a la izquierda (efecto scroll)
      const imageData = ctx.getImageData(1, 0, canvasEl.width - 1, canvasEl.height);
      ctx.putImageData(imageData, 0, 0);

      // Dibuja nueva columna a la derecha
      for (let y = 0; y < canvasEl.height; y++) {
        const position = y / canvasEl.height;
        const freq = positionToFreq(1 - position);
        const binIndex = Math.floor((freq * fftSize) / sharedAudioCtx.sampleRate);

        if (binIndex >= 0 && binIndex < bufferLength) {
          const value = dataArray[binIndex];
          ctx.fillStyle = ffmpegColor(value);
          ctx.fillRect(canvasEl.width - 1, y, 1, 1);
        }
      }

      spectroAnimation = requestAnimationFrame(drawSpectrogram);
    };

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
    drawSpectrogram();
  };

  const stopSpectrogram = () => {
    spectroActive = false;
    if (spectroAnimation) cancelAnimationFrame(spectroAnimation);
  };

  document.querySelectorAll(".visual-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".visual-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const mode = btn.dataset.mode;
      if (mode === "bars") {
        stopSpectrogram();
        if (spectroCanvas) spectroCanvas.style.display = "none";
        if (audioMotionContainer) audioMotionContainer.style.display = "block";
        audioMotion.mode = 0;
        audioMotion.analyzerType = "frequency";
        console.log("🎛️ Frecuencias activado");
        return;
      }

      if (mode === "spectrogram") {
        console.log("🎚️ Espectrograma activado");
        if (audioMotionContainer) audioMotionContainer.style.display = "none";
        if (spectroCanvas) spectroCanvas.style.display = "block";

        spectroCanvas.width = spectroCanvas.clientWidth;
        spectroCanvas.height = spectroCanvas.clientHeight;

        stopSpectrogram();
        if (!audio.paused) startSpectrogram();
        else audio.addEventListener("play", startSpectrogram, { once: true });

        drawScale();
        return;
      }
    });
  });

  // === Escala de frecuencias ===
  function drawScale() {
    const canvasEl = document.getElementById('scale');
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    const height = canvasEl.height;
    const width = canvasEl.width;
    const minFreq = 180;
    const maxFreq = 18900;

    // Elegir color según el modo
    const isDark = document.body.classList.contains('dark-mode');
    const lineColor = isDark ? '#FFFFFF' : '#000000';
    const textColor = isDark ? '#FFFFFF' : '#000000';

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = lineColor;
    ctx.fillStyle = textColor;
    ctx.font = '10px Hind Madurai';
    ctx.textAlign = 'right';

    // Líneas de referencia logarítmicas
    const freqs = [200, 305, 500, 1000, 2000, 5000, 10000, 15000, 18000];
    for (const f of freqs) {
      const y = freqToPosition(f, height, minFreq, maxFreq);
      ctx.beginPath();
      ctx.moveTo(width - 10, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.fillText(f + ' Hz', width - 12, y + 3);
    }
  }

  function freqToPosition(freq, height, minFreq, maxFreq) {
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const logFreq = Math.log10(freq);
    const norm = (logFreq - logMin) / (logMax - logMin);
    return height - norm * height;
  }

  // === Reproducción siguiente / anterior / repeat / repeat toast ===
  const playNextTrack = () => {
    if (shuffleState.type) {
      shuffleState.position++;
      // Si llegamos al final
      if (shuffleState.position >= shuffleState.playlist.length) {
        if (repeatMode === 2) shuffleState.position = 0;
        else {
          shuffleState.position = shuffleState.playlist.length - 1; // evita overflow
          return;
        }
      }
      const nextItem = shuffleState.playlist[shuffleState.position];
      if (!nextItem) return;
      const { album, index } = nextItem;
      setTrack(album, index);
      return;
    }

    if (!selectedAlbum) return;

    let next = currentTrackIndex + 1;
    if (next >= selectedAlbum.tracks.length) {
      if (repeatMode === 2) next = 0;
      else return;
    }

    setTrack(selectedAlbum, next);
  };

  const playPrevTrack = () => {
    if (audio.currentTime > 2) {
      audio.currentTime = 0;
      return;
    }

    if (shuffleState.type) {
      shuffleState.position--;
      if (shuffleState.position < 0) {
        if (repeatMode === 2) shuffleState.position = shuffleState.playlist.length - 1;
        else {
          shuffleState.position = 0; // evita underflow
          return;
        }
      }
      const item = shuffleState.playlist[shuffleState.position];
      if (!item) return;
      const { album, index } = item;
      setTrack(album, index);
      return;
    }

    if (!selectedAlbum) return;

    let prev = currentTrackIndex - 1;
    if (prev < 0) {
      if (repeatMode === 2) prev = selectedAlbum.tracks.length - 1;
      else return;
    }

    setTrack(selectedAlbum, prev);
  };

  repeatBtn.addEventListener('click', () => {
    repeatMode = (repeatMode + 1) % 3;
    if (repeatMode === 0) showToast("🔁 Repetición desactivada");
    if (repeatMode === 1) showToast("🔂 Repitiendo la pista actual");
    if (repeatMode === 2) showToast("🔁 Repitiendo la lista completa");
  });

  audio.addEventListener("ended", () => {
    if (repeatMode === 1) {
      audio.currentTime = 0;
      audio.play();
      return;
    }
    playNextTrack();
  });

  nextBtn.addEventListener('click', playNextTrack);
  prevBtn.addEventListener('click', playPrevTrack);

  // === UPLOAD: botón + input + gestión de archivos locales (session-only) ===
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      // Reiniciar shuffle para aislar uploads y evitar mezclas
      shuffleState = { type: null, playlist: [], position: 0, albumId: null };
      shuffleBtn.classList.remove('active');

      const uploadsAlbum = ensureUploadsAlbum();
      const firstNewIndex = uploadsAlbum.tracks.length;

      // Añadir tracks temporales con objectURL
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

      // seleccionar el album uploads y mostrarlo
      selectedAlbum = uploadsAlbum;
      renderAlbums();
      renderTrackList(uploadsAlbum);
      showTracksSection();

      // Cargar la primera subida en el reproductor pero NO autoplay (seguridad)
      if (uploadsAlbum.tracks[firstNewIndex]) {
        setTrack(uploadsAlbum, firstNewIndex, false);
      }

      showToast(`Se subieron ${files.length} archivo(s).`, 1500);

      // Obtener metadata (duración) y actualizar cada pista cuando esté lista
      files.forEach((file, idx) => {
        const trackIndex = firstNewIndex + idx;
        const tmpAudio = document.createElement('audio');
        tmpAudio.preload = 'metadata';
        const u = URL.createObjectURL(file);
        tmpAudio.src = u;
        tmpAudio.addEventListener('loadedmetadata', () => {
          uploadsAlbum.tracks[trackIndex].duration = formatDuration(tmpAudio.duration);
          // Liberar objeto si querés:
          URL.revokeObjectURL(u);
          if (selectedAlbum && selectedAlbum.id === uploadsAlbum.id) renderTrackList(uploadsAlbum);
        }, { once: true });
        tmpAudio.addEventListener('error', () => {
          uploadsAlbum.tracks[trackIndex].duration = '0:00';
          if (selectedAlbum && selectedAlbum.id === uploadsAlbum.id) renderTrackList(uploadsAlbum);
        }, { once: true });
      });

      // limpiar input para permitir subir mismo archivo otra vez si se desea
      fileInput.value = '';
    });
  } else {
    console.warn('uploadBtn o fileInput no encontrados en DOM. Si querés subir archivos añade el HTML correspondiente.');
  }

  // === CARGA INICIAL (albums.json) ===
  try {
    const res = await fetch('./data/albums.json');
    albums = await res.json();
    renderAlbums();
  } catch (err) {
    console.error("❌ Error al cargar álbumes:", err);
  }

  console.log("✅ Setup completo. Listo para reproducir.");
}); // fin DOMContentLoaded
