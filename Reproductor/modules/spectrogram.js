import { sharedAnalyser, sharedAudioCtx } from './audio.js';
import { ffmpegColor } from './utils.js';
import { DOM } from './dom.js';
import { drawScale } from './scale.js';

let spectroCtx = null;
let spectroAnimation = null;
let spectroActive = false;

export function startSpectrogram() {
    const canvasEl = DOM.spectrogramCanvas || document.getElementById("spectrogram-canvas");
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

    const drawSpectrogram = () => {
        if (!spectroActive) return;
        sharedAnalyser.getByteFrequencyData(dataArray);

        // scroll 1px left
        const imageData = ctx.getImageData(1, 0, canvasEl.width - 1, canvasEl.height);
        ctx.putImageData(imageData, 0, 0);

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
    drawScale();
}

export function stopSpectrogram() {
    spectroActive = false;
    if (spectroAnimation) cancelAnimationFrame(spectroAnimation);
}
