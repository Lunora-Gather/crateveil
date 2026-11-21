import { levels } from './levels.js';
import { playMove, playPush, playWin, playBlocked, playCrateTarget } from './sound.js';
import { getCheckpoint, getProgressEpoch, isLevelIndex, saveCheckpoint, saveLevelResult, saveLastLevel } from './storage.js';

const directionCodes = { up: 'u', down: 'd', left: 'l', right: 'r' };
const offsets = {
  u: [-1, 0],
  d: [1, 0],
  l: [0, -1],
  r: [0, 1]
};

export const state = {
  currentLevelIndex: 0,
  baseTiles: [],
  player: null,
  crates: [],
  targets: [],
  moveCount: 0,
  history: [],
  isWin: false,
  finishedCampaign: false,
  width: 0,
  height: 0,
  justChargedCell: null
};

let callbacks = { onChange() {}, onWin() {}, onBlocked() {} };
let epoch;
let layout;
let checkpointTimer;
let changedAt;

export function registerCallbacks(handlers) {
  callbacks = handlers;
}

function setUpBoard(map) {
  state.moveCount = 0;
  state.history = [];
  state.isWin = false;
  state.finishedCampaign = false;
  state.justChargedCell = null;
  state.height = map.length;
  state.width = Math.max(...map.map(row => row.length));
  state.crates = [];
  state.targets = [];

  state.baseTiles = map.map((line, row) => Array.from({ length: state.width }, (_, col) => {
    const tile = line[col] ?? ' ';
    if (tile === 'P' || tile === '-') state.player = { row, col };
    if (tile === 'B' || tile === '*') state.crates.push({ row, col });
    if (tile === 'T' || tile === '*' || tile === '-') {
      state.targets.push({ row, col });
      return 'T';
    }
    if (tile === 'P' || tile === 'B' || tile === '.') return '.';
    return tile === '#' ? '#' : ' ';
  }));
}

export function loadLevel(index, { resume = true } = {}) {
  if (!isLevelIndex(index)) return false;

  flushCheckpoint();
  const { map } = levels[index];
  state.currentLevelIndex = index;
  epoch = getProgressEpoch();
  layout = map.join('\n');
  setUpBoard(map);

  if (resume) {
    for (const step of getCheckpoint(index, epoch, layout)) {
      if (!applyMove(step) || state.isWin) {
        // Replay through the same rules. A damaged checkpoint cannot fabricate a clear.
        setUpBoard(map);
        queueCheckpoint(true);
        break;
      }
    }
    state.justChargedCell = null;
  } else {
    queueCheckpoint(true);
  }

  saveLastLevel(index, epoch);
  callbacks.onChange('load');
  return true;
}

export function flushCheckpoint() {
  if (changedAt === undefined) return;
  clearTimeout(checkpointTimer);
  checkpointTimer = undefined;
  const moves = state.isWin ? '' : state.history.map(step => step.code).join('');
  saveCheckpoint(state.currentLevelIndex, epoch, layout, moves, changedAt);
  changedAt = undefined;
}

function queueCheckpoint(immediate = false) {
  changedAt = Date.now();
  if (immediate) flushCheckpoint();
  else if (checkpointTimer === undefined) checkpointTimer = setTimeout(flushCheckpoint, 200);
}

function tileAt(row, col) {
  return state.baseTiles[row]?.[col];
}

function isFloor(row, col) {
  const tile = tileAt(row, col);
  return tile === '.' || tile === 'T';
}

function crateAt(row, col) {
  return state.crates.findIndex(crate => crate.row === row && crate.col === col);
}

function blocked() {
  playBlocked();
  callbacks.onBlocked();
  return false;
}

// Shared by player input and checkpoint replay. No audio, DOM, or storage side effects.
function applyMove(code) {
  const [rowOffset, colOffset] = offsets[code];
  const row = state.player.row + rowOffset;
  const col = state.player.col + colOffset;
  if (!isFloor(row, col)) return false;

  const crateIndex = crateAt(row, col);
  const pushedRow = row + rowOffset;
  const pushedCol = col + colOffset;
  if (crateIndex !== -1 && (!isFloor(pushedRow, pushedCol) || crateAt(pushedRow, pushedCol) !== -1)) return false;

  state.history.push({ code, player: state.player, crateIndex, crate: state.crates[crateIndex] });
  state.player = { row, col };
  state.moveCount = state.history.length;
  state.justChargedCell = null;

  if (crateIndex !== -1) {
    const destination = { row: pushedRow, col: pushedCol };
    state.crates[crateIndex] = destination;
    if (tileAt(pushedRow, pushedCol) === 'T' && tileAt(row, col) !== 'T') state.justChargedCell = destination;
    state.isWin = state.crates.every(crate => tileAt(crate.row, crate.col) === 'T');
  }
  return true;
}

export function movePlayer(direction) {
  if (!state.player || state.isWin || !Object.hasOwn(directionCodes, direction)) return false;
  if (!applyMove(directionCodes[direction])) return blocked();

  if (state.isWin) {
    state.finishedCampaign = saveLevelResult(state.currentLevelIndex, state.moveCount, epoch);
    playWin();
  } else if (state.justChargedCell) {
    playCrateTarget();
  } else if (state.history.at(-1).crateIndex !== -1) {
    playPush();
  } else {
    playMove();
  }

  queueCheckpoint(state.isWin);
  callbacks.onChange(state.isWin ? 'win' : 'move');
  if (state.isWin) callbacks.onWin();
  return true;
}

export function undoMove() {
  if (state.isWin) return false;
  const previous = state.history.pop();
  if (!previous) return blocked();

  state.player = previous.player;
  if (previous.crateIndex !== -1) state.crates[previous.crateIndex] = previous.crate;
  state.moveCount = state.history.length;
  state.justChargedCell = null;
  queueCheckpoint();
  playMove();
  callbacks.onChange('move');
  return true;
}

export function restartLevel() {
  if (!state.player) return false;
  return loadLevel(state.currentLevelIndex, { resume: false });
}
