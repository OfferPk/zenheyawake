/**
 * ZenHeyawake Application Controller
 * Handles interactive gameplay, drag painting, validation feedback,
 * deductive hints, progress tracking, audio, and offline caching.
 */

(function () {
  'use strict';

  let currentLevelIdx = 0;
  let engine = null;
  let currentLevel = null;
  let board = [];
  let undoStack = [];
  let redoStack = [];
  let toolMode = 'cycle'; // 'cycle' | 'stone' | 'dot'
  let timerInterval = null;
  let secondsElapsed = 0;
  let isTimerRunning = false;
  let isCompleted = false;
  let isDragging = false;
  let dragVal = null;

  const audio = new ZenAudio();

  // Load saved progress
  let completedLevels = new Set(
    JSON.parse(localStorage.getItem('zenheyawake_completed') || '[]')
  );

  // DOM Elements
  const gridEl = document.getElementById('grid');
  const levelTitleEl = document.getElementById('level-title');
  const packTagEl = document.getElementById('pack-tag');
  const timerEl = document.getElementById('timer-display');
  const stonesPlacedEl = document.getElementById('stones-placed');
  const hintBannerEl = document.getElementById('hint-banner');

  // Tool buttons
  const toolCycleBtn = document.getElementById('tool-cycle');
  const toolStoneBtn = document.getElementById('tool-stone');
  const toolDotBtn = document.getElementById('tool-dot');

  // Modals
  const rulesModal = document.getElementById('rules-modal');
  const levelModal = document.getElementById('level-modal');
  const victoryModal = document.getElementById('victory-modal');

  function initApp() {
    // Register Service Worker for offline play
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    // Set saved theme
    const savedTheme = localStorage.getItem('zenheyawake_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon();

    // Sound toggle state
    updateSoundIcon();

    // Saved level
    const lastLevel = parseInt(localStorage.getItem('zenheyawake_last_level') || '0', 10);
    if (!isNaN(lastLevel) && lastLevel >= 0 && lastLevel < HEYAWAKE_LEVELS.length) {
      currentLevelIdx = lastLevel;
    }

    setupEventListeners();
    loadLevel(currentLevelIdx);
  }

  function loadLevel(idx) {
    if (idx < 0 || idx >= HEYAWAKE_LEVELS.length) return;
    currentLevelIdx = idx;
    localStorage.setItem('zenheyawake_last_level', String(idx));
    currentLevel = HEYAWAKE_LEVELS[idx];

    engine = new HeyawakeEngine(currentLevel.width, currentLevel.height, currentLevel.rooms);

    // Initialize board (0 = empty)
    board = Array.from({ length: currentLevel.height }, () =>
      new Array(currentLevel.width).fill(0)
    );

    undoStack = [];
    redoStack = [];
    isCompleted = false;
    resetTimer();
    hideHint();

    levelTitleEl.textContent = `${currentLevel.id}. ${currentLevel.name}`;
    packTagEl.textContent = `${currentLevel.pack} • ${currentLevel.difficulty} (${currentLevel.width}×${currentLevel.height})`;

    renderGrid();
    updateValidationUI();
  }

  function renderGrid() {
    gridEl.innerHTML = '';
    const H = currentLevel.height;
    const W = currentLevel.width;

    // Adjust cell size dynamically to fit screen
    const maxDimension = Math.max(H, W);
    let cellSize = 54;
    const screenWidth = Math.min(window.innerWidth - 48, 520);
    cellSize = Math.floor(screenWidth / maxDimension);
    if (cellSize > 56) cellSize = 56;
    if (cellSize < 32) cellSize = 32;

    gridEl.style.gridTemplateColumns = `repeat(${W}, ${cellSize}px)`;
    gridEl.style.gridTemplateRows = `repeat(${H}, ${cellSize}px)`;

    // Find top-left cell of each room to place clue label
    const roomTopLeft = {};
    for (const room of currentLevel.rooms) {
      roomTopLeft[room.id] = { r: room.r, c: room.c };
    }

    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.style.width = `${cellSize}px`;
        cell.style.height = `${cellSize}px`;

        const roomId = engine.getRoomId(r, c);

        // Room and internal borders
        // Top border
        if (r === 0 || engine.getRoomId(r - 1, c) !== roomId) {
          cell.classList.add('room-border-top');
        } else {
          cell.classList.add('cell-border-top');
        }
        // Bottom border
        if (r === H - 1 || engine.getRoomId(r + 1, c) !== roomId) {
          cell.classList.add('room-border-bottom');
        } else {
          cell.classList.add('cell-border-bottom');
        }
        // Left border
        if (c === 0 || engine.getRoomId(r, c - 1) !== roomId) {
          cell.classList.add('room-border-left');
        } else {
          cell.classList.add('cell-border-left');
        }
        // Right border
        if (c === W - 1 || engine.getRoomId(r, c + 1) !== roomId) {
          cell.classList.add('room-border-right');
        } else {
          cell.classList.add('cell-border-right');
        }

        // Add clue label if this is top-left of a clued room
        const tl = roomTopLeft[roomId];
        const roomObj = engine.getRoom(roomId);
        if (tl && tl.r === r && tl.c === c && roomObj.clue !== null && roomObj.clue >= 0) {
          const clueSpan = document.createElement('span');
          clueSpan.className = 'room-clue-label';
          clueSpan.id = `room-clue-${roomId}`;
          clueSpan.textContent = roomObj.clue;
          cell.appendChild(clueSpan);
        }

        // Cell content (stone or dot)
        updateCellContent(cell, board[r][c]);

        // Pointer event handling for click and drag
        cell.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (isCompleted) return;
          startTimer();
          isDragging = true;
          handleCellInteraction(r, c);
        });

        cell.addEventListener('pointerenter', (e) => {
          if (isDragging && !isCompleted) {
            handleCellDragEnter(r, c);
          }
        });

        gridEl.appendChild(cell);
      }
    }
  }

  function updateCellContent(cellEl, val) {
    const existing = cellEl.querySelector('.stone-marker, .dot-marker');
    if (existing) existing.remove();

    if (val === 1) {
      const stone = document.createElement('div');
      stone.className = 'stone-marker';
      cellEl.appendChild(stone);
    } else if (val === 2) {
      const dot = document.createElement('div');
      dot.className = 'dot-marker';
      cellEl.appendChild(dot);
    }
  }

  function handleCellInteraction(r, c) {
    saveSnapshot();
    const cur = board[r][c];
    let nextVal = 0;

    if (toolMode === 'cycle') {
      // 0 -> 1 -> 2 -> 0
      nextVal = cur === 0 ? 1 : cur === 1 ? 2 : 0;
    } else if (toolMode === 'stone') {
      nextVal = cur === 1 ? 0 : 1;
    } else if (toolMode === 'dot') {
      nextVal = cur === 2 ? 0 : 2;
    }

    dragVal = nextVal;
    applyCellValue(r, c, nextVal);
  }

  function handleCellDragEnter(r, c) {
    if (dragVal === null) return;
    if (board[r][c] !== dragVal) {
      applyCellValue(r, c, dragVal);
    }
  }

  function applyCellValue(r, c, val) {
    board[r][c] = val;
    const cellEl = gridEl.children[r * currentLevel.width + c];
    if (cellEl) {
      updateCellContent(cellEl, val);
    }

    if (val === 1) audio.playStone();
    else if (val === 2) audio.playTick();
    else audio.playTick();

    updateValidationUI();
    checkWinCondition();
  }

  function updateValidationUI() {
    const validation = engine.validate(board);
    const H = currentLevel.height;
    const W = currentLevel.width;

    // 1. Update Room Clues
    let totalStones = 0;
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        if (board[r][c] === 1) totalStones++;
      }
    }
    stonesPlacedEl.textContent = totalStones;

    for (const room of currentLevel.rooms) {
      if (room.clue === null || room.clue < 0) continue;
      const labelEl = document.getElementById(`room-clue-${room.id}`);
      if (!labelEl) continue;

      const st = validation.roomResult.roomStatus[room.id];
      labelEl.classList.remove('clue-satisfied', 'clue-violated');

      if (st.violated) {
        labelEl.classList.add('clue-violated');
      } else if (st.satisfied) {
        labelEl.classList.add('clue-satisfied');
      }
    }

    // 2. Clear Conflict highlights
    const allCells = gridEl.querySelectorAll('.grid-cell');
    allCells.forEach(el => el.classList.remove('cell-conflict'));

    // Highlight adjacent black conflicts
    if (!validation.adjacentResult.valid) {
      validation.adjacentResult.violations.forEach(pair => {
        const c1 = gridEl.children[pair[0].r * W + pair[0].c];
        const c2 = gridEl.children[pair[1].r * W + pair[1].c];
        if (c1) c1.classList.add('cell-conflict');
        if (c2) c2.classList.add('cell-conflict');
      });
    }

    // 3. Highlight Corridor violations
    const existingCorridors = gridEl.querySelectorAll('.corridor-overlay');
    existingCorridors.forEach(el => el.remove());

    if (!validation.corridorResult.valid) {
      validation.corridorResult.violations.forEach(corr => {
        corr.cells.forEach(pt => {
          const cellEl = gridEl.children[pt.r * W + pt.c];
          if (cellEl) cellEl.classList.add('cell-conflict');
        });
      });
    }

    return validation;
  }

  function checkWinCondition() {
    const validation = engine.validate(board);
    if (validation.isSolved && !isCompleted) {
      isCompleted = true;
      stopTimer();
      audio.playVictory();

      completedLevels.add(currentLevel.id);
      localStorage.setItem('zenheyawake_completed', JSON.stringify([...completedLevels]));

      setTimeout(() => {
        showVictoryModal();
      }, 400);
    }
  }

  // Undo / Redo
  function saveSnapshot() {
    undoStack.push(board.map(r => [...r]));
    redoStack = [];
    if (undoStack.length > 50) undoStack.shift();
  }

  function undo() {
    if (undoStack.length === 0 || isCompleted) return;
    redoStack.push(board.map(r => [...r]));
    board = undoStack.pop();
    audio.playUndo();
    refreshAllCells();
    updateValidationUI();
  }

  function redo() {
    if (redoStack.length === 0 || isCompleted) return;
    undoStack.push(board.map(r => [...r]));
    board = redoStack.pop();
    audio.playUndo();
    refreshAllCells();
    updateValidationUI();
  }

  function resetLevel() {
    if (isCompleted) return;
    saveSnapshot();
    board = Array.from({ length: currentLevel.height }, () =>
      new Array(currentLevel.width).fill(0)
    );
    audio.playUndo();
    refreshAllCells();
    updateValidationUI();
    resetTimer();
    hideHint();
  }

  function refreshAllCells() {
    const W = currentLevel.width;
    for (let r = 0; r < currentLevel.height; r++) {
      for (let c = 0; c < W; c++) {
        const cellEl = gridEl.children[r * W + c];
        if (cellEl) updateCellContent(cellEl, board[r][c]);
      }
    }
  }

  // Deductive Hint Engine
  function requestHint() {
    if (isCompleted) return;
    startTimer();
    const hint = engine.getHint(board, currentLevel.solution);

    hintBannerEl.className = 'hint-banner show';
    if (hint.type === 'error') {
      hintBannerEl.classList.add('hint-error');
    } else if (hint.type === 'deduction') {
      hintBannerEl.classList.add('hint-deduction');
    } else {
      hintBannerEl.classList.add('hint-guide');
    }

    hintBannerEl.textContent = hint.message;

    // Highlight recommended cells briefly
    if (hint.cells && hint.cells.length > 0) {
      hint.cells.forEach(pt => {
        const cellEl = gridEl.children[pt.r * currentLevel.width + pt.c];
        if (cellEl) {
          cellEl.style.transition = 'transform 0.2s ease';
          cellEl.style.transform = 'scale(1.15)';
          setTimeout(() => {
            if (cellEl) cellEl.style.transform = 'scale(1)';
          }, 600);
        }
      });
    }

    audio.playChime();
  }

  function hideHint() {
    hintBannerEl.className = 'hint-banner';
    hintBannerEl.textContent = '';
  }

  // Timer
  function startTimer() {
    if (isTimerRunning) return;
    isTimerRunning = true;
    timerInterval = setInterval(() => {
      secondsElapsed++;
      const m = Math.floor(secondsElapsed / 60);
      const s = secondsElapsed % 60;
      timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }, 1000);
  }

  function stopTimer() {
    isTimerRunning = false;
    clearInterval(timerInterval);
  }

  function resetTimer() {
    stopTimer();
    secondsElapsed = 0;
    timerEl.textContent = '00:00';
  }

  // Event Listeners
  function setupEventListeners() {
    window.addEventListener('pointerup', () => {
      isDragging = false;
      dragVal = null;
    });

    // Tool switcher
    toolCycleBtn.addEventListener('click', () => setToolMode('cycle'));
    toolStoneBtn.addEventListener('click', () => setToolMode('stone'));
    toolDotBtn.addEventListener('click', () => setToolMode('dot'));

    // Actions
    document.getElementById('btn-undo').addEventListener('click', undo);
    document.getElementById('btn-reset').addEventListener('click', resetLevel);\n    document.getElementById('btn-hint').addEventListener('click', requestHint);

    // Header buttons
    document.getElementById('btn-rules').addEventListener('click', () => {
      rulesModal.classList.add('active');
    });
    document.getElementById('close-rules-btn').addEventListener('click', () => {
      rulesModal.classList.remove('active');
    });

    document.getElementById('btn-levels').addEventListener('click', openLevelModal);
    document.getElementById('close-level-btn').addEventListener('click', () => {
      levelModal.classList.remove('active');
    });

    document.getElementById('btn-sound').addEventListener('click', () => {
      audio.toggleMute();
      updateSoundIcon();
    });

    document.getElementById('btn-theme').addEventListener('click', toggleTheme);

    // Victory dialog
    document.getElementById('btn-next-level').addEventListener('click', () => {
      victoryModal.classList.remove('active');
      if (currentLevelIdx + 1 < HEYAWAKE_LEVELS.length) {
        loadLevel(currentLevelIdx + 1);
      } else {
        openLevelModal();
      }
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === 'r') {
        resetLevel();
      } else if (e.key === 'h') {
        requestHint();
      } else if (e.key === '1') {
        setToolMode('stone');
      } else if (e.key === '2') {
        setToolMode('dot');
      } else if (e.key === '3') {
        setToolMode('cycle');
      }
    });
  }

  function setToolMode(mode) {
    toolMode = mode;
    toolCycleBtn.classList.toggle('active', mode === 'cycle');
    toolStoneBtn.classList.toggle('active', mode === 'stone');
    toolDotBtn.classList.toggle('active', mode === 'dot');
  }

  function openLevelModal() {
    const listEl = document.getElementById('level-select-grid');
    listEl.innerHTML = '';

    HEYAWAKE_LEVELS.forEach((lvl, i) => {
      const tile = document.createElement('div');
      tile.className = 'level-tile';
      if (completedLevels.has(lvl.id)) tile.classList.add('completed');
      if (i === currentLevelIdx) tile.classList.add('active-level');

      tile.textContent = `${lvl.id}`;
      tile.title = `${lvl.name} (${lvl.pack})`;

      tile.addEventListener('click', () => {
        levelModal.classList.remove('active');
        loadLevel(i);
      });

      listEl.appendChild(tile);
    });

    levelModal.classList.add('active');
  }

  function showVictoryModal() {
    const m = Math.floor(secondsElapsed / 60);
    const s = secondsElapsed % 60;
    const timeStr = `${m > 0 ? `${m}m ` : ''}${s}s`;
    document.getElementById('victory-time').textContent = timeStr;
    document.getElementById('victory-level-name').textContent = `${currentLevel.name} Harmonized!`;
    victoryModal.classList.add('active');
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('zenheyawake_theme', next);
    updateThemeIcon();
  }

  function updateThemeIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.getElementById('btn-theme').textContent = isDark ? '☀️' : '🌙';
  }

  function updateSoundIcon() {
    document.getElementById('btn-sound').textContent = audio.isMuted() ? '🔇' : '🔊';
  }

  window.addEventListener('DOMContentLoaded', initApp);
})();
