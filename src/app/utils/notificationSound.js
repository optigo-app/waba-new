'use client';

// Web Audio API notification pop — no external files needed
let audioCtx = null;
let isAudioUnlocked = false;

const canCreateAudioContext = () => {
    if (typeof navigator === 'undefined' || !navigator.userActivation) return true;
    return navigator.userActivation.isActive;
};

export const getAudioContext = () => audioCtx;

export const unlockNotificationAudio = () => {
    if (isAudioUnlocked && audioCtx?.state !== 'closed') {
        if (audioCtx?.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext || !canCreateAudioContext()) return;

    try {
        audioCtx = new AudioContext();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        gain.gain.value = 0.001;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.01);
        audioCtx.resume().catch(() => {});
        isAudioUnlocked = true;
    } catch (e) {
        // Silently fail
    }
};

export const playNotificationSound = () => {
    try {
        if (!audioCtx) return;
        if (audioCtx.state === 'closed') return;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }

        const now = audioCtx.currentTime;

        // Short pleasant pop (two quick notes)
        const playNote = (freq, delay, vol, duration) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + delay);
            gain.gain.setValueAtTime(vol, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + delay);
            osc.stop(now + delay + duration);
        };

        playNote(880, 0, 0.12, 0.12);   // A5
        playNote(1108.73, 0.08, 0.08, 0.1); // C#6

        // Context is kept open and reused for subsequent sounds
    } catch (e) {
        // Silently fail
    }
};
