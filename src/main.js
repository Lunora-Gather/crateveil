import { registerCallbacks, state } from './game.js';
import { initUI, updateHUD, showWinModal, showScreen, handleEscapeKeyWrapper } from './ui.js';
import { initInput } from './input.js';
import { renderBoard } from './renderer.js';

function triggerBoardShake() {
  const boardEl = document.getElementById('game-board');
  if (!boardEl) return;
  
  boardEl.classList.remove('board-shake');
  void boardEl.offsetWidth; // Reflow
  boardEl.classList.add('board-shake');
  
  setTimeout(() => {
    boardEl.classList.remove('board-shake');
  }, 150);
}

// Setup bootstrap routing and logic binding
document.addEventListener('DOMContentLoaded', () => {
  // 1. Setup callback connections between game state and UI
  registerCallbacks(
    // onStateChange
    () => {
      updateHUD();
      renderBoard();
    },
    // onWin
    () => {
      showWinModal();
    },
    // onBlocked
    () => {
      triggerBoardShake();
    }
  );

  // 2. Setup user interface click handlers and load initial settings
  initUI();

  // 3. Initialize input listener systems (desktop + touch devices)
  initInput(handleEscapeKeyWrapper);

  // 4. Default starting navigation
  showScreen('home-screen');
});
