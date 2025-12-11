// dibujo de escala de frecuencias
export function freqToPosition(freq, height, minFreq = 180, maxFreq = 18900) {
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const logFreq = Math.log10(freq);
    const norm = (logFreq - logMin) / (logMax - logMin);
    return height - norm * height;
}

export function drawScale() {
    const canvasEl = document.getElementById('scale');
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    const height = canvasEl.height;
    const width = canvasEl.width;
    const minFreq = 180;
    const maxFreq = 18900;

    const isDark = document.body.classList.contains('dark-mode');
    const isSecret = document.body.classList.contains('secret-mode');
    const isChristmas = document.body.classList.contains('christmas-mode');

    let lineColor = '#000000';
    let textColor = '#000000';

    if (isDark) {
        lineColor = '#FFFFFF';
        textColor = '#FFFFFF';
    }
    if (isSecret) {
        lineColor = '#FEFAE0';
        textColor = '#FEFAE0';
    }
    if (isChristmas) {
        lineColor = '#E6C695';
        textColor = '#E6C695';
    }

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = lineColor;
    ctx.fillStyle = textColor;
    ctx.font = '10px Hind Madurai';
    ctx.textAlign = 'right';

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
