export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60) || 0;
    const secs = Math.floor(seconds % 60) || 0;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDuration(sec) {
    if (!isFinite(sec) || sec <= 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export const shuffleArray = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

// color mapper usado por espectrograma
export function ffmpegColor(value) {
    const v = value / 255;
    let r = 0, g = 0, b = 0;
    if (v <= 0.25) { r = v * 4 * 64; g = 0; b = 128 + v * 4 * 127; }
    else if (v <= 0.5) { r = 64 + (v - 0.25) * 4 * 191; g = 0; b = 255 - (v - 0.25) * 4 * 64; }
    else if (v <= 0.75) { r = 255; g = (v - 0.5) * 4 * 128; b = 191 - (v - 0.5) * 4 * 191; }
    else { r = 255; g = 128 + (v - 0.75) * 4 * 127; b = 0; }
    return `rgb(${r},${g},${b})`;
}
