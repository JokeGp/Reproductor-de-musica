import { DOM } from './dom.js';

// audio element (in DOM) o fallback a new Audio si no encontrado
export const audio = document.getElementById('player-audio') || new Audio("./assets/audio/el-diablito-loco.mp3");
audio.crossOrigin = "anonymous";

// contexto/analyser compartido
export const sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
export const sharedSource = sharedAudioCtx.createMediaElementSource(audio);
export const sharedAnalyser = sharedAudioCtx.createAnalyser();
sharedAnalyser.fftSize = 2048;

// Conexiones
sharedSource.connect(sharedAnalyser);
sharedAnalyser.connect(sharedAudioCtx.destination);

// audioMotion holder
export let audioMotion = null;

export function initAudioMotion(canvasEl) {
    // canvasEl puede ser el DOM.canvas o un elemento pasado
    const c = canvasEl || DOM.canvas;
    if (!c) return null;
    audioMotion = new AudioMotionAnalyzer(c, {
        audioCtx: sharedAudioCtx,
        source: sharedSource,
        height: c.clientHeight,
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
    return audioMotion;
}
