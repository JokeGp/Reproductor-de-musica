// main.js
document.addEventListener('DOMContentLoaded', () => {
  console.log("Iniciando main.js...");

  // 1) Chequeo que la librería global esté disponible
  console.log("AudioMotionAnalyzer global:", window.AudioMotionAnalyzer);
  if (typeof window.AudioMotionAnalyzer === 'undefined') {
    console.error("AudioMotionAnalyzer NO está disponible. Revisa que el script de UNPKG cargue correctamente y que abras este archivo desde http://localhost (no file://).");
    return;
  }

  // UI refs
  const playPauseBtn = document.getElementById('play-pause-btn');
  const currentTimeSpan = document.getElementById('current-time');
  const totalTimeSpan = document.getElementById('total-time');
  const progressBar = document.getElementById('progress-bar');
  const container = document.getElementById('audio-visualizer');

  // 2) Elemento audio: usar el <audio> del DOM si lo agregaste,
  // o crear uno aquí. Recomiendo usar el <audio id="player-audio"> en HTML.
  const audio = document.getElementById('player-audio') || new Audio("./assets/audio/Code Geass - Opening  COLORS.mp3");
  audio.crossOrigin = "anonymous";

  // 3) Instanciar AudioMotionAnalyzer pero START = false -> evita crear AudioContext antes del gesto del usuario
  const audioMotion = new AudioMotionAnalyzer(container, {
    source: audio,          // pasar la referencia al elemento <audio>
    start: false,           // IMPORTANT: no arrancar hasta que el usuario haga play
    showScaleX: true,
    showScaleY: true,
    showPeaks: true,
    gradient: 'classic',
    mode: 0,
    analyzerType: 'frequency',
    reflexRatio: 0.1,
    smoothing: 0.7,
    height: container.clientHeight || 200
  });

  // 4) Manejo play/pause con control del AudioContext
  async function handlePlayPause() {
    try {
      // Algunos navegadores requieren .resume() en el audioContext del analizador
      if (audio.paused) {
        // Si audioMotion.audioCtx existe y está suspendido, resume
        if (audioMotion.audioCtx && audioMotion.audioCtx.state === 'suspended') {
          await audioMotion.audioCtx.resume();
        }
        // Reproducir audio y arrancar el analyzer
        await audio.play();
        // start analyzer si aún no estaba corriendo
        if (!audioMotion.running) audioMotion.start();
        playPauseBtn.textContent = "⏸ Pausar";
      } else {
        audio.pause();
        // opcional: detener analyzer (no obligatorio si quieres mantener visual)
        if (audioMotion.running) audioMotion.stop();
        playPauseBtn.textContent = "▶ Reproducir";
      }
    } catch (err) {
      console.error("Error al intentar play/pause:", err);
    }
  }

  playPauseBtn.addEventListener('click', handlePlayPause);

  // 5) Tiempo y barra de progreso
  audio.addEventListener('loadedmetadata', () => {
    totalTimeSpan.textContent = formatTime(audio.duration);
  });

  audio.addEventListener('timeupdate', () => {
    currentTimeSpan.textContent = formatTime(audio.currentTime);
    progressBar.value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
  });

  progressBar.addEventListener('input', () => {
    if (audio.duration) audio.currentTime = (progressBar.value / 100) * audio.duration;
  });

  function formatTime(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  console.log("Setup finalizado. Presiona Play para iniciar audio y visualizador.");
});
