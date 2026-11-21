import { levels } from './levels.js';

const prefix = 'crateveil.';
const legacy = {
  completed: prefix + 'completedLevels',
  best: prefix + 'bestMoves',
  last: prefix + 'lastLevel'
};
const initialEpoch = 'legacy';
export const epochKey = prefix + 'epoch';
export const soundKey = prefix + 'sound';
export const themeKey = prefix + 'theme';

// Failed writes remain visible in this tab. Reads use the last value if access is blocked.
const cached = new Map();
const unsaved = new Map();
let knownKeys = new Set();

function read(key) {
  if (unsaved.has(key)) return unsaved.get(key);
  try {
    const value = localStorage.getItem(key);
    if (value === null) cached.delete(key);
    else cached.set(key, value);
    return value;
  } catch {
    return cached.get(key) ?? null;
  }
}

function write(key, value) {
  if (value === null) cached.delete(key);
  else cached.set(key, value);
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    if (value === null) knownKeys.delete(key);
    else knownKeys.add(key);
    unsaved.delete(key);
    return true;
  } catch {
    unsaved.set(key, value);
    return false;
  }
}

function storageKeys() {
  try {
    const found = new Set();
    const length = localStorage.length;
    for (let index = 0; index < length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) found.add(key);
    }
    knownKeys = found;
  } catch {
    // Use the last readable snapshot.
  }
  const result = new Set(knownKeys);
  for (const [key, value] of unsaved) {
    if (value === null) result.delete(key);
    else result.add(key);
  }
  return result;
}

function readJSON(key) {
  try {
    return JSON.parse(read(key));
  } catch {
    return null;
  }
}

export function isLevelIndex(index) {
  return Number.isInteger(index) && index >= 0 && index < levels.length;
}

export function getProgressEpoch() {
  const value = read(epochKey);
  return value && /^\d+-\d+$/.test(value) ? value : initialEpoch;
}

function levelKey(kind, epoch, index) {
  return `${prefix}${kind}.${epoch}.${index}`;
}

function collectProgress(epoch, keys) {
  const completed = new Set();
  const best = {};
  if (epoch === initialEpoch) {
    const cleared = readJSON(legacy.completed);
    if (Array.isArray(cleared)) cleared.filter(isLevelIndex).forEach(index => completed.add(index));
    const scores = readJSON(legacy.best);
    if (scores && typeof scores === 'object' && !Array.isArray(scores)) {
      levels.forEach((_, index) => {
        const moves = scores[index];
        if (Number.isSafeInteger(moves) && moves >= 0) {
          best[index] = moves;
          completed.add(index);
        }
      });
    }
  }

  const scorePrefix = `${prefix}score.${epoch}.`;
  for (const key of keys) {
    if (!key.startsWith(scorePrefix)) continue;
    const fields = /^(\d+)\.(\d+)$/.exec(key.slice(scorePrefix.length));
    if (!fields) continue;
    const index = Number(fields[1]);
    const moves = Number(fields[2]);
    if (isLevelIndex(index) && Number.isSafeInteger(moves)) {
      completed.add(index);
      best[index] = Math.min(best[index] ?? Infinity, moves);
    }
  }
  return { completed, best };
}

export function getProgress() {
  return collectProgress(getProgressEpoch(), storageKeys());
}

export function isProgressChange(key) {
  return key === null || key === epochKey || key === legacy.completed || key === legacy.best || key.startsWith(prefix + 'score.');
}

export function saveLevelResult(index, moves, epoch) {
  if (epoch !== getProgressEpoch()) return false;

  const keys = storageKeys();
  const { completed, best } = collectProgress(epoch, keys);
  const firstClear = !completed.has(index);
  if (moves < (best[index] ?? Infinity)) {
    // Each improvement has its own key, so a concurrent slower clear cannot overwrite it.
    const scorePrefix = levelKey('score', epoch, index) + '.';
    if (write(scorePrefix + moves, '1')) {
      for (const key of keys) {
        if (key.startsWith(scorePrefix) && Number(key.slice(scorePrefix.length)) > moves) write(key, null);
      }
    }
  }
  return firstClear && completed.size + 1 === levels.length;
}

function lastKey(epoch) {
  return epoch === initialEpoch ? legacy.last : prefix + 'last.' + epoch;
}

export function getLastLevel() {
  const value = read(lastKey(getProgressEpoch()));
  const index = value !== null && /^\d+$/.test(value) ? Number(value) : 0;
  return isLevelIndex(index) ? index : 0;
}

export function saveLastLevel(index, epoch) {
  const key = lastKey(epoch);
  if (read(key) !== String(index)) write(key, String(index));
}

export function getCheckpoint(index, epoch, layout) {
  const value = readJSON(levelKey('run', epoch, index));
  if (Array.isArray(value) && value[1] === layout && typeof value[2] === 'string' && /^[udlr]*$/.test(value[2])) {
    return value[2];
  }
  return '';
}

export function saveCheckpoint(index, epoch, layout, moves, changedAt) {
  if (epoch !== getProgressEpoch()) return;
  const key = levelKey('run', epoch, index);
  const previous = readJSON(key);
  if (Array.isArray(previous) && previous[0] > changedAt) return;
  write(key, JSON.stringify([changedAt, layout, moves]));
}

export function getSoundSetting() {
  return read(soundKey) !== 'off';
}

export function saveSoundSetting(enabled) {
  write(soundKey, enabled ? 'on' : 'off');
}

export function getThemeSetting() {
  return read(themeKey) === 'dark' ? 'dark' : 'crt';
}

export function saveThemeSetting(theme) {
  write(themeKey, theme);
}

export function resetProgress() {
  const previous = getProgressEpoch();
  const next = crypto.getRandomValues(new Uint32Array(2)).join('-');
  if (write(epochKey, next)) {
    for (const key of storageKeys()) {
      if (key.startsWith(`${prefix}score.${previous}.`)
        || key.startsWith(`${prefix}run.${previous}.`)
        || key === lastKey(previous)) write(key, null);
    }
    if (previous === initialEpoch) {
      write(legacy.completed, null);
      write(legacy.best, null);
    }
  }
  return next;
}
