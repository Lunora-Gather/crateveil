import { movePlayer, restartLevel, undoMove, nextLevel, state } from './game.js';

let escapeCallback = () => {};

export function initInput(onEscapePressed) {
  escapeCallback = onEscapePressed;

  // 1. Keyboard Controls
  window.addEventListener('keydown', handleKeyDown);

  // 2. Mobile D-pad Controls
  setupDpadButton('dpad-up', 'up');
  setupDpadButton('dpad-down', 'down');
  setupDpadButton('dpad-left', 'left');
  setupDpadButton('dpad-right', 'right');

    // Prevent generic mobile double-tap zoom on controller area
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) {
      mobileControls.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('dpad-button')) {
          e.preventDefault(); // Stop click delay and zooming
        }
      }, { passive: false });
    }

    // 3. Swipe Gesture Controls on Mobile
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const minSwipeDistance = 35; // Minimum distance in pixels to count as swipe

    const handleTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e) => {
      // If modal is open or screens are hidden, ignore swipes
      const winModalActive = !document.getElementById('win-modal').classList.contains('hidden');
      const gameScreenActive = !document.getElementById('game-screen').classList.contains('hidden');
      if (!gameScreenActive || winModalActive) return;

      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;

      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      const absDiffX = Math.abs(diffX);
      const absDiffY = Math.abs(diffY);

      if (Math.max(absDiffX, absDiffY) < minSwipeDistance) {
        return; // Too short
      }

      if (absDiffX > absDiffY) {
        // Horizontal swipe
        if (diffX > 0) {
          movePlayer('right');
        } else {
          movePlayer('left');
        }
      } else {
        // Vertical swipe
        if (diffY > 0) {
          movePlayer('down');
        } else {
          movePlayer('up');
        }
      }
    };

    const boardEl = document.getElementById('game-board');
    if (boardEl) {
      boardEl.addEventListener('touchstart', handleTouchStart, { passive: true });
      boardEl.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
  }

function handleKeyDown(e) {
  // If the win modal is active or ending screen is active, block gameplay movements
  const winModalActive = !document.getElementById('win-modal').classList.contains('hidden');
  const endingScreenActive = !document.getElementById('ending-screen').classList.contains('hidden');
  const levelSelectActive = !document.getElementById('level-select-screen').classList.contains('hidden');
  const helpActive = !document.getElementById('help-screen').classList.contains('hidden');
  const settingsActive = !document.getElementById('settings-screen').classList.contains('hidden');
  const homeActive = !document.getElementById('home-screen').classList.contains('hidden');

  const gameplayBlocked = winModalActive || endingScreenActive || levelSelectActive || helpActive || settingsActive || homeActive;

  // Prevent browser scrolling with arrow keys
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }

  // Handle shortcuts
  switch (e.key.toLowerCase()) {
    case 'r':
      if (!homeActive && !endingScreenActive) {
        restartLevel();
      }
      break;
    case 'u':
      if (!homeActive && !endingScreenActive) {
        undoMove();
      }
      break;
    case 'n':
      if (!homeActive && !endingScreenActive) {
        // If we won, next level is loaded. Otherwise, next shortcut is only active when completed.
        if (state.isWin || e.shiftKey) { // Shift+N to force next level (for debugging/testing)
          nextLevel();
        }
      }
      break;
    case 'escape':
      escapeCallback();
      break;
  }

  // Handle movement keys
  if (gameplayBlocked) return;

  switch (e.key) {
    // Arrow keys
    case 'ArrowUp':
    case 'w':
    case 'W':
      movePlayer('up');
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      movePlayer('down');
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      movePlayer('left');
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      movePlayer('right');
      break;
  }
}

function setupDpadButton(elementId, direction) {
  const btn = document.getElementById(elementId);
  if (!btn) return;

  // Use both touchstart (immediate) and mousedown/click for desktop emulator testing
  const triggerMove = (e) => {
    e.preventDefault();
    
    // Check if gameplay is currently blocked
    const winModalActive = !document.getElementById('win-modal').classList.contains('hidden');
    const gameScreenActive = !document.getElementById('game-screen').classList.contains('hidden');
    
    if (gameScreenActive && !winModalActive) {
      movePlayer(direction);
    }
  };

  btn.addEventListener('touchstart', triggerMove, { passive: false });
  btn.addEventListener('mousedown', (e) => {
    // Trigger on mousedown only if touch is not used (to prevent double actions)
    if (e.pointerType === 'touch') return;
    triggerMove(e);
  });
}
