import { DOM } from './modules/dom.js';
import { state } from './modules/state.js';
import { initAudioMotion } from './modules/audio.js';
import { drawScale } from './modules/scale.js';
import { showToast } from './modules/toast.js';
import { renderAlbums, renderTrackList, renderShuffleTracklist, showAlbumsSection, showTracksSection } from './modules/render.js';
import { createGlobalShuffle, createAlbumShuffle } from './modules/shuffle.js';
import { togglePlayPause, setTrack, playNextTrack, playPrevTrack, updateProgressUI } from './modules/controls.js';
import { startSpectrogram, stopSpectrogram } from './modules/spectrogram.js';
import { initUploadListeners, ensureUploadsAlbum } from './modules/uploads.js';

// DOMContentLoaded initializer
document.addEventListener('DOMContentLoaded', async () => {
  console.log("🎧 Iniciando...");
  drawScale();

  // init audioMotion
  initAudioMotion(DOM.canvas);

  // progress initial hook
  updateProgressUI();
  // attach audio listeners
  const { playPauseBtn, shuffleBtn, prevBtn, nextBtn, repeatBtn, showAlbumsBtn, showTracksBtn, themeButtons } = DOM;
  const audioEl = document.getElementById('player-audio') || window.audio;

  audioEl.addEventListener("timeupdate", updateProgressUI);
  audioEl.addEventListener("loadedmetadata", () => {
    DOM.totalTimeSpan.textContent = (audioEl.duration ? Math.floor(audioEl.duration / 60) + ':' + Math.floor(audioEl.duration % 60).toString().padStart(2, '0') : '0:00');
    updateProgressUI();
  });

  // THEME buttons
  // VOLUME CONTROL
  const volumeBtn = document.getElementById('volume-btn');
  const volumeSliderWrapper = document.getElementById('volume-slider-wrapper');
  const volumeSlider = document.getElementById('volume-slider');

  if (volumeBtn && volumeSliderWrapper) {
    volumeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      volumeSliderWrapper.classList.toggle('show');
    });

    // Close slider when clicking outside
    document.addEventListener('click', (e) => {
      if (!volumeBtn.contains(e.target) && !volumeSliderWrapper.contains(e.target)) {
        volumeSliderWrapper.classList.remove('show');
      }
    });
  }

  if (volumeSlider) {
    const volumeValueText = document.getElementById('volume-value');

    function updateVolumeUI(val) {
      // Update audio volume
      audioEl.volume = val;

      // Update text
      if (volumeValueText) {
        volumeValueText.textContent = Math.round(val * 100);
      }

      // Update gradient variable
      const percent = val * 100;
      volumeSlider.style.setProperty('--volume', percent + '%');
    }

    // Init
    updateVolumeUI(audioEl.volume);

    volumeSlider.addEventListener('input', (e) => {
      updateVolumeUI(e.target.value);
    });
  }

  // LOAD DATA FUNCTION
  async function loadAlbumsData(url) {
    try {
      const res = await fetch(url);
      state.albums = await res.json();
      // Reset player state to avoid conflicts
      stopCurrentPlayback();
      renderAlbums();
      // If in secret mode, might want to auto-select first or just wait
      if (document.body.classList.contains('secret-mode')) {
        showToast("🔓 MODO SECRETO ACTIVADO");
      } else {
        // showToast("💿 MODO NORMAL");
      }
    } catch (err) {
      console.error("❌ Error al cargar álbumes:", err);
      showToast("❌ Error al cargar datos");
    }
  }

  function stopCurrentPlayback() {
    audioEl.pause();
    audioEl.src = "";
    audioEl.currentTime = 0;
    state.selectedAlbum = null;
    state.currentTrackIndex = 0;
    state.shuffleState = { type: null, playlist: [], position: 0, albumId: null };

    // UI Reset
    // Instead of hardcoding, we just reset text/values and let updatePlayButtonIcon handle the icon
    // But we need to ensure the button HAS an image element if it was cleared (unlikely)
    // The original code reset it to fresh HTML. Let's do that but generic.
    DOM.playPauseBtn.innerHTML = `<img src="" alt="">`;
    updatePlayButtonIcon(); // This will fill src correctly based on mode

    DOM.songTitleElem.textContent = "Título de la canción";
    DOM.albumNameElem.textContent = "Álbum - Artista";
    DOM.progressBar.value = 0;
    DOM.currentTimeSpan.textContent = "0:00";
    DOM.totalTimeSpan.textContent = "0:00";

    updateProgressUI();

    // Force view reset to Albums
    DOM.trackList.innerHTML = ""; // Clear old tracks
    showAlbumsSection(); // Switch view
  }

  // Helper function to update icons based on current mode
  function updateIcons() {
    let suffix = '-day';
    if (document.body.classList.contains('secret-mode')) {
      suffix = '-secret';
    } else if (document.body.classList.contains('christmas-mode')) {
      suffix = '-christmas';
    } else if (document.body.classList.contains('dark-mode')) {
      suffix = '-night';
    }

    // Updated selectors to include visual mode icons, volume, and others
    const imagesToSwap = document.querySelectorAll('.forentec-icon, .controls img, .project-title img, .background-footer, .background-footer-night, .visual-dropdown-selected img, .visual-option img, .volume-btn img, .uploadMusic, .toggle-btn img');
    const suffixes = ['-day', '-night', '-secret', '-christmas'];

    imagesToSwap.forEach(img => {
      if (!img || !img.src) return;

      // Special handling for play/pause button to ensure we don't flip play to pause incorrectly
      // The play/pause icon logic is handled specifically by updatePlayButtonIcon, 
      // but if we are here, we might be swapping the SUFFIX for the CURRENT state.
      // However, to be safe, let's defer play-btn updates to updatePlayButtonIcon 
      // if this image is indeed the play button icon.
      if (img.closest('#play-pause-btn')) {
        updatePlayButtonIcon();
        return;
      }

      // Find which suffix the current image has
      const currentSuffix = suffixes.find(s => img.src.includes(s));

      if (currentSuffix) {
        // Only replace if it's different
        if (currentSuffix !== suffix) {
          img.src = img.src.replace(currentSuffix, suffix);
        }
      }
    });

    // Also update play button explicitly to matches current state
    updatePlayButtonIcon();

    // Explicitly update background-footer visibility if needed (CSS usually handles this but let's be safe)
  }

  function updatePlayButtonIcon() {
    const playBtnImg = document.querySelector('#play-pause-btn img');
    if (!playBtnImg) return;

    let suffix = '-day.png'; // Default
    if (document.body.classList.contains('secret-mode')) {
      suffix = '-secret.png';
    } else if (document.body.classList.contains('christmas-mode')) {
      suffix = '-christmas.png';
    } else if (document.body.classList.contains('dark-mode')) {
      suffix = '-night.png';
    }

    // Determine state
    const isPaused = audioEl.paused;
    const iconName = isPaused ? 'play' : 'pause';

    // Construct new source
    // We assume the path is fixed relative to ./assets/icons/
    const newSrc = `./assets/icons/${iconName}${suffix}`;

    // Only update if different to avoid flickering (though src change usually fine)
    if (!playBtnImg.src.endsWith(newSrc.replace('./', ''))) { // Simple check
      // Retain path context if needed, but here we can just set it
      playBtnImg.src = newSrc;
    }
  }

  // SECRET MODE TRIGGER
  const projectTitles = document.querySelectorAll('.project-title');
  projectTitles.forEach(title => {
    title.addEventListener('click', () => {
      if (document.body.classList.contains('secret-mode')) return; // Already secret

      document.body.classList.add('secret-mode');
      document.body.classList.remove('dark-mode', 'christmas-mode');

      // Deselect all theme buttons
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));

      // Load secret data
      loadAlbumsData('./data/secret_albums.json');

      // Update icons
      updateIcons();
    });
  });

  // THEME buttons logic (Updated for Secret Mode exit)
  const themeContainer = document.getElementById('theme-toggle-container');
  if (themeContainer) { // Safety check
    const themeButtons = themeContainer.querySelectorAll('.toggle-btn');

    themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {

        // If exiting secret mode, reload normal data
        if (document.body.classList.contains('secret-mode')) {
          document.body.classList.remove('secret-mode');
          loadAlbumsData('./data/albums.json');
        }

        // 1. Remove active class from all
        themeButtons.forEach(b => b.classList.remove('active'));

        // 2. Add active to clicked
        btn.classList.add('active');

        // 3. Update body classes
        const theme = btn.dataset.theme;
        document.body.classList.remove('dark-mode', 'christmas-mode');

        if (theme === 'dark') {
          document.body.classList.add('dark-mode');
        } else if (theme === 'christmas') {
          document.body.classList.add('christmas-mode');
        }
        // 'light' just removes the classes

        // 4. Update images logic
        updateIcons();

        drawScale();

        // 5. Reorder buttons: Move valid active button to start of container
        themeContainer.prepend(btn);
      });
    });
  }

  // Visual mode dropdown logic
  const visualDropdown = document.getElementById('visual-dropdown');
  const visualSelected = document.getElementById('visual-selected');
  const visualOptions = document.getElementById('visual-options');
  const visualizerVideo = document.getElementById('visualizer-video');

  if (visualSelected && visualOptions) {
    // Toggle menu
    visualSelected.addEventListener('click', (e) => {
      e.stopPropagation();
      visualOptions.classList.toggle('show');
    });

    // Option selection
    document.querySelectorAll('.visual-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const mode = opt.dataset.mode;
        const iconSrc = opt.querySelector('img').src;
        const text = opt.textContent.trim();

        // Update selected button UI
        visualSelected.innerHTML = `<img src="${iconSrc}" alt=""> ${text}`;

        // Switch modes
        if (mode === "bars") {
          stopSpectrogram();
          if (DOM.spectrogramCanvas) DOM.spectrogramCanvas.style.display = 'none';
          if (visualizerVideo) { visualizerVideo.style.display = 'none'; visualizerVideo.pause(); }
          if (DOM.audioMotionContainer) DOM.audioMotionContainer.style.display = 'block';
          if (window.audioMotion) {
            window.audioMotion.mode = 0;
            window.audioMotion.analyzerType = "frequency";
            window.audioMotion.gradient = 'rainbow';
          }
          console.log("🎛️ Frecuencias activado");
        } else if (mode === "spectrogram") {
          console.log("🎚️ Espectrograma activado");
          if (DOM.audioMotionContainer) DOM.audioMotionContainer.style.display = 'none';
          if (visualizerVideo) { visualizerVideo.style.display = 'none'; visualizerVideo.pause(); }

          if (DOM.spectrogramCanvas) DOM.spectrogramCanvas.style.display = 'block';

          DOM.spectrogramCanvas.width = DOM.spectrogramCanvas.clientWidth;
          DOM.spectrogramCanvas.height = DOM.spectrogramCanvas.clientHeight;

          stopSpectrogram();
          if (!audioEl.paused) startSpectrogram();
          else audioEl.addEventListener("play", startSpectrogram, { once: true });

          drawScale();
        } else if (mode === "visualizer") {
          // Video Visualizer Mode
          stopSpectrogram();
          if (DOM.spectrogramCanvas) DOM.spectrogramCanvas.style.display = 'none';
          if (DOM.audioMotionContainer) DOM.audioMotionContainer.style.display = 'none';

          if (visualizerVideo) {
            visualizerVideo.style.display = 'block';
            visualizerVideo.play().catch(e => console.warn("Video autoplay failed", e));
          }
          console.log("✨ Visualizer video activado");
        }

        // Hide options
        visualOptions.classList.remove('show');
      });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!visualDropdown.contains(e.target)) {
        visualOptions.classList.remove('show');
      }
    });
  }

  // PLAY/PAUSE events to sync icon
  // We attach these directly to the audio element to catch all state changes
  audioEl.addEventListener('play', updatePlayButtonIcon);
  audioEl.addEventListener('pause', updatePlayButtonIcon);

  // PLAY/PAUSE
  if (DOM.playPauseBtn) DOM.playPauseBtn.addEventListener('click', togglePlayPause);

  // SHUFFLE button logic (keeps same behavior)
  if (DOM.shuffleBtn) {
    DOM.shuffleBtn.addEventListener('click', () => {
      if (state.selectedAlbum) {
        if (state.shuffleState.type === 'album' && state.shuffleState.albumId === state.selectedAlbum.id) {
          state.shuffleState = { type: null, playlist: [], position: 0, albumId: null };
          renderTrackList(state.selectedAlbum);
          DOM.shuffleBtn.classList.remove('active');
        } else {
          createAlbumShuffle(state.selectedAlbum);
          renderShuffleTracklist();
          if (!audioEl.paused && audioEl.src && audioEl.src.includes(String(state.selectedAlbum.id))) {
            // nothing
          } else {
            const first = state.shuffleState.playlist[0];
            if (first) setTrack(first.album, first.index);
          }
          DOM.shuffleBtn.classList.add('active');
        }
        showTracksSection();
        return;
      }

      if (state.shuffleState.type === 'global') {
        state.shuffleState = { type: null, playlist: [], position: 0, albumId: null };
        renderAlbums();
        showAlbumsSection();
        highlightAlbum(null);
        DOM.shuffleBtn.classList.remove('active');
      } else {
        createGlobalShuffle();
        renderShuffleTracklist();
        const first = state.shuffleState.playlist[0];
        if (first) setTrack(first.album, first.index);
        DOM.shuffleBtn.classList.add('active');
        showTracksSection();
      }
    });
  }

  // SHOW ALBUMS
  if (DOM.showAlbumsBtn) DOM.showAlbumsBtn.addEventListener('click', () => { renderAlbums(); showAlbumsSection(); });

  // SHOW TRACKS
  if (DOM.showTracksBtn) DOM.showTracksBtn.addEventListener('click', () => {
    if (state.shuffleState.type === 'global') {
      renderShuffleTracklist();
      DOM.shuffleBtn.classList.add('active');
      showTracksSection();
      return;
    }

    if (state.shuffleState.type === 'album') {
      if (state.selectedAlbum && state.shuffleState.albumId === state.selectedAlbum.id) {
        renderShuffleTracklist();
        DOM.shuffleBtn.classList.add('active');
      } else {
        state.shuffleState = { type: null, playlist: [], position: 0, albumId: null };
        DOM.shuffleBtn.classList.remove('active');
        if (state.selectedAlbum) renderTrackList(state.selectedAlbum);
        else renderAlbums();
      }
      showTracksSection();
      return;
    }

    if (state.selectedAlbum && state.shuffleState.type !== 'global') {
      renderTrackList(state.selectedAlbum);
      DOM.shuffleBtn.classList.remove('active');
      showTracksSection();
      return;
    }

    const allTracks = state.albums.flatMap(a =>
      a.tracks.map(t => ({ album: a, title: t.title, duration: t.duration }))
    );

    DOM.trackList.innerHTML = allTracks.map((t, i) => `
      <li data-index="${i}">
        <span>${i + 1}. ${t.title} <em>(${t.album.title})</em></span>
        <span>${t.duration || '0:00'}</span>
      </li>
    `).join('');

    document.querySelectorAll('#track-list li').forEach((li, i) => {
      const { album } = allTracks[i];
      li.addEventListener('click', () => {
        state.selectedAlbum = album;
        // highlightAlbum from render.js not imported here to avoid circular import; use DOM manipulation
        document.querySelectorAll('.album-card').forEach(card =>
          card.classList.toggle('selected', card.dataset.id == album.id)
        );
        state.shuffleState = { type: null, playlist: [], position: 0, albumId: null };
        DOM.shuffleBtn.classList.remove('active');
        const trackIdx = album.tracks.findIndex(tt => tt.title === allTracks[i].title);
        setTrack(album, trackIdx);
      });
    });

    DOM.shuffleBtn.classList.remove('active');
    showTracksSection();
  });

  // AUDIO events: ended (repeat logic)
  audioEl.addEventListener("ended", () => {
    if (state.repeatMode === 1) {
      audioEl.currentTime = 0;
      audioEl.play();
      return;
    }
    playNextTrack();
  });

  if (DOM.nextBtn) DOM.nextBtn.addEventListener('click', playNextTrack);
  if (DOM.prevBtn) DOM.prevBtn.addEventListener('click', playPrevTrack);

  // Progress input
  if (DOM.progressBar) {
    DOM.progressBar.addEventListener('input', () => {
      if (!audioEl.duration) return;
      audioEl.currentTime = (DOM.progressBar.value / 100) * audioEl.duration;
    });
  }

  // Repeat button
  if (DOM.repeatBtn) DOM.repeatBtn.addEventListener('click', () => {
    state.repeatMode = (state.repeatMode + 1) % 3;
    if (state.repeatMode === 0) showToast("🔁 Repetición desactivada");
    if (state.repeatMode === 1) showToast("🔂 Repitiendo la pista actual");
    if (state.repeatMode === 2) showToast("🔁 Repitiendo la lista completa");
  });

  // Custom events from render (track-click / shuffle-track-click)
  document.addEventListener('track-click', (e) => {
    const { albumId, index } = e.detail;
    const album = state.albums.find(a => a.id == albumId);
    if (album) setTrack(album, index);
  });

  document.addEventListener('shuffle-track-click', (e) => {
    const { shuffleIndex } = e.detail;
    const item = state.shuffleState.playlist[shuffleIndex];
    if (item) {
      state.shuffleState.position = shuffleIndex;
      setTrack(item.album, item.index);
    }
  });

  // Init uploads listeners
  initUploadListeners();

  // Load albums.json initially
  loadAlbumsData('./data/albums.json');

  console.log("✅ Setup completo. Listo para reproducir.");
});
