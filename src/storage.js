const KEYS = {
  COMPLETED: 'crateveil.completedLevels',
  BEST_MOVES: 'crateveil.bestMoves',
  LAST_LEVEL: 'crateveil.lastLevel',
  SOUND: 'crateveil.sound',
  THEME: 'crateveil.theme'
};

export function getCompletedLevels() {
  try {
    const data = localStorage.getItem(KEYS.COMPLETED);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load completed levels:", e);
    return [];
  }
}

export function saveCompletedLevel(index) {
  try {
    const completed = getCompletedLevels();
    if (!completed.includes(index)) {
      completed.push(index);
      localStorage.setItem(KEYS.COMPLETED, JSON.stringify(completed));
    }
  } catch (e) {
    console.error("Failed to save completed level:", e);
  }
}

export function getBestMoves() {
  try {
    const data = localStorage.getItem(KEYS.BEST_MOVES);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error("Failed to load best moves:", e);
    return {};
  }
}

export function saveBestMoves(index, moves) {
  try {
    const best = getBestMoves();
    const currentBest = best[index];
    if (currentBest === undefined || moves < currentBest) {
      best[index] = moves;
      localStorage.setItem(KEYS.BEST_MOVES, JSON.stringify(best));
    }
  } catch (e) {
    console.error("Failed to save best moves:", e);
  }
}

export function getLastLevel() {
  try {
    const data = localStorage.getItem(KEYS.LAST_LEVEL);
    return data ? parseInt(data, 10) : 0;
  } catch (e) {
    console.error("Failed to load last level:", e);
    return 0;
  }
}

export function saveLastLevel(index) {
  try {
    localStorage.setItem(KEYS.LAST_LEVEL, index.toString());
  } catch (e) {
    console.error("Failed to save last level:", e);
  }
}

export function getSoundSetting() {
  try {
    const data = localStorage.getItem(KEYS.SOUND);
    return data !== 'off'; // Default to true (on)
  } catch (e) {
    return true;
  }
}

export function getThemeSetting() {
  try {
    const data = localStorage.getItem(KEYS.THEME);
    return data || 'crt'; // Default to crt
  } catch (e) {
    return 'crt';
  }
}

export function saveThemeSetting(theme) {
  try {
    localStorage.setItem(KEYS.THEME, theme);
  } catch (e) {
    console.error("Failed to save theme setting:", e);
  }
}

export function resetProgress() {
  try {
    localStorage.removeItem(KEYS.COMPLETED);
    localStorage.removeItem(KEYS.BEST_MOVES);
    localStorage.setItem(KEYS.LAST_LEVEL, '0');
  } catch (e) {
    console.error("Failed to reset progress:", e);
  }
}
