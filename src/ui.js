import { levels } from './levels.js';
import { state, loadLevel, restartLevel, undoMove, flushCheckpoint } from './game.js';
import {
  getCheckpoint, getProgress, getProgressEpoch, getLastLevel, getSoundSetting, getThemeSetting,
  isProgressChange, saveThemeSetting, resetProgress, soundKey, themeKey
} from './storage.js';
import { initSound, setSoundEnabled, toggleSound } from './sound.js';

const byId = id => document.getElementById(id);

let activeScreen = 'home-screen';
let helpReturnScreen = 'home-screen';
let helpReturnFocus;
let epoch;
let progress;
let levelButtons;
let quickButtons;
let moveCounters;
let undoButtons;

export function initUI() {
  levelButtons = buildLevelPicker(byId('levels-grid'));
  quickButtons = buildLevelPicker(byId('sidebar-levels-grid'), true);
  moveCounters = document.querySelectorAll('.moves-count-val');
  undoButtons = ['btn-game-undo', 'btn-sidebar-undo'].map(byId);
  epoch = getProgressEpoch();
  refreshPickers();
  updateStartButton();

  const sound = getSoundSetting();
  initSound(sound);
  updateSoundButtons(sound);
  applyTheme(getThemeSetting());

  bind('btn-start', () => startLevel(getLastLevel()));
  bind('btn-levels-menu', () => showScreen('level-select-screen'));
  bind('btn-settings-menu', () => showScreen('settings-screen'));
  bind(['btn-help-menu', 'btn-game-help', 'btn-sidebar-help'], event => {
    helpReturnScreen = activeScreen;
    helpReturnFocus = event.currentTarget;
    showScreen('help-screen');
  });
  bind(['btn-levels-back', 'btn-settings-back', 'btn-logo-home', 'btn-sidebar-home'], showHome);
  bind('btn-help-back', goBack);

  bind(['btn-game-restart', 'btn-sidebar-restart'], restartLevel);
  bind(['btn-game-undo', 'btn-sidebar-undo'], undoMove);
  bind(['btn-game-next', 'btn-sidebar-next', 'btn-modal-next'], advance);
  bind(['btn-game-levels', 'btn-modal-levels', 'btn-ending-levels'], () => {
    byId('win-modal').close();
    showScreen('level-select-screen');
  });
  bind('btn-modal-restart', () => {
    byId('win-modal').close();
    restartLevel();
  });
  bind('btn-ending-again', () => startLevel(0));

  bind(['setting-sound', 'btn-desktop-sound'], () => updateSoundButtons(toggleSound()));
  bind(['setting-theme', 'btn-desktop-theme'], () => {
    const theme = document.body.classList.contains('theme-crt') ? 'dark' : 'crt';
    saveThemeSetting(theme);
    applyTheme(theme);
  });

  const confirm = byId('confirm-modal');
  bind(['btn-reset-progress', 'btn-ending-reset'], () => confirm.showModal());
  bind('btn-confirm-cancel', () => confirm.close());
  bind('btn-confirm-ok', () => {
    epoch = resetProgress();
    refreshPickers();
    confirm.close();
    showHome();
  });
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      dialog.close();
    });
  }

  window.addEventListener('storage', event => {
    if (event.key === null || event.key === soundKey) syncSound();
    if (event.key === null || event.key === themeKey) applyTheme(getThemeSetting());
    if (isProgressChange(event.key)) syncProgress();
    if (activeScreen === 'home-screen' && (event.key === null || event.key.startsWith('crateveil.'))) updateStartButton();
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    syncSound();
    applyTheme(getThemeSetting());
    syncProgress();
    updateStartButton();
  });
}

function syncSound() {
  const sound = getSoundSetting();
  setSoundEnabled(sound);
  updateSoundButtons(sound);
}

function syncProgress() {
  const latest = getProgressEpoch();
  refreshPickers();
  if (latest !== epoch) {
    epoch = latest;
    byId('win-modal').close();
    byId('confirm-modal').close();
    showHome();
  } else if (activeScreen === 'game-screen') {
    updateBest();
    if (state.isWin) {
      byId('win-best').textContent = progress.best[state.currentLevelIndex] ?? '--';
      updateNextButtons();
    }
  }
}

function updateStartButton() {
  const index = getLastLevel();
  const moves = getCheckpoint(index, getProgressEpoch(), levels[index].map.join('\n'));
  byId('btn-start').textContent = moves ? 'Continue Game' : 'Start Game';
}

function bind(ids, callback) {
  for (const id of [ids].flat()) byId(id).addEventListener('click', callback);
}

function startLevel(index) {
  loadLevel(index);
  showScreen('game-screen');
}

function showHome() {
  flushCheckpoint();
  updateStartButton();
  showScreen('home-screen');
}

function showScreen(id) {
  if (id === activeScreen) return;
  byId(activeScreen).hidden = true;
  activeScreen = id;
  const screen = byId(id);
  screen.hidden = false;
  screen.scrollTop = 0;

  const focus = id === 'game-screen' ? byId('game-board') : screen.querySelector('h1, h2');
  focus.focus();
}

export function canPlay() {
  return activeScreen === 'game-screen' && !byId('win-modal').open;
}

export function goBack() {
  if (activeScreen === 'help-screen') {
    showScreen(helpReturnScreen);
    if (helpReturnFocus?.getClientRects().length) helpReturnFocus.focus();
  } else {
    showHome();
  }
}

function updateSoundButtons(enabled) {
  for (const id of ['setting-sound', 'btn-desktop-sound']) {
    const button = byId(id);
    button.textContent = enabled ? 'Sound: ON' : 'Sound: OFF';
    button.setAttribute('aria-pressed', enabled);
  }
}

function applyTheme(theme) {
  const crt = theme === 'crt';
  document.body.classList.toggle('theme-crt', crt);
  document.body.classList.toggle('theme-dark', !crt);
  for (const id of ['setting-theme', 'btn-desktop-theme']) {
    const button = byId(id);
    button.textContent = crt ? 'Theme: CRT' : 'Theme: DARK';
    button.setAttribute('aria-pressed', crt);
  }
}

function nextAction() {
  if (state.finishedCampaign && progress.completed.size === levels.length) return 'finish';
  if (state.currentLevelIndex + 1 < levels.length) return 'next';
  return progress.completed.size === levels.length ? 'finish' : 'levels';
}

export function advance() {
  if (activeScreen !== 'game-screen' || !state.isWin) return;

  byId('win-modal').close();
  switch (nextAction()) {
    case 'next':
      loadLevel(state.currentLevelIndex + 1);
      byId('game-board').focus();
      break;
    case 'levels':
      showScreen('level-select-screen');
      break;
    case 'finish':
      showScreen('ending-screen');
      break;
  }
}

function updateBest() {
  const moves = progress.best[state.currentLevelIndex] ?? '--';
  document.querySelectorAll('.best-count-val').forEach(element => { element.textContent = moves; });
}

export function updateHUD(change) {
  const { currentLevelIndex, moveCount, isWin } = state;
  moveCounters.forEach(element => { element.textContent = moveCount; });
  undoButtons.forEach(button => { button.disabled = moveCount === 0 || isWin; });
  if (change === 'move') return;

  byId('level-number').textContent = `Level ${currentLevelIndex + 1} / ${levels.length}`;
  byId('level-name').textContent = levels[currentLevelIndex].name;
  refreshPickers();
  updateBest();
  updateNextButtons();
}

function updateNextButtons() {
  const label = { next: 'Next Level', finish: 'Finish Game', levels: 'Remaining Levels' }[nextAction()];
  for (const id of ['btn-game-next', 'btn-sidebar-next', 'btn-modal-next']) {
    const button = byId(id);
    button.textContent = label;
    if (id !== 'btn-modal-next') button.hidden = !state.isWin;
  }
}

export function showWinModal() {
  byId('win-moves').textContent = state.moveCount;
  byId('win-best').textContent = progress.best[state.currentLevelIndex] ?? '--';
  byId('win-modal').showModal();
}

function buildLevelPicker(grid, compact = false) {
  return levels.map((level, index) => {
    const button = document.createElement('button');
    button.className = compact ? 'sidebar-level-item' : 'level-cell';
    button.addEventListener('click', () => startLevel(index));

    const number = document.createElement('span');
    number.className = compact ? 'sidebar-level-num' : 'level-cell-number';
    number.textContent = compact ? level.id : `Lvl ${level.id}`;
    button.append(number);

    const best = document.createElement('span');
    if (!compact) {
      const name = document.createElement('span');
      name.className = 'level-cell-name';
      name.textContent = level.name;
      best.className = 'best-score';
      button.append(name, best);
    }

    const check = document.createElement('span');
    check.className = compact ? 'sidebar-level-check' : 'done-check';
    check.textContent = '✓';
    check.setAttribute('aria-hidden', 'true');
    button.append(check);
    grid.append(button);
    return { button, best, check };
  });
}

function refreshPickers() {
  progress = getProgress();
  levels.forEach((level, index) => {
    const completed = progress.completed.has(index);
    const score = progress.best[index];
    const active = index === state.currentLevelIndex;
    for (const { button, check } of [levelButtons[index], quickButtons[index]]) {
      button.classList.toggle('completed', completed);
      button.setAttribute('aria-label', `Play level ${level.id}: ${level.name}${completed ? ', cleared' : ''}${score === undefined ? '' : `, best ${score} moves`}`);
      check.hidden = !completed;
    }
    levelButtons[index].best.textContent = score === undefined ? '--' : `Best: ${score}`;
    quickButtons[index].button.classList.toggle('active', active);
    if (active) quickButtons[index].button.setAttribute('aria-current', 'true');
    else quickButtons[index].button.removeAttribute('aria-current');
  });
}
