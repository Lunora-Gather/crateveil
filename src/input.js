import { movePlayer, restartLevel, state, undoMove } from './game.js';

const movementKeys = {
  arrowup: 'up',
  w: 'up',
  arrowdown: 'down',
  s: 'down',
  arrowleft: 'left',
  a: 'left',
  arrowright: 'right',
  d: 'right'
};

export function initInput({ canPlay, goBack, advance }) {
  let gesture = null;

  window.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;

    gesture = null;
    const key = event.key.toLowerCase();
    if (key === 'escape' && !document.querySelector('dialog[open]')) {
      if (!event.repeat) goBack();
      return;
    }
    if (key === 'n') {
      if (!event.repeat) advance();
      return;
    }
    if (!canPlay()) return;

    if (Object.hasOwn(movementKeys, key)) {
      event.preventDefault();
      movePlayer(movementKeys[key]);
    } else if (!event.repeat && key === 'r') {
      restartLevel();
    } else if (!event.repeat && key === 'u') {
      undoMove();
    }
  });

  for (const direction of ['up', 'down', 'left', 'right']) {
    document.getElementById(`dpad-${direction}`).addEventListener('click', () => {
      if (canPlay()) movePlayer(direction);
    });
  }

  const board = document.getElementById('game-board');

  board.addEventListener('pointerdown', event => {
    if (!canPlay() || !event.isPrimary || event.pointerType === 'mouse') return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, tiles: state.baseTiles };
    if (event.isTrusted) board.setPointerCapture(event.pointerId);
  });

  board.addEventListener('pointerup', event => {
    if (gesture?.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    const sameBoard = gesture.tiles === state.baseTiles;
    gesture = null;
    if (!sameBoard || !canPlay() || Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
    movePlayer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });

  for (const type of ['pointercancel', 'lostpointercapture']) {
    board.addEventListener(type, event => {
      if (gesture?.id === event.pointerId) gesture = null;
    });
  }
  window.addEventListener('blur', () => { gesture = null; });
}
