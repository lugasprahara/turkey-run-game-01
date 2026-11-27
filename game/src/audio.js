// audio.js — PARDON RUN's sound, made of nothing: a WebAudio oscillator and a gain node, shaped
// into short blips at run time. No audio files, nothing to load, so the game stays fully offline.
// The context is created lazily on the first user gesture (browsers refuse it sooner), and every
// effect is a named one-liner the game loop calls when the world reports an event.

let context = null;
let master = null;
let muted = false;

/** Create the context on the first key press or click; harmless to call again. */
export function unlockAudio() {
  if (context !== null) {
    if (context.state === 'suspended') context.resume();
    return;
  }
  const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
  if (AudioCtor === undefined) return;
  context = new AudioCtor();
  master = context.createGain();
  master.gain.value = 0.16;
  master.connect(context.destination);
}

export function isMuted() {
  return muted;
}

export function toggleMuted() {
  muted = !muted;
  return muted;
}

/** One shaped tone: frequency glides from `from` to `to` over `seconds`. */
function tone(from, to, seconds, type = 'square', when = 0) {
  if (context === null || muted) return;
  const start = context.currentTime + when;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), start + seconds);
  gain.gain.setValueAtTime(0.9, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
  osc.connect(gain);
  gain.connect(master);
  osc.start(start);
  osc.stop(start + seconds + 0.02);
}

export const sfx = {
  jump() {
    tone(320, 660, 0.14, 'square');
  },
  doubleJump() {
    tone(430, 880, 0.14, 'square');
    tone(645, 1180, 0.12, 'triangle', 0.03);
  },
  corn() {
    tone(880, 880, 0.06, 'square');
    tone(1318, 1318, 0.1, 'square', 0.06);
  },
  hit() {
    tone(196, 55, 0.28, 'sawtooth');
  },
  knife() {
    tone(2400, 300, 0.16, 'sawtooth');
  },
  close() {
    tone(1500, 2500, 0.09, 'sine');
  },
  stage() {
    tone(523, 523, 0.09, 'triangle');
    tone(659, 659, 0.09, 'triangle', 0.09);
    tone(784, 784, 0.14, 'triangle', 0.18);
  },
  caught() {
    tone(392, 392, 0.16, 'triangle');
    tone(330, 330, 0.16, 'triangle', 0.16);
    tone(262, 130, 0.4, 'triangle', 0.32);
  },
  escaped() {
    tone(523, 523, 0.1, 'triangle');
    tone(659, 659, 0.1, 'triangle', 0.1);
    tone(784, 784, 0.1, 'triangle', 0.2);
    tone(1046, 1046, 0.26, 'triangle', 0.3);
  },
};
