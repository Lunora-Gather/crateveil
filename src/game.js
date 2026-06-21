import { levels } from './levels.js';
import { playMove, playPush, playWin, playBlocked, playCrateTarget } from './sound.js';
import { saveBestMoves, saveCompletedLevel, saveLastLevel } from './storage.js';

export const state = {
  currentLevelIndex: 0,
  baseTiles: [], // 2D grid containing static environment ('#', '.', 'T', ' ')
  player: { row: 0, col: 0 },
  crates: [],    // Array of { row, col }
  targets: [],   // Array of { row, col }
  moveCount: 0,
  history: [],   // Stack of past snapshots for undo
  isWin: false,
  width: 0,
  height: 0,
  justChargedCell: null // Track cell that just got a crate pushed onto target
};

// Callback handlers for UI updates
let onStateChangeCallback = () => {};
let onWinCallback = () => {};
let onBlockedCallback = () => {};

export function registerCallbacks(onStateChange, onWin, onBlocked) {
  onStateChangeCallback = onStateChange;
  onWinCallback = onWin;
  if (onBlocked) onBlockedCallback = onBlocked;
}

export function loadLevel(index) {
  if (index < 0 || index >= levels.length) return false;

  const level = levels[index];
  const mapData = level.map;

  state.currentLevelIndex = index;
  state.moveCount = 0;
  state.history = [];
  state.isWin = false;
  state.justChargedCell = null;

  // Initialize grids
  state.height = mapData.length;
  state.width = Math.max(...mapData.map(row => row.length));
  
  state.baseTiles = Array.from({ length: state.height }, () => 
    Array(state.width).fill(' ')
  );
  state.crates = [];
  state.targets = [];

  // Parse map
  for (let r = 0; r < state.height; r++) {
    const rowStr = mapData[r];
    for (let c = 0; c < state.width; c++) {
      if (c >= rowStr.length) {
        state.baseTiles[r][c] = ' ';
        continue;
      }
      
      const char = rowStr[c];
      switch (char) {
        case '#':
          state.baseTiles[r][c] = '#';
          break;
        case '.':
          state.baseTiles[r][c] = '.';
          break;
        case 'P':
          state.player = { row: r, col: c };
          state.baseTiles[r][c] = '.';
          break;
        case 'B':
          state.crates.push({ row: r, col: c });
          state.baseTiles[r][c] = '.';
          break;
        case 'T':
          state.targets.push({ row: r, col: c });
          state.baseTiles[r][c] = 'T';
          break;
        case '*':
          state.crates.push({ row: r, col: c });
          state.targets.push({ row: r, col: c });
          state.baseTiles[r][c] = 'T';
          break;
        case '-':
          state.player = { row: r, col: c };
          state.targets.push({ row: r, col: c });
          state.baseTiles[r][c] = 'T';
          break;
        case ' ':
        default:
          state.baseTiles[r][c] = ' ';
          break;
      }
    }
  }

  saveLastLevel(index);
  onStateChangeCallback();
  return true;
}

function saveHistory() {
  state.history.push({
    player: { ...state.player },
    crates: state.crates.map(c => ({ ...c })),
    moveCount: state.moveCount,
    isWin: state.isWin
  });
}

export function movePlayer(direction) {
  if (state.isWin) return false;

  let dRow = 0;
  let dCol = 0;

  switch (direction) {
    case 'up':
      dRow = -1; break;
    case 'down':
      dRow = 1; break;
    case 'left':
      dCol = -1; break;
    case 'right':
      dCol = 1; break;
    default:
      return false;
  }

  const nextRow = state.player.row + dRow;
  const nextCol = state.player.col + dCol;

  // Reset just charged cell before calculating next move state
  state.justChargedCell = null;

  // 1. Boundary check
  if (nextRow < 0 || nextRow >= state.height || nextCol < 0 || nextCol >= state.width) {
    playBlocked();
    onBlockedCallback();
    return false;
  }

  // 2. Wall check
  if (state.baseTiles[nextRow][nextCol] === '#') {
    playBlocked();
    onBlockedCallback();
    return false;
  }

  // 3. Space check (ensure player doesn't wander outside of the designated level map)
  if (state.baseTiles[nextRow][nextCol] === ' ') {
    playBlocked();
    onBlockedCallback();
    return false;
  }

  // 4. Crate collision check
  const crateIndex = state.crates.findIndex(c => c.row === nextRow && c.col === nextCol);
  
  if (crateIndex !== -1) {
    // There is a crate in the target cell, check if we can push it
    const crateNextRow = nextRow + dRow;
    const crateNextCol = nextCol + dCol;

    // Check if crate destination is out of bounds
    if (crateNextRow < 0 || crateNextRow >= state.height || crateNextCol < 0 || crateNextCol >= state.width) {
      playBlocked();
      onBlockedCallback();
      return false;
    }

    // Check if crate destination is wall or empty space
    if (state.baseTiles[crateNextRow][crateNextCol] === '#' || state.baseTiles[crateNextRow][crateNextCol] === ' ') {
      playBlocked();
      onBlockedCallback();
      return false;
    }

    // Check if crate destination contains another crate
    const anotherCrate = state.crates.some(c => c.row === crateNextRow && c.col === crateNextCol);
    if (anotherCrate) {
      playBlocked();
      onBlockedCallback();
      return false;
    }

    // Move is valid! Save history, push crate, and move player
    saveHistory();
    
    // Check if it's being charged (moving from a non-target to a target)
    const wasOnTargetBefore = state.targets.some(t => t.row === nextRow && t.col === nextCol);
    const isOnTargetAfter = state.targets.some(t => t.row === crateNextRow && t.col === crateNextCol);

    state.crates[crateIndex].row = crateNextRow;
    state.crates[crateIndex].col = crateNextCol;
    state.player.row = nextRow;
    state.player.col = nextCol;
    state.moveCount++;
    
    if (isOnTargetAfter && !wasOnTargetBefore) {
      state.justChargedCell = { row: crateNextRow, col: crateNextCol };
      playCrateTarget();
    } else {
      playPush();
    }
    
    // Check if this move triggers a win
    checkWin();
    onStateChangeCallback();
    return true;
  }

  // 5. Normal movement (empty tile or target tile)
  saveHistory();
  state.player.row = nextRow;
  state.player.col = nextCol;
  state.moveCount++;
  playMove();
  onStateChangeCallback();
  return true;
}

export function undoMove() {
  if (state.history.length === 0 || state.isWin) {
    playBlocked();
    onBlockedCallback();
    return false;
  }

  const prevState = state.history.pop();
  state.player = prevState.player;
  state.crates = prevState.crates;
  state.moveCount = prevState.moveCount;
  state.isWin = prevState.isWin;
  state.justChargedCell = null; // Reset charge flash on undo

  playMove();
  onStateChangeCallback();
  return true;
}

export function restartLevel() {
  loadLevel(state.currentLevelIndex);
}

export function nextLevel() {
  if (state.currentLevelIndex + 1 < levels.length) {
    loadLevel(state.currentLevelIndex + 1);
    return true;
  }
  return false;
}

function checkWin() {
  // A level is solved when all targets contain a crate
  const win = state.targets.every(t => 
    state.crates.some(c => c.row === t.row && c.col === t.col)
  );

  if (win) {
    state.isWin = true;
    playWin();
    saveCompletedLevel(state.currentLevelIndex);
    saveBestMoves(state.currentLevelIndex, state.moveCount);
    setTimeout(() => {
      onWinCallback();
    }, 300); // Small visual delay for transition satisfaction
  }
  
  return win;
}
