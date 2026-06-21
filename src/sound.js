let soundEnabled = true;
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function initSound(enabled) {
  soundEnabled = enabled;
}

let droneOsc1 = null;
let droneOsc2 = null;
let droneGain = null;
let droneLfo = null;
let droneLfoGain = null;

export function startAmbientDrone() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (droneOsc1) return; // Already running
    
    // Create gain node for the drone
    droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.04, ctx.currentTime); // Keep it very soft
    
    // Lowpass filter to make it warm and deep
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, ctx.currentTime);
    
    // Osc 1: A1 note (55 Hz)
    droneOsc1 = ctx.createOscillator();
    droneOsc1.type = 'sawtooth';
    droneOsc1.frequency.setValueAtTime(55, ctx.currentTime);
    
    // Osc 2: E2 note (82.4 Hz, fifth interval)
    droneOsc2 = ctx.createOscillator();
    droneOsc2.type = 'triangle';
    droneOsc2.frequency.setValueAtTime(82.4, ctx.currentTime);
    
    // Slow LFO to modulate filter frequency for movement
    droneLfo = ctx.createOscillator();
    droneLfo.type = 'sine';
    droneLfo.frequency.setValueAtTime(0.05, ctx.currentTime); // 20s cycle
    
    droneLfoGain = ctx.createGain();
    droneLfoGain.gain.setValueAtTime(40, ctx.currentTime); // Modulate filter between 110Hz and 190Hz
    
    // Connect LFO
    droneLfo.connect(droneLfoGain);
    droneLfoGain.connect(filter.frequency);
    
    // Connect audio path
    droneOsc1.connect(filter);
    droneOsc2.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(ctx.destination);
    
    // Start oscillators
    droneOsc1.start();
    droneOsc2.start();
    droneLfo.start();
  } catch (e) {
    console.warn("startAmbientDrone failed:", e);
  }
}

export function stopAmbientDrone() {
  try {
    if (droneOsc1) {
      droneOsc1.stop();
      droneOsc1.disconnect();
      droneOsc1 = null;
    }
    if (droneOsc2) {
      droneOsc2.stop();
      droneOsc2.disconnect();
      droneOsc2 = null;
    }
    if (droneLfo) {
      droneLfo.stop();
      droneLfo.disconnect();
      droneLfo = null;
    }
    if (droneGain) {
      droneGain.disconnect();
      droneGain = null;
    }
  } catch (e) {
    console.warn("stopAmbientDrone failed:", e);
  }
}

export function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem('crateveil.sound', soundEnabled ? 'on' : 'off');
  if (soundEnabled) {
    startAmbientDrone();
  } else {
    stopAmbientDrone();
  }
  return soundEnabled;
}

export function playCrateTarget() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [392.00, 523.25]; // G4, C5
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.1);
      
      gain.gain.setValueAtTime(0.08, now + index * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.1 + 0.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + index * 0.1);
      osc.stop(now + index * 0.1 + 0.2);
    });
  } catch (e) {
    console.warn("Audio playCrateTarget failed:", e);
  }
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function playMove() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.warn("Audio playMove failed:", e);
  }
}

export function playPush() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.warn("Audio playPush failed:", e);
  }
}

export function playBlocked() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.warn("Audio playBlocked failed:", e);
  }
}

export function playWin() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    const now = ctx.currentTime;
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);
      
      gain.gain.setValueAtTime(0.1, now + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.08 + 0.25);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.25);
    });
  } catch (e) {
    console.warn("Audio playWin failed:", e);
  }
}
