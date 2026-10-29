import { Howl } from 'howler';

// Helper function to dynamically generate standard game sound effects as local browser Blobs
// This avoids 403 Forbidden errors from external hotlink-protected CDNs
function generateBeepWav(frequency, duration, type = 'sine') {
    const sampleRate = 8000;
    const numSamples = sampleRate * duration;
    const buffer = new ArrayBuffer(44 + numSamples);
    const view = new DataView(buffer);

    const writeString = (v, offset, string) => {
        for (let i = 0; i < string.length; i++) {
            v.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + numSamples, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (PCM) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate */
    view.setUint32(28, sampleRate, true);
    /* block align */
    view.setUint16(32, 1, true);
    /* bits per sample */
    view.setUint16(34, 8, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, numSamples, true);

    // Generate synth samples
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;
        
        if (type === 'sine') {
            sample = Math.sin(2 * Math.PI * frequency * t);
        } else if (type === 'square') {
            sample = Math.sin(2 * Math.PI * frequency * t) >= 0 ? 1.0 : -1.0;
        } else if (type === 'sawtooth') {
            sample = 2.0 * (t * frequency - Math.floor(t * frequency + 0.5));
        }

        // Fade out at the end to prevent click pops
        const fadeStart = numSamples * 0.8;
        if (i > fadeStart) {
            const fadeRatio = (numSamples - i) / (numSamples - fadeStart);
            sample *= fadeRatio;
        }

        // Scale to 8-bit unsigned PCM [0, 255]
        const val = Math.floor((sample + 1.0) * 127.5);
        view.setUint8(44 + i, val);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
}

class SoundManager {
    constructor() {
        this.music = new Howl({
            src: ['/assets/Digital_Overdrive.mp3'],
            loop: true,
            volume: 0.3,
            html5: true
        });

        // Initialize with dynamically generated audio URLs
        this.sfx = {
            click: new Howl({
                src: [generateBeepWav(600, 0.12, 'sine')],
                format: ['wav'],
                volume: 0.4
            }),
            success: new Howl({
                src: [generateBeepWav(520, 0.25, 'sine')],
                format: ['wav'],
                volume: 0.5
            }),
            defeat: new Howl({
                src: [generateBeepWav(160, 0.35, 'sawtooth')],
                format: ['wav'],
                volume: 0.4
            }),
            warning: new Howl({
                src: [generateBeepWav(380, 0.2, 'square')],
                format: ['wav'],
                volume: 0.3
            }),
            damage: new Howl({
                src: [generateBeepWav(110, 0.45, 'sawtooth')],
                format: ['wav'],
                volume: 0.6
            }),
            victory: new Howl({
                src: [generateBeepWav(780, 0.4, 'sine')],
                format: ['wav'],
                volume: 0.55
            }),
            alarm: new Howl({
                src: [generateBeepWav(440, 0.25, 'square')],
                format: ['wav'],
                volume: 0.45
            }),
            drain: new Howl({
                src: [generateBeepWav(240, 0.18, 'sawtooth')],
                format: ['wav'],
                volume: 0.45
            })
        };

        this.isMuted = true;
    }

    playMusic() {
        if (!this.isMuted && !this.music.playing()) {
            this.music.play();
        }
    }

    pauseMusic() {
        this.music.pause();
    }

    setMute(mute) {
        this.isMuted = mute;
        if (mute) {
            this.music.pause();
        } else {
            this.playMusic();
        }
    }

    playSFX(name) {
        if (!this.isMuted && this.sfx[name]) {
            this.sfx[name].play();
        }
    }
}

const instance = new SoundManager();
export default instance;
