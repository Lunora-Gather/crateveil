import { state } from './game.js';

export function renderBoard() {
  const boardEl = document.getElementById('game-board');
  if (!boardEl) return;

  boardEl.innerHTML = '';
  
  // Set CSS grid layout columns and rows
  boardEl.style.gridTemplateColumns = `repeat(${state.width}, var(--cell-size))`;
  boardEl.style.gridTemplateRows = `repeat(${state.height}, var(--cell-size))`;

  // Dynamic cell sizing
  updateCellSize();

  for (let r = 0; r < state.height; r++) {
    for (let c = 0; c < state.width; c++) {
      const cellEl = document.createElement('div');
      cellEl.classList.add('cell');

      const base = state.baseTiles[r][c];
      const isPlayer = state.player.row === r && state.player.col === c;
      const isCrate = state.crates.some(crate => crate.row === r && crate.col === c);

      // 1. Draw Static Environment Backgrounds
      if (base === '#') {
        cellEl.classList.add('wall');
        
        // Add brick-joint line inside walls
        const wallInner = document.createElement('div');
        wallInner.classList.add('wall-inner');
        cellEl.appendChild(wallInner);
      } else if (base === ' ') {
        cellEl.classList.add('outside');
      } else {
        cellEl.classList.add('floor');
        
        // Add floor grid dot decoration
        const floorInner = document.createElement('div');
        floorInner.classList.add('floor-inner');
        cellEl.appendChild(floorInner);

        if (base === 'T') {
          cellEl.classList.add('target');
          
          // Outer target neon portal ring
          const targetRing = document.createElement('div');
          targetRing.classList.add('target-ring');
          cellEl.appendChild(targetRing);
          
          // Inner core target dot
          const targetDot = document.createElement('div');
          targetDot.classList.add('target-dot');
          cellEl.appendChild(targetDot);
        }
      }

      // 2. Draw Moving Entities
      if (isPlayer) {
        const playerEl = document.createElement('div');
        playerEl.classList.add('player-sprite');
        
        // Detailed retro TV robot head
        const antenna = document.createElement('div');
        antenna.classList.add('player-antenna');
        playerEl.appendChild(antenna);

        const screenVisor = document.createElement('div');
        screenVisor.classList.add('player-visor');
        
        const eyes = document.createElement('div');
        eyes.classList.add('player-eyes');
        screenVisor.appendChild(eyes);
        playerEl.appendChild(screenVisor);

        const bodyDetail = document.createElement('div');
        bodyDetail.classList.add('player-body-trim');
        playerEl.appendChild(bodyDetail);

        if (base === 'T') {
          cellEl.classList.add('player-on-target');
        } else {
          cellEl.classList.add('player');
        }
        cellEl.appendChild(playerEl);
      } else if (isCrate) {
        const crateEl = document.createElement('div');
        crateEl.classList.add('crate-sprite');
        
        // Add detailed wood chest reinforcement frames
        const brace = document.createElement('div');
        brace.classList.add('crate-brace');
        crateEl.appendChild(brace);

        // Corner metal brackets
        const corners = ['tl', 'tr', 'bl', 'br'];
        corners.forEach(pos => {
          const corner = document.createElement('div');
          corner.classList.add('crate-corner', `corner-${pos}`);
          crateEl.appendChild(corner);
        });

        // Center rivet/stud
        const centerStud = document.createElement('div');
        centerStud.classList.add('crate-stud');
        crateEl.appendChild(centerStud);

        if (base === 'T') {
          cellEl.classList.add('crate-on-target');
          crateEl.classList.add('crate-charged');
          if (state.justChargedCell && state.justChargedCell.row === r && state.justChargedCell.col === c) {
            crateEl.classList.add('crate-just-charged');
          }
        } else {
          cellEl.classList.add('crate');
        }
        cellEl.appendChild(crateEl);
      }

      boardEl.appendChild(cellEl);
    }
  }
}

export function updateCellSize() {
  const boardEl = document.getElementById('game-board');
  if (!boardEl || !state.width || !state.height) return;

  const appContainer = document.getElementById('app-container');
  if (!appContainer) return;

  const appW = appContainer.clientWidth;
  const appH = appContainer.clientHeight;
  const isMobile = window.innerWidth <= 768;

  let maxW, maxH;

  if (isMobile) {
    // Mobile layout: Stacks vertically
    // Subtract padding of board area (~32px horizontal)
    maxW = appW - 32;
    // Heights to subtract: Header (~65px), Stats (~55px), Dpad (~130px), Mobile Footer (~60px)
    maxH = appH - 310;
  } else {
    // Desktop layout: Side-by-side dashboard
    // Left column width = appWidth - sidebar (300px) - gap (24px) - padding (48px)
    maxW = appW - 372;
    // Heights to subtract: Header/divider (~80px), app vertical padding (48px), settings bar (~50px), safety buffer
    maxH = appH - 200;
  }

  // Precise subtraction: account for board padding (24px), border (2px), and cell gaps (3px each)
  const horizontalMargins = 26 + (state.width - 1) * 3;
  const verticalMargins = 26 + (state.height - 1) * 3;

  const sizeW = Math.floor(Math.max(10, maxW - horizontalMargins) / state.width);
  const sizeH = Math.floor(Math.max(10, maxH - verticalMargins) / state.height);
  
  let cellSize = Math.min(sizeW, sizeH);
  
  // Set bounds (expand max cell size from 30px to 72px for visual impact on PC)
  cellSize = Math.max(30, Math.min(72, cellSize));
  
  document.documentElement.style.setProperty('--cell-size', `${cellSize}px`);
}

window.addEventListener('resize', updateCellSize);
