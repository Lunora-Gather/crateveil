const frame = document.querySelector('iframe');
const report = document.querySelector('#report');
const arrow = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const wasd = { up: 'w', down: 's', left: 'a', right: 'd' };
const errors = [];
let browser;
let game;

async function log(message, success) {
  report.textContent += `\n${message}`;
  await fetch('/result', { method: 'POST', body: JSON.stringify({ message, success }) });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function equal(actual, expected, message) {
  assert(actual === expected, `${message}: expected ${expected}, got ${actual}`);
}

const pause = (ms = 40) => new Promise(resolve => setTimeout(resolve, ms));

async function load(target = frame) {
  const loaded = new Promise(resolve => target.addEventListener('load', resolve, { once: true }));
  target.src = '/crateveil/';
  await loaded;
  use(target);
  browser.addEventListener('error', event => errors.push(event.message));
  browser.addEventListener('unhandledrejection', event => errors.push(String(event.reason)));
  await pause();
  equal(game.querySelectorAll('#levels-grid .level-cell').length, 15, 'game boot');
}

function use(target) {
  browser = target.contentWindow;
  game = target.contentDocument;
}

const element = id => game.getElementById(id);
const click = id => element(id).click();
const active = id => !element(id).hidden;
const score = () => Number(game.querySelector('.moves-count-val').textContent);
const levelNumber = () => element('level-number').textContent;
const modal = () => element('win-modal');
const currentPlayer = () => game.querySelector('.player-sprite').parentElement;
const cellIndex = cell => [...element('game-board').children].indexOf(cell);

function key(name, options = {}) {
  const event = new browser.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...options });
  game.activeElement.dispatchEvent(event);
  return event.defaultPrevented;
}

function selectLevel(index, fromGame = false) {
  const desktop = browser.getComputedStyle(game.querySelector('.game-sidebar-column')).display !== 'none';
  const menu = fromGame && desktop ? '#sidebar-levels-grid' : '#levels-grid';
  if (!fromGame) click('btn-levels-menu');
  else if (!desktop) click('btn-game-levels');
  game.querySelectorAll(`${menu} button`)[index].click();
}

function solveLevel({ moves, id }) {
  moves.forEach((move, index) => {
    const keys = index % 2 ? arrow : wasd;
    key(keys[move]);
  });
  equal(score(), moves.length, `level ${id} move count`);
  assert(modal().open, `level ${id} win dialog`);
  equal(game.activeElement.id, 'btn-modal-next', `level ${id} dialog focus`);
  equal(Number(element('win-moves').textContent), moves.length, `level ${id} dialog moves`);
  equal(Number(element('win-best').textContent), moves.length, `level ${id} dialog best`);
  equal(game.querySelectorAll('.crate-charged').length, game.querySelectorAll('.target').length, `level ${id} targets filled`);
}

function pointer(type, dy) {
  element('game-board').dispatchEvent(new browser.PointerEvent(type, {
    bubbles: true,
    pointerType: 'touch',
    isPrimary: true,
    pointerId: 7,
    clientX: 100,
    clientY: 100 + dy
  }));
}

function gesture(end = 'pointerup', distance = 45) {
  pointer('pointerdown', 0);
  pointer(end, distance);
}

async function checkLayout(index, width, height) {
  selectLevel(index, true);

  const board = element('game-board');
  const stage = board.parentElement;
  let gap;
  for (let attempt = 0; attempt < 14; attempt++) {
    await pause();
    const b = board.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    gap = Math.min(b.left - s.left, s.right - b.right, b.top - s.top, s.bottom - b.bottom);
    if (gap >= -1) break;
  }
  assert(gap >= -1, `level ${index + 1} board clipped at ${width}×${height} by ${-gap}px`);
  const screen = element('game-screen');
  assert(Number(browser.getComputedStyle(screen).opacity) >= 0.75, 'game screen is visible during navigation');
  assert(screen.scrollWidth <= screen.clientWidth + 1, `horizontal overflow at ${width}×${height}`);
  const desktop = width >= 769 && browser.matchMedia('(pointer: fine)').matches;
  const displayed = browser.getComputedStyle(element('btn-desktop-sound').parentElement).display !== 'none';
  equal(displayed, desktop, 'desktop settings visibility');
  const dpad = element('mobile-controls');
  equal(browser.getComputedStyle(dpad).display !== 'none', !desktop, 'D-pad visibility');
  if (!desktop) {
    const controls = element('btn-game-help');
    controls.scrollIntoView({ block: 'nearest' });
    assert(controls.getBoundingClientRect().bottom <= screen.getBoundingClientRect().bottom + 1, 'mobile controls are reachable');
    screen.scrollTop = 0;
  }
}

async function run() {
  assert(/Version\/[\d.]+.*Safari\//.test(navigator.userAgent) && !navigator.userAgent.includes('Chrome'), 'Safari user agent expected');
  await log(navigator.userAgent);
  const solutions = await (await fetch('/solutions.json')).json();
  await load();
  await game.fonts.ready;
  const faces = [...game.fonts];
  assert(faces.some(face => face.family === 'Outfit' && face.status === 'loaded'), 'local Outfit loaded');
  assert(faces.some(face => face.family.replaceAll('"', '') === 'Share Tech Mono' && face.status === 'loaded'), 'local Share Tech Mono loaded');
  assert(browser.performance.getEntriesByType('resource').every(entry => new URL(entry.name).origin === location.origin), 'page assets are same-origin');
  equal(browser.getComputedStyle(game.body, '::before').animationName, 'none', 'no full-screen grid animation');

  localStorage.setItem('crateveil.sound', 'off');
  localStorage.setItem('crateveil.lastLevel', '-10');
  localStorage.setItem('crateveil.bestMoves', '{"0":"<img src=x>"}');
  localStorage.setItem('crateveil.completedLevels', 'null');
  await load();

  click('btn-start');
  equal(levelNumber(), 'Level 1 / 15', 'invalid saved level fallback');
  equal(game.querySelector('.best-count-val').textContent, '--', 'invalid best score ignored');
  assert(!active('btn-sidebar-next') && !active('btn-game-next'), 'Next is hidden before clear');
  key('n', { shiftKey: true });
  equal(levelNumber(), 'Level 1 / 15', 'no skip shortcut');

  const originalPlayer = currentPlayer();
  const wall = game.querySelector('.cell.wall');
  key('ArrowUp', { metaKey: true });
  equal(score(), 0, 'browser shortcut preserved');
  key('ArrowUp');
  equal(score(), 1, 'keyboard movement');
  assert(wall === game.querySelector('.cell.wall'), 'static tiles survive a move');
  click('btn-sidebar-help');
  key('r');
  key('u');
  equal(score(), 1, 'game commands ignored from help');
  assert(!key('ArrowDown'), 'arrows retain default behavior in help');
  assert(!key(' '), 'Space retains default behavior in help');
  key('Escape');
  assert(active('game-screen'), 'help returns to game');
  click('btn-sidebar-undo');
  equal(score(), 0, 'undo');
  assert(currentPlayer() === originalPlayer, 'undo restored player');
  key('ArrowDown');
  const crate = game.querySelectorAll('.crate-sprite')[1];
  const crateHome = crate.parentElement;
  key('ArrowRight');
  assert(crate.parentElement !== crateHome, 'push moved crate');
  key('u');
  assert(crate.parentElement === crateHome, 'undo restored crate');
  key('r');
  equal(score(), 0, 'restart');
  key('ArrowUp');
  key('ArrowUp');
  key('ArrowUp');
  equal(score(), 2, 'wall collision does not count as a move');
  key('r');

  key('ArrowDown');
  key('ArrowRight');
  const savedPlayer = cellIndex(currentPlayer());
  const savedCrate = cellIndex(game.querySelectorAll('.crate-sprite')[1].parentElement);
  await load();
  equal(element('btn-start').textContent, 'Continue Game', 'reload offers to continue');
  click('btn-start');
  equal(score(), 2, 'reload restored the move count');
  equal(cellIndex(currentPlayer()), savedPlayer, 'reload restored player');
  equal(cellIndex(game.querySelectorAll('.crate-sprite')[1].parentElement), savedCrate, 'reload restored the pushed crate');
  key('u');
  equal(score(), 1, 'reload restored undo history');
  key('r');
  click('btn-logo-home');
  equal(element('btn-start').textContent, 'Start Game', 'restart cleared the checkpoint');
  click('btn-start');
  await log('Reload restored player, crate positions and undo history.');

  const sizes = [[320, 568], [375, 667], [430, 932], [667, 375], [768, 680], [769, 680], [900, 500], [1120, 780]];
  for (const [width, height] of sizes) {
    frame.width = width;
    frame.height = height;
    await pause();
    for (const [index] of solutions.entries()) await checkLayout(index, width, height);
  }
  await log(`Board fit verified for all ${solutions.length} maps at ${sizes.length} viewport sizes.`);

  frame.width = 390;
  frame.height = 700;
  await pause();
  selectLevel(0, true);
  click('dpad-up');
  equal(score(), 1, 'one D-pad click moves one step');
  gesture('pointerup', 10);
  equal(score(), 1, 'tap ignored by swipe handler');
  gesture('pointercancel');
  equal(score(), 1, 'canceled swipe cannot move');
  gesture();
  equal(score(), 2, 'swipe moved player down');
  pointer('pointerdown', 0);
  selectLevel(1, true);
  pointer('pointerup', 45);
  equal(score(), 0, 'swipe started on a different level is discarded');
  frame.width = 1120;
  frame.height = 780;
  await pause();

  click('btn-logo-home');
  selectLevel(14);
  solveLevel(solutions[14]);
  equal(element('btn-modal-next').textContent, 'Remaining Levels', 'skipped campaign cannot finish');
  key('r');
  equal(score(), solutions[14].moves.length, 'restart shortcut isolated behind modal');
  key('n');
  assert(active('level-select-screen') && !modal().open, 'remaining levels shortcut closed the dialog');
  equal(game.querySelectorAll('#levels-grid .completed').length, 1, 'only the last level was cleared');
  click('btn-levels-back');
  click('btn-settings-menu');
  click('btn-reset-progress');
  equal(game.activeElement.id, 'btn-confirm-cancel', 'reset starts focused on cancel');
  element('confirm-modal').dispatchEvent(new browser.Event('cancel', { cancelable: true }));
  assert(!element('confirm-modal').open, 'cancel closed reset dialog');
  equal(game.querySelectorAll('#levels-grid .completed').length, 1, 'cancel kept records');
  click('btn-reset-progress');
  click('btn-confirm-ok');
  assert(active('home-screen'), 'reset returns home');
  equal(game.querySelectorAll('#levels-grid .completed').length, 0, 'reset clears best scores');

  click('btn-start');
  for (const solution of solutions) {
    equal(levelNumber(), `Level ${solution.id} / 15`, 'campaign order');
    solveLevel(solution);
    const moves = solution.moves.length;
    await log(`✓ ${String(solution.id).padStart(2)} ${solution.name} · ${moves} moves`);
    if (solution.id % 2) key('n');
    else click('btn-modal-next');
    assert(!modal().open, 'Next removed win dialog');
  }
  assert(active('ending-screen'), 'ending screen unlocked');
  equal(game.querySelectorAll('#levels-grid .completed').length, 15, 'saved all completions');

  await load();
  click('btn-levels-menu');
  equal(game.querySelectorAll('#levels-grid .completed').length, 15, 'all clears survived reload');
  click('btn-levels-back');
  click('btn-start');
  equal(levelNumber(), 'Level 15 / 15', 'last played level survived reload');
  equal(game.querySelector('.best-count-val').textContent, String(solutions[14].moves.length), 'best survived reload');
  click('btn-desktop-theme');
  assert(game.body.classList.contains('theme-dark'), 'theme switches from the desktop toolbar');
  click('btn-sidebar-home');
  click('btn-settings-menu');
  equal(element('setting-sound').getAttribute('aria-pressed'), 'false', 'sound preference restored');
  click('setting-sound');
  equal(localStorage.getItem('crateveil.sound'), 'on', 'sound setting saved');
  click('setting-sound');
  await load();
  assert(game.body.classList.contains('theme-dark'), 'theme survived reload');

  const peer = document.createElement('iframe');
  peer.title = 'Crateveil second tab';
  peer.width = 1120;
  peer.height = 780;
  document.body.append(peer);
  await load(peer);
  click('btn-settings-menu');
  click('setting-theme');
  await pause();
  assert(frame.contentDocument.body.classList.contains('theme-crt'), 'theme propagated to an open game');
  use(frame);
  click('btn-start');
  key('ArrowDown');
  equal(score(), 1, 'first tab has a pending move before reset');
  use(peer);
  click('btn-reset-progress');
  click('btn-confirm-ok');
  await pause(100);
  use(frame);
  assert(active('home-screen'), 'reset in second tab closes the stale session');
  equal(element('btn-start').textContent, 'Start Game', 'stale move was discarded');
  equal(game.querySelectorAll('#levels-grid .completed').length, 0, 'reset propagated to first tab');
  click('btn-start');
  equal(levelNumber(), 'Level 1 / 15', 'reset selects the first level');
  solveLevel(solutions[0]);

  use(peer);
  selectLevel(1);
  solveLevel(solutions[1]);
  await pause();
  use(frame);
  equal(game.querySelectorAll('#levels-grid .completed').length, 2, 'both open tabs retained their completion');
  click('btn-modal-levels');
  equal(game.querySelectorAll('#levels-grid .completed').length, 2, 'both scores shown in level selection');
  peer.remove();
  await log('Two same-origin Safari sessions kept best scores and synchronized settings and reset.');

  assert(errors.length === 0, errors.join('\n'));
  await log('PASS · 15/15 cleared · input, dialogs, persistence and responsive layout', true);
}

run().catch(error => log(`FAIL · ${error.message + (error.stack ? '\n' + error.stack : '')}`, false));
