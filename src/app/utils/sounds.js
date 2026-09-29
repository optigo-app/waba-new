'use client';

import { getAudioContext, unlockNotificationAudio } from './notificationSound';

/* Campaign countdown sounds — Web Audio API, no external files needed.
   unlockNotificationAudio() must run inside a user gesture (e.g. the
   launch-confirm click) so later interval ticks are allowed to play. */

const playTone = ({ frequency, start = 0, peak = 0.08, attack = 0.005, duration = 0.07, type = 'square' }) => {
    const audioCtx = getAudioContext();
    if (!audioCtx || audioCtx.state === 'closed') return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }

    const t = audioCtx.currentTime + start;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
};

export const playTick = () => {
    try {
        playTone({ frequency: 1800, peak: 0.05, duration: 0.05 });
    } catch (e) {
        // Silently fail
    }
};

export const playLaunchSound = () => {
    try {
        playTone({ frequency: 880, peak: 0.12, attack: 0.02, duration: 0.25, type: 'sine' });
        playTone({ frequency: 1320, start: 0.12, peak: 0.12, attack: 0.02, duration: 0.3, type: 'sine' });
    } catch (e) {
        // Silently fail
    }
};

export const unlockCountdownAudio = () => {
    try {
        unlockNotificationAudio();
    } catch (e) {
        // Silently fail
    }
};
