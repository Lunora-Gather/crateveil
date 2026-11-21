import assert from 'node:assert/strict';
import { test } from 'node:test';
import { levels } from '../src/levels.js';
import { flushCheckpoint, loadLevel, movePlayer, registerCallbacks, restartLevel, state, undoMove } from '../src/game.js';
import {
  epochKey, getCheckpoint, getLastLevel, getProgress, getProgressEpoch, getSoundSetting, getThemeSetting,
  resetProgress, saveCheckpoint, saveLevelResult, saveSoundSetting, saveThemeSetting
} from '../src/storage.js';
import { solve } from './solve.js';

const data = new Map();
const actions = [];
const storage = {
  getItem: key => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, value),
  removeItem: key => data.delete(key),
  get length() { return data.size; },
  key: index => [...data.keys()][index] ?? null
};
globalThis.document = { hidden: true };

function reset({ legacy = false } = {}) {
  globalThis.localStorage = storage;
  flushCheckpoint();
  data.clear();
  resetProgress();
  if (legacy) data.delete(epochKey);
  actions.length = 0;
  registerCallbacks({
    onChange: change => actions.push(change),
    onWin: () => actions.push('dialog'),
    onBlocked: () => actions.push('blocked')
  });
}

test('every map has a solution that the game accepts', async t => {
  reset();
  assert.equal(levels.length, 15);
  for (const [index, level] of levels.entries()) {
    const path = solve(level);
    await t.test(`Level ${level.id} · ${level.name} · ${path.length} moves`, () => {
      assert.equal(level.id, index + 1);
      assert.ok(loadLevel(index));
      assert.ok(path.length);
      path.forEach((direction, step) => {
        assert.equal(state.isWin, false);
        assert.ok(movePlayer(direction), `step ${step + 1} (${direction})`);
      });
      assert.equal(state.isWin, true);
      assert.equal(state.moveCount, path.length);
      assert.equal(state.finishedCampaign, index === levels.length - 1);
      assert.ok(getProgress().completed.has(index));
      assert.equal(getProgress().best[index], path.length);
      assert.deepEqual(actions.slice(-2), ['win', 'dialog']);
      assert.equal(movePlayer('up'), false);
      assert.equal(undoMove(), false);
    });
  }
});

test('blocked moves, undo of a push, restart, and invalid inputs', () => {
  reset();
  assert.ok(loadLevel(0));
  const initial = structuredClone([state.player, state.crates]);
  assert.equal(movePlayer('constructor'), false);
  for (const invalid of [-1, levels.length, NaN, 0.5, '0', null]) {
    assert.equal(loadLevel(invalid), false);
  }
  assert.equal(movePlayer('up'), true);
  assert.equal(movePlayer('left'), true);
  assert.equal(movePlayer('left'), false);
  assert.equal(actions.at(-1), 'blocked');
  assert.equal(state.moveCount, 2);
  assert.ok(undoMove());
  assert.ok(undoMove());
  assert.deepEqual([state.player, state.crates], initial);
  assert.equal(state.moveCount, 0);

  assert.ok(movePlayer('down'));
  assert.ok(movePlayer('right'));
  assert.notDeepEqual(state.crates, initial[1]);
  assert.ok(undoMove());
  assert.deepEqual(state.crates, initial[1]);
  assert.ok(restartLevel());
  assert.deepEqual([state.player, state.crates], initial);
  assert.equal(state.history.length, 0);
});

test('legacy saves are read, invalid fields are ignored, and reset preserves preferences', () => {
  reset({ legacy: true });
  data.set('crateveil.completedLevels', '[0,0,99,"1",4]');
  data.set('crateveil.bestMoves', '{"0":32,"1":16,"4":"<img>","5":-1,"8":1.5}');
  data.set('crateveil.lastLevel', '2junk');
  data.set('crateveil.theme', 'invalid');
  assert.deepEqual(getProgress(), { completed: new Set([0, 4, 1]), best: { 0: 32, 1: 16 } });
  assert.equal(getLastLevel(), 0);
  assert.equal(getThemeSetting(), 'crt');
  data.set('crateveil.completedLevels', 'null');
  data.set('crateveil.bestMoves', '[');
  assert.deepEqual(getProgress(), { completed: new Set(), best: {} });
  saveSoundSetting(false);
  saveThemeSetting('dark');
  loadLevel(5);
  assert.equal(getLastLevel(), 5);
  resetProgress();
  assert.equal(getLastLevel(), 0);
  assert.equal(getSoundSetting(), false);
  assert.equal(getThemeSetting(), 'dark');
});

test('the shortest score is retained and failed writes stay usable for the session', () => {
  reset();
  const solution = solve(levels[0]);
  loadLevel(0);
  solution.forEach(movePlayer);

  globalThis.localStorage = Object.assign(Object.create(storage), {
    setItem() { throw Error('quota'); },
    removeItem() { throw Error('blocked'); }
  });
  restartLevel();
  movePlayer('up');
  movePlayer('down');
  solution.forEach(movePlayer);
  assert.equal(getProgress().best[0], solution.length);

  loadLevel(1);
  const nextSolution = solve(levels[1]);
  nextSolution.forEach(movePlayer);
  assert.equal(getLastLevel(), 1);
  assert.equal(getProgress().best[1], nextSolution.length);
  assert.deepEqual(getProgress().completed, new Set([0, 1]));
  resetProgress();
  assert.deepEqual(getProgress(), { completed: new Set(), best: {} });
});

test('checkpoints restore player, crates and undo after re-entering a level', () => {
  reset();
  loadLevel(0);
  movePlayer('down');
  movePlayer('right');
  const expected = structuredClone([state.player, state.crates, state.history]);
  loadLevel(1);
  loadLevel(0);
  assert.deepEqual([state.player, state.crates, state.history], expected);
  assert.equal(state.moveCount, 2);
  assert.ok(undoMove());
  assert.equal(state.moveCount, 1);
  assert.notDeepEqual(state.crates, expected[1]);
  restartLevel();
  loadLevel(0);
  assert.equal(state.moveCount, 0);
});

test('damaged, outdated and already solved checkpoints cannot fabricate a win', () => {
  reset();
  const epoch = getProgressEpoch();
  const layout = levels[0].map.join('\n');
  for (const [map, moves] of [
    ['old layout', 'd'],
    [layout, 'duz'],
    [layout, 'uuuu'],
    [layout, solve(levels[0]).map(direction => direction[0]).join('')]
  ]) {
    saveCheckpoint(0, epoch, map, moves, Date.now());
    loadLevel(0);
    assert.equal(state.moveCount, 0);
    assert.equal(state.isWin, false);
    assert.equal(getProgress().completed.size, 0);
    assert.equal(actions.includes('dialog'), false);
  }
});

test('an older checkpoint and a pre-reset tab cannot overwrite current progress', () => {
  reset();
  const epoch = getProgressEpoch();
  const layout = levels[0].map.join('\n');
  saveCheckpoint(0, epoch, layout, 'dr', 2);
  saveCheckpoint(0, epoch, layout, 'u', 1);
  assert.equal(getCheckpoint(0, epoch, layout), 'dr');

  const nextEpoch = resetProgress();
  saveCheckpoint(0, epoch, layout, 'uu', 3);
  saveLevelResult(0, 500, epoch);
  assert.equal(getCheckpoint(0, nextEpoch, layout), '');
  assert.deepEqual(getProgress(), { completed: new Set(), best: {} });
  assert.equal(getLastLevel(), 0);
});

test('interleaved score writes keep distinct clears and the shortest score', () => {
  reset();
  const epoch = getProgressEpoch();
  saveLevelResult(0, 60, epoch);
  globalThis.localStorage = Object.assign(Object.create(storage), {
    setItem(key, value) {
      if (key === `crateveil.score.${epoch}.0.50`) {
        storage.setItem(`crateveil.score.${epoch}.0.33`, '1');
        storage.setItem(`crateveil.score.${epoch}.1.16`, '1');
      }
      storage.setItem(key, value);
    }
  });
  saveLevelResult(0, 50, epoch);
  assert.deepEqual(getProgress(), { completed: new Set([0, 1]), best: { 0: 33, 1: 16 } });
});

test('a long run batches writes and restores the full undo history', () => {
  reset();
  loadLevel(0);
  const epoch = getProgressEpoch();
  const layout = levels[0].map.join('\n');
  for (let index = 0; index < 10_000; index++) {
    assert.ok(movePlayer(index % 2 === 0 ? 'up' : 'down'));
  }
  assert.equal(getCheckpoint(0, epoch, layout), '');
  flushCheckpoint();
  assert.equal(getCheckpoint(0, epoch, layout).length, 10_000);
  loadLevel(0);
  assert.equal(state.history.length, 10_000);
  assert.ok(undoMove());
  assert.equal(state.moveCount, 9_999);
  flushCheckpoint();
});
