import { state } from './game.js';

let board;
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
  reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
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

export function shakeBoard() {
  if (!reducedMotion.matches) board.classList.add('board-shake');
}
