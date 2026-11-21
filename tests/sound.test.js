import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initSound, playBlocked, playMove, setSoundEnabled } from '../src/sound.js';

function param() {
  return { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} };
}

function node() {
  return { connect() {}, disconnect() {}, start() {}, stop() {} };
}

test('audio waits for a gesture, handles mute during resume, and throttles blocked moves', async () => {
  let audio;
  class TestAudioContext {
    state = 'suspended';
    currentTime = 0;
    destination = {};
    transitions = [];
    oscillators = 0;

    constructor() { audio = this; }
    createGain() { return { ...node(), gain: param() }; }
    createBiquadFilter() { return { ...node(), frequency: param() }; }
    createOscillator() {
      this.oscillators++;
      return { ...node(), frequency: param() };
    }

    change(state) {
      return new Promise(resolve => {
        this.transitions.push(() => {
          this.state = state;
          resolve();
        });
      });
    }

    resume() { return this.change('running'); }
    suspend() { return this.change('suspended'); }

    async completeTransition() {
      assert.ok(this.transitions.length, 'expected an audio transition');
      this.transitions.shift()();
      await new Promise(resolve => setImmediate(resolve));
    }
  }

  const windowEvents = new Map();
  const documentEvents = new Map();
  globalThis.window = {
    AudioContext: TestAudioContext,
    addEventListener: (type, handler) => windowEvents.set(type, handler)
  };
  globalThis.document = {
    hidden: false,
    addEventListener: (type, handler) => documentEvents.set(type, handler)
  };
  initSound(true);
  windowEvents.get('click')({ isTrusted: false });
  playMove();
  assert.equal(audio, undefined);

  windowEvents.get('click')({ isTrusted: true });
  playMove();
  assert.equal(audio.oscillators, 0, 'effects were not queued on a suspended context');
  setSoundEnabled(false);
  await audio.completeTransition();
  assert.equal(audio.oscillators, 0, 'pending resume did not start the muted drone');
  await audio.completeTransition();
  assert.equal(audio.state, 'suspended');

  setSoundEnabled(true);
  await audio.completeTransition();
  assert.equal(audio.oscillators, 3);
  for (let index = 0; index < 30; index++) playBlocked();
  assert.equal(audio.oscillators, 4, 'rapid collisions create one blocked tone');
  audio.currentTime = 0.13;
  playBlocked();
  assert.equal(audio.oscillators, 5);

  document.hidden = true;
  documentEvents.get('visibilitychange')();
  playMove();
  assert.equal(audio.oscillators, 5, 'hidden game does not schedule effects');
  document.hidden = false;
  documentEvents.get('visibilitychange')();
  await audio.completeTransition();
  await audio.completeTransition();
  assert.equal(audio.state, 'running', 'quick return from the background resumed audio');
  assert.equal(audio.oscillators, 8, 'only one ambient drone restarted');
});
