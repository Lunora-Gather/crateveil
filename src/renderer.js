import { state } from './game.js';

let board;
let viewport;
let dimensions;
let fitFrame = 0;
let lastTiles;
let cells;
let playerSprite;
let crateSprites;
let chargedSprite;
let reducedMotion;

function element(className) {
  const div = document.createElement('div');
  div.className = className;
  return div;
}

export function initRenderer() {
  board = document.getElementById('game-board');
  viewport = board.parentElement;
  reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  new ResizeObserver(([entry]) => {
    dimensions = entry.contentRect;
    if (!fitFrame) {
      fitFrame = requestAnimationFrame(() => {
        fitFrame = 0;
        fitBoard();
      });
    }
  }).observe(viewport);
  board.addEventListener('animationend', event => {
    if (event.target === board) board.classList.remove('board-shake');
  });
  reducedMotion.addEventListener('change', () => board.classList.remove('board-shake'));
}

function createBoard() {
  lastTiles = state.baseTiles;
  cells = state.baseTiles.map(row => row.map(tile => {
    const cell = element('cell');
    if (tile === '#') {
      cell.classList.add('wall');
      cell.append(element('wall-inner'));
    } else if (tile === ' ') {
      cell.classList.add('outside');
    } else {
      cell.classList.add('floor');
      cell.append(element('floor-inner'));
      if (tile === 'T') {
        cell.classList.add('target');
        cell.append(element('target-ring'), element('target-dot'));
      }
    }
    return cell;
  }));

  playerSprite = element('player-sprite');
  const visor = element('player-visor');
  visor.append(element('player-eyes'));
  playerSprite.append(element('player-antenna'), visor, element('player-body-trim'));

  crateSprites = state.crates.map(() => {
    const crate = element('crate-sprite');
    crate.append(element('crate-brace'), ...['tl', 'tr', 'bl', 'br'].map(corner => element(`crate-corner corner-${corner}`)), element('crate-stud'));
    return crate;
  });

  board.classList.remove('board-shake');
  board.style.setProperty('--columns', state.width);
  board.style.setProperty('--rows', state.height);
  board.replaceChildren(...cells.flat());
  chargedSprite = null;
  fitBoard();
}

function putSprite(sprite, { row, col }) {
  const cell = cells[row][col];
  if (sprite.parentElement !== cell) cell.append(sprite);
  return cell;
}

export function renderBoard() {
  if (lastTiles !== state.baseTiles) createBoard();

  putSprite(playerSprite, state.player);
  let placed = 0;
  const charged = state.crates.reduce((flashing, crate, index) => {
    const sprite = crateSprites[index];
    const cell = putSprite(sprite, crate);
    const onTarget = cell.classList.contains('target');
    sprite.classList.toggle('crate-charged', onTarget);
    if (onTarget) placed++;
    return crate === state.justChargedCell ? sprite : flashing;
  }, null);
  if (chargedSprite !== charged) {
    chargedSprite?.classList.remove('crate-just-charged');
    charged?.classList.add('crate-just-charged');
    chargedSprite = charged;
  }

  const position = ({ row, col }) => `row ${row + 1}, column ${col + 1}`;
  board.setAttribute('aria-label', `Board, ${state.height} rows by ${state.width} columns. Player at ${position(state.player)}. ${placed} of ${state.crates.length} crates on targets.`);
}

function fitBoard() {
  if (!dimensions?.width || !dimensions.height || !state.width) return;
  const style = getComputedStyle(board);
  const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const borderX = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
  const borderY = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
  const width = (dimensions.width - paddingX - borderX - parseFloat(style.columnGap) * (state.width - 1)) / state.width;
  const height = (dimensions.height - paddingY - borderY - parseFloat(style.rowGap) * (state.height - 1)) / state.height;
  const size = Math.max(1, Math.min(72, Math.floor(Math.min(width, height))));
  const cellSize = `${size}px`;
  if (board.style.getPropertyValue('--cell-size') !== cellSize) {
    board.style.setProperty('--cell-size', cellSize);
  }
}

export function shakeBoard() {
  if (!reducedMotion.matches) board.classList.add('board-shake');
}
