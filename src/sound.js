import { saveSoundSetting } from './storage.js';

let enabled = true;
let activated = false;
let context;
let output;
let drone;
let transition;
let lastBlocked = -Infinity;

function shouldPlay() {
  return activated && enabled && !document.hidden;
}

function syncAudio() {
  const playing = shouldPlay();
  try {
    if (!context) {
      if (!playing) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      context = new AudioContext();
      output = context.createGain();
      output.connect(context.destination);
    }

    output.gain.value = Number(playing);
    if (!playing) stopAmbientDrone();
    if (transition) return;

    if ((context.state === 'running') === playing) {
      if (playing) startAmbientDrone();
      return;
    }

    transition = playing ? context.resume() : context.suspend();
    transition.then(() => {
      transition = undefined;
      if (playing !== shouldPlay()) syncAudio();
      else if (playing && context.state === 'running') startAmbientDrone();
    }).catch(() => {
      transition = undefined;
      if (playing !== shouldPlay()) syncAudio();
    });
  } catch (error) {
    console.warn('Crateveil audio is unavailable:', error);
  }
}

export function initSound(soundOn) {
  enabled = soundOn;
  const unlock = event => {
    if (!event.isTrusted) return;
    activated = true;
    if (context?.state !== 'running' && enabled) syncAudio();
  };
  window.addEventListener('click', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
  document.addEventListener('visibilitychange', syncAudio);
}

function startAmbientDrone() {
  if (drone) return;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 150;
  const gain = context.createGain();
  gain.gain.value = 0.04;
  filter.connect(gain);
  gain.connect(output);

  const low = context.createOscillator();
  low.type = 'sawtooth';
  low.frequency.value = 55;
  low.connect(filter);
  const high = context.createOscillator();
  high.type = 'triangle';
  high.frequency.value = 82.4;
  high.connect(filter);

  const modulation = context.createOscillator();
  modulation.frequency.value = 0.05;
  const range = context.createGain();
  range.gain.value = 40;
  modulation.connect(range);
  range.connect(filter.frequency);

  const oscillators = [low, high, modulation];
  drone = { oscillators, nodes: [...oscillators, range, filter, gain] };
  oscillators.forEach(oscillator => oscillator.start());
}

function stopAmbientDrone() {
  if (!drone) return;
  drone.oscillators.forEach(oscillator => oscillator.stop());
  drone.nodes.forEach(node => node.disconnect());
  drone = null;
}

export function setSoundEnabled(soundOn) {
  if (enabled === soundOn) return;
  enabled = soundOn;
  syncAudio();
}

export function toggleSound() {
  setSoundEnabled(!enabled);
  saveSoundSetting(enabled);
  return enabled;
}

function withAudio(play) {
  if (!shouldPlay() || context?.state !== 'running') return;
  try {
    play();
  } catch (error) {
    console.warn('Crateveil audio effect is unavailable:', error);
  }
}

function tone({ type = 'sine', frequency, endFrequency, volume, duration, delay = 0 }) {
  const start = context.currentTime + delay;
  const end = start + duration;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, end);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.01, end);
  oscillator.connect(gain);
  gain.connect(output);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
  oscillator.start(start);
  oscillator.stop(end);
}

export function playMove() {
  withAudio(() => tone({ frequency: 140, endFrequency: 70, volume: 0.12, duration: 0.08 }));
}

export function playPush() {
  withAudio(() => tone({ type: 'triangle', frequency: 110, endFrequency: 50, volume: 0.18, duration: 0.15 }));
}

export function playBlocked() {
  withAudio(() => {
    if (context.currentTime - lastBlocked < 0.12) return;
    lastBlocked = context.currentTime;
    tone({ type: 'sawtooth', frequency: 80, volume: 0.06, duration: 0.1 });
  });
}

export function playCrateTarget() {
  withAudio(() => [392, 523.25].forEach((frequency, index) => {
    tone({ frequency, volume: 0.08, duration: 0.2, delay: index * 0.1 });
  }));
}

export function playWin() {
  withAudio(() => [261.63, 329.63, 392, 523.25].forEach((frequency, index) => {
    tone({ frequency, volume: 0.1, duration: 0.25, delay: index * 0.08 });
  }));
}
