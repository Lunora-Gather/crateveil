import { flushCheckpoint, registerCallbacks } from './game.js';
import { initUI, updateHUD, showWinModal, canPlay, goBack, advance } from './ui.js';
import { initInput } from './input.js';
import { initRenderer, renderBoard, shakeBoard } from './renderer.js';

initRenderer();
initUI();
registerCallbacks({
  onChange(change) {
    renderBoard();
    updateHUD(change);
  },
  onWin: showWinModal,
  onBlocked: shakeBoard
});
initInput({ canPlay, goBack, advance });

window.addEventListener('pagehide', flushCheckpoint);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) flushCheckpoint();
});
