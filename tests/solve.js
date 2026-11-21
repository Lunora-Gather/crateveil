import assert from 'node:assert/strict';

const directions = ['up', 'down', 'left', 'right'];

// A breadth-first search over individual steps gives a shortest move sequence.
// Reverse pushes from the targets mark squares from which a crate could ever score.
export function solve({ id, map }) {
  const stride = Math.max(...map.map(row => row.length)) + 2;
  const offsets = [-stride, stride, -1, 1];
  const floor = new Set();
  const targets = new Set();
  const crates = [];
  const players = [];

  map.forEach((row, y) => [...row].forEach((tile, x) => {
    assert.match(tile, /^[#.PBT* -]$/, `Level ${id} has an unknown tile`);
    const cell = (y + 1) * stride + x + 1;
    if (tile !== '#' && tile !== ' ') floor.add(cell);
    if ('*T-'.includes(tile)) targets.add(cell);
    if ('B*'.includes(tile)) crates.push(cell);
    if ('P-'.includes(tile)) players.push(cell);
  }));

  assert.equal(players.length, 1, `Level ${id} must have one player`);
  assert.ok(targets.size > 0, `Level ${id} must have targets`);
  assert.equal(crates.length, targets.size, `Level ${id} must have equal crate and target counts`);

  const viable = new Set(targets);
  for (const cell of viable) {
    for (const offset of offsets) {
      if (floor.has(cell + offset) && floor.has(cell + 2 * offset)) viable.add(cell + offset);
    }
  }

  const key = (player, boxes) => `${player}:${boxes.join(',')}`;
  const queue = [{ player: players[0], boxes: crates, parent: -1, direction: null }];
  const seen = new Set([key(players[0], crates)]);
  for (let head = 0; head < queue.length; head++) {
    const { player, boxes } = queue[head];
    if (boxes.every(box => targets.has(box))) {
      const path = [];
      for (let step = queue[head]; step.parent !== -1; step = queue[step.parent]) {
        path.push(step.direction);
      }
      return path.reverse();
    }

    offsets.forEach((offset, index) => {
      const next = player + offset;
      if (!floor.has(next)) return;
      const box = boxes.indexOf(next);
      let nextBoxes = boxes;
      if (box !== -1) {
        const pushed = next + offset;
        if (!viable.has(pushed) || boxes.includes(pushed)) return;
        nextBoxes = boxes.slice();
        nextBoxes[box] = pushed;
        nextBoxes.sort((a, b) => a - b);
      }
      const stateKey = key(next, nextBoxes);
      if (seen.has(stateKey)) return;
      seen.add(stateKey);
      queue.push({ player: next, boxes: nextBoxes, parent: head, direction: directions[index] });
    });
  }
  throw new Error(`Level ${id} has no solution`);
}
