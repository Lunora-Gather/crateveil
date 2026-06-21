import { levels } from './levels.js';
import { state, loadLevel, restartLevel, undoMove, nextLevel } from './game.js';
import { 
  getCompletedLevels, 
  getBestMoves, 
  getLastLevel, 
  getSoundSetting, 
  getThemeSetting, 
  saveThemeSetting, 
  resetProgress 
} from './storage.js';
import { initSound, toggleSound, startAmbientDrone } from './sound.js';
import { renderBoard } from './renderer.js';

let previousScreen = 'home-screen';

export function initUI() {
  // 1. Initialize settings from storage
  const soundOn = getSoundSetting();
  initSound(soundOn);
  updateSoundButtonUI(soundOn);

  const theme = getThemeSetting();
  setThemeUI(theme);
  updateThemeButtonUI(theme);

  // Setup first interaction listener to start synth drone
  const triggerDroneStart = () => {
    startAmbientDrone();
    document.removeEventListener('click', triggerDroneStart);
    document.removeEventListener('keydown', triggerDroneStart);
    document.removeEventListener('touchstart', triggerDroneStart);
  };
  document.addEventListener('click', triggerDroneStart);
  document.addEventListener('keydown', triggerDroneStart);
  document.addEventListener('touchstart', triggerDroneStart);

  // 2. Navigation bindings
  bindClick('btn-start', () => {
    const lastLvl = getLastLevel();
    loadLevel(lastLvl);
    showScreen('game-screen');
  });

  bindClick('btn-levels-menu', () => {
    renderLevelsGrid();
    showScreen('level-select-screen');
  });

  bindClick('btn-help-menu', () => {
    previousScreen = 'home-screen';
    showScreen('help-screen');
  });

  bindClick('btn-settings-menu', () => {
    showScreen('settings-screen');
  });

  // Back actions
  bindClick('btn-levels-back', () => showScreen('home-screen'));
  bindClick('btn-help-back', () => showScreen(previousScreen));
  bindClick('btn-settings-back', () => showScreen('home-screen'));
  bindClick('btn-logo-home', () => showScreen('home-screen'));

  // 3. Mobile gameplay buttons
  bindClick('btn-game-restart', () => restartLevel());
  bindClick('btn-game-undo', () => undoMove());
  bindClick('btn-game-levels', () => {
    renderLevelsGrid();
    showScreen('level-select-screen');
  });
  bindClick('btn-game-help', () => {
    previousScreen = 'game-screen';
    showScreen('help-screen');
  });
  bindClick('btn-game-next', () => handleNextLevelAction());

  // 4. Desktop sidebar buttons
  bindClick('btn-sidebar-restart', () => restartLevel());
  bindClick('btn-sidebar-undo', () => undoMove());
  bindClick('btn-sidebar-next', () => handleNextLevelAction());
  bindClick('btn-sidebar-help', () => {
    previousScreen = 'game-screen';
    showScreen('help-screen');
  });
  bindClick('btn-sidebar-home', () => {
    showScreen('home-screen');
  });

  // 5. Settings actions
  const handleSoundToggle = () => {
    const nowEnabled = toggleSound();
    updateSoundButtonUI(nowEnabled);
  };
  bindClick('setting-sound', handleSoundToggle);
  bindClick('btn-sidebar-sound', handleSoundToggle);
  bindClick('btn-desktop-sound', handleSoundToggle);

  const handleThemeToggle = () => {
    const currentTheme = document.body.classList.contains('theme-crt') ? 'crt' : 'dark';
    const nextTheme = currentTheme === 'crt' ? 'dark' : 'crt';
    setThemeUI(nextTheme);
    saveThemeSetting(nextTheme);
    updateThemeButtonUI(nextTheme);
  };
  bindClick('setting-theme', handleThemeToggle);
  bindClick('btn-sidebar-theme', handleThemeToggle);
  bindClick('btn-desktop-theme', handleThemeToggle);

  bindClick('btn-reset-progress', () => {
    showModal('confirm-modal');
  });

  // Confirmation dialog
  bindClick('btn-confirm-cancel', () => {
    hideModal('confirm-modal');
  });

  bindClick('btn-confirm-ok', () => {
    resetProgress();
    hideModal('confirm-modal');
    renderLevelsGrid();
    renderSidebarLevelsGrid();
    showScreen('home-screen');
  });

  // 6. Win Modal actions
  bindClick('btn-modal-restart', () => {
    hideModal('win-modal');
    restartLevel();
  });

  bindClick('btn-modal-levels', () => {
    hideModal('win-modal');
    renderLevelsGrid();
    showScreen('level-select-screen');
  });

  bindClick('btn-modal-next', () => {
    hideModal('win-modal');
    handleNextLevelAction();
  });

  // 7. Ending Screen actions
  bindClick('btn-ending-again', () => {
    loadLevel(0);
    showScreen('game-screen');
  });

  bindClick('btn-ending-levels', () => {
    renderLevelsGrid();
    showScreen('level-select-screen');
  });

  bindClick('btn-ending-reset', () => {
    showModal('confirm-modal');
  });

  // Keyboard shortcut Esc/Back navigation helper
  window.handleEscapeKey = () => {
    if (!document.getElementById('confirm-modal').classList.contains('hidden')) {
      hideModal('confirm-modal');
      return;
    }
    if (!document.getElementById('win-modal').classList.contains('hidden')) {
      return;
    }
    const activeScreen = getActiveScreen();
    if (activeScreen === 'game-screen') {
      showScreen('home-screen');
    } else if (activeScreen === 'level-select-screen') {
      showScreen('home-screen');
    } else if (activeScreen === 'help-screen') {
      showScreen(previousScreen);
    } else if (activeScreen === 'settings-screen') {
      showScreen('home-screen');
    } else if (activeScreen === 'ending-screen') {
      showScreen('home-screen');
    }
  };
}

export function handleEscapeKeyWrapper() {
  if (window.handleEscapeKey) {
    window.handleEscapeKey();
  }
}

function bindClick(id, callback) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('click', callback);
  }
}

export function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(scr => {
    scr.classList.add('hidden');
  });
  const activeScr = document.getElementById(screenId);
  if (activeScr) {
    activeScr.classList.remove('hidden');
  }
}

function getActiveScreen() {
  const active = Array.from(document.querySelectorAll('.screen')).find(scr => !scr.classList.contains('hidden'));
  return active ? active.id : 'home-screen';
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
  }
}

function setThemeUI(theme) {
  if (theme === 'crt') {
    document.body.classList.add('theme-crt');
    document.body.classList.remove('theme-dark');
  } else {
    document.body.classList.add('theme-dark');
    document.body.classList.remove('theme-crt');
  }
}

function updateSoundButtonUI(enabled) {
  const text = `Sound: ${enabled ? 'ON' : 'OFF'}`;
  const btn1 = document.getElementById('setting-sound');
  if (btn1) btn1.textContent = text;
  const btn2 = document.getElementById('btn-sidebar-sound');
  if (btn2) btn2.textContent = text;
  const btn3 = document.getElementById('btn-desktop-sound');
  if (btn3) btn3.textContent = text;
}

function updateThemeButtonUI(theme) {
  const text = theme === 'crt' ? 'Theme: CRT' : 'Theme: DARK';
  const btn1 = document.getElementById('setting-theme');
  if (btn1) btn1.textContent = theme === 'crt' ? 'Theme: CRT FILTER' : 'Theme: DARK MONOCHROME';
  const btn2 = document.getElementById('btn-sidebar-theme');
  if (btn2) btn2.textContent = text;
  const btn3 = document.getElementById('btn-desktop-theme');
  if (btn3) btn3.textContent = text;
}

function handleNextLevelAction() {
  const isLoaded = nextLevel();
  if (!isLoaded) {
    showScreen('ending-screen');
  }
}

export function updateHUD() {
  const lvlText = `Level ${state.currentLevelIndex + 1} / ${levels.length}`;
  const lvlName = levels[state.currentLevelIndex].name;
  
  const displayEl = document.getElementById('level-display');
  if (displayEl) {
    displayEl.innerHTML = `<span class="lvl-num">${lvlText}</span><span class="lvl-name">${lvlName}</span>`;
  }

  // Update all moves counters (mobile + desktop sidebar)
  document.querySelectorAll('.moves-count-val').forEach(el => {
    el.textContent = state.moveCount;
  });

  const bestMoves = getBestMoves();
  const bestVal = bestMoves[state.currentLevelIndex];
  
  // Update all best score counters (mobile + desktop sidebar)
  document.querySelectorAll('.best-count-val').forEach(el => {
    el.textContent = bestVal !== undefined ? bestVal : '--';
  });

  // Toggle gameplay Next button indicators
  const nextBtns = document.querySelectorAll('#btn-game-next, #btn-sidebar-next');
  nextBtns.forEach(btn => {
    if (state.isWin) {
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  });

  // Keep sidebar level select highlighted
  renderSidebarLevelsGrid();
}

export function showWinModal() {
  const movesEl = document.getElementById('win-moves');
  if (movesEl) movesEl.textContent = state.moveCount;

  const bestMoves = getBestMoves();
  const bestVal = bestMoves[state.currentLevelIndex];
  const bestEl = document.getElementById('win-best');
  if (bestEl) bestEl.textContent = bestVal !== undefined ? bestVal : '--';

  const modalNextBtn = document.getElementById('btn-modal-next');
  if (modalNextBtn) {
    if (state.currentLevelIndex + 1 >= levels.length) {
      modalNextBtn.textContent = 'Finish Game';
    } else {
      modalNextBtn.textContent = 'Next Level';
    }
  }

  showModal('win-modal');
}

export function renderLevelsGrid() {
  const gridEl = document.getElementById('levels-grid');
  if (!gridEl) return;

  gridEl.innerHTML = '';
  const completed = getCompletedLevels();
  const bestMoves = getBestMoves();

  levels.forEach((lvl, index) => {
    const btn = document.createElement('button');
    btn.classList.add('level-cell');
    const isDone = completed.includes(index);
    if (isDone) {
      btn.classList.add('completed');
    }
    btn.setAttribute('aria-label', `Play level ${lvl.id}: ${lvl.name}`);

    const bestValue = bestMoves[index];

    btn.innerHTML = `
      <div class="level-cell-number">Lvl ${lvl.id}</div>
      <div class="level-cell-name">${lvl.name}</div>
      <div class="level-cell-stats">
        <span class="best-score">${bestValue !== undefined ? `Best: ${bestValue}` : '--'}</span>
        ${isDone ? '<span class="done-check">✓</span>' : ''}
      </div>
    `;

    btn.addEventListener('click', () => {
      loadLevel(index);
      showScreen('game-screen');
    });

    gridEl.appendChild(btn);
  });
}

// Renders the quick level selector panel in the desktop sidebar
export function renderSidebarLevelsGrid() {
  const gridEl = document.getElementById('sidebar-levels-grid');
  if (!gridEl) return;

  gridEl.innerHTML = '';
  const completed = getCompletedLevels();

  levels.forEach((lvl, index) => {
    const itemBtn = document.createElement('button');
    itemBtn.classList.add('sidebar-level-item');
    if (index === state.currentLevelIndex) {
      itemBtn.classList.add('active');
    }
    
    const isDone = completed.includes(index);
    if (isDone) {
      itemBtn.classList.add('completed');
    }
    itemBtn.innerHTML = `
      <span class="sidebar-level-num">${lvl.id}</span>
      ${isDone ? '<span class="sidebar-level-check">✓</span>' : ''}
    `;
    itemBtn.setAttribute('aria-label', `Load level ${lvl.id}`);

    itemBtn.addEventListener('click', () => {
      loadLevel(index);
    });

    gridEl.appendChild(itemBtn);
  });
}
