const test = require('node:test');
const assert = require('node:assert/strict');
const HeyawakeEngine = require('../src/heyawake-engine');
const levels = require('../src/levels');

test('HeyawakeEngine - Room Mapping and Cell Partition', () => {
  const rooms = [
    { id: 0, r: 0, c: 0, w: 2, h: 2, clue: 1 },
    { id: 1, r: 0, c: 2, w: 2, h: 2, clue: 0 },
    { id: 2, r: 2, c: 0, w: 4, h: 2, clue: 2 }
  ];
  const engine = new HeyawakeEngine(4, 4, rooms);

  assert.equal(engine.width, 4);
  assert.equal(engine.height, 4);
  assert.equal(engine.getRoomId(0, 0), 0);
  assert.equal(engine.getRoomId(0, 3), 1);
  assert.equal(engine.getRoomId(3, 2), 2);
  assert.equal(engine.getRoomCells(0).length, 4);
});

test('HeyawakeEngine - Adjacent Black Stones Validation', () => {
  const rooms = [
    { id: 0, r: 0, c: 0, w: 3, h: 3, clue: 2 }
  ];
  const engine = new HeyawakeEngine(3, 3, rooms);

  // Orthogonally touching black stones
  const invalidBoard = [
    [1, 1, 2],
    [2, 2, 2],
    [2, 2, 2]
  ];
  const adjCheck = engine.validateAdjacentBlack(invalidBoard);
  assert.equal(adjCheck.valid, false);
  assert.equal(adjCheck.violations.length, 1);

  // Diagonally touching black stones (legal in Heyawake)
  const validBoard = [
    [1, 2, 2],
    [2, 1, 2],
    [2, 2, 2]
  ];
  assert.equal(engine.validateAdjacentBlack(validBoard).valid, true);
});

test('HeyawakeEngine - White Connectivity Validation', () => {
  const rooms = [
    { id: 0, r: 0, c: 0, w: 3, h: 3, clue: 3 }
  ];
  const engine = new HeyawakeEngine(3, 3, rooms);

  // White cells partitioned into two disconnected components
  // Diagonal cut: (0, 2), (1, 1), (2, 0) are black
  const disconnectedBoard = [
    [2, 2, 1],
    [2, 1, 2],
    [1, 2, 2]
  ];
  const connCheck = engine.validateWhiteConnectivity(disconnectedBoard);
  assert.equal(connCheck.valid, false);

  // All white cells connected
  const connectedBoard = [
    [1, 2, 2],
    [2, 2, 2],
    [2, 2, 1]
  ];
  assert.equal(engine.validateWhiteConnectivity(connectedBoard).valid, true);
});

test('HeyawakeEngine - Corridor Constraint (Room Boundary Rule)', () => {
  // 3 rooms in a row: Room 0 (cols 0..1), Room 1 (cols 2..3), Room 2 (cols 4..5)
  const rooms = [
    { id: 0, r: 0, c: 0, w: 2, h: 2, clue: 0 },
    { id: 1, r: 0, c: 2, w: 2, h: 2, clue: 0 },
    { id: 2, r: 0, c: 4, w: 2, h: 2, clue: 0 }
  ];
  const engine = new HeyawakeEngine(6, 2, rooms);

  // White line traversing across all 3 rooms in row 0
  const invalidBoard = [
    [2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2]
  ];
  const corrCheck = engine.validateCorridors(invalidBoard);
  assert.equal(corrCheck.valid, false);
  assert.ok(corrCheck.violations.length > 0);
  assert.equal(corrCheck.violations[0].roomsVisited.length, 3);

  // Breaking the corridor with a black stone in Room 1
  const validBoard = [
    [2, 2, 1, 2, 2, 2],
    [2, 2, 2, 1, 2, 2]
  ];
  assert.equal(engine.validateCorridors(validBoard).valid, true);
});

test('HeyawakeEngine - Full Level Database Verification (50 Levels)', () => {
  assert.equal(levels.length, 50, 'Must have exactly 50 handcrafted levels');

  const packs = ['Engawa', 'Shoji', 'Tatami', 'Tokonoma', 'Daitokuji'];
  const sizes = [6, 7, 8, 9, 10];

  for (let p = 0; p < 5; p++) {
    const packLevels = levels.filter(l => l.pack === packs[p]);
    assert.equal(packLevels.length, 10, `Pack ${packs[p]} must have 10 levels`);

    packLevels.forEach(lvl => {
      assert.equal(lvl.width, sizes[p]);
      assert.equal(lvl.height, sizes[p]);
      assert.ok(lvl.rooms.length >= 4, 'Level must have rooms');

      // Verify room tiling covers entire grid
      const grid = Array.from({ length: lvl.height }, () => new Array(lvl.width).fill(false));
      lvl.rooms.forEach(r => {
        for (let dr = 0; dr < r.h; dr++) {
          for (let dc = 0; dc < r.w; dc++) {
            const row = r.r + dr;
            const col = r.c + dc;
            assert.ok(row >= 0 && row < lvl.height);
            assert.ok(col >= 0 && col < lvl.width);
            assert.equal(grid[row][col], false, `Cell (${row}, ${col}) cannot be double-tiled`);
            grid[row][col] = true;
          }
        }
      });
      assert.ok(grid.every(row => row.every(c => c === true)), 'Every cell must be partitioned');

      // Verify solution matches all rules
      const engine = new HeyawakeEngine(lvl.width, lvl.height, lvl.rooms);
      const val = engine.validate(lvl.solution);
      assert.equal(val.isSolved, true, `Level ${lvl.id} solution must be 100% valid`);

      // Verify solver finds the solution
      const sols = engine.solve(2, 25000);
      assert.equal(sols.length, 1, `Level ${lvl.id} "${lvl.name}" must have a strictly unique solution`);
    });
  }
});

test('HeyawakeEngine - Deductive Hint Engine', () => {
  const lvl1 = levels[0];
  const engine = new HeyawakeEngine(lvl1.width, lvl1.height, lvl1.rooms);

  // Empty board: hint provides guidance
  const emptyBoard = Array.from({ length: lvl1.height }, () => new Array(lvl1.width).fill(0));
  const hint1 = engine.getHint(emptyBoard, lvl1.solution);
  assert.ok(hint1.message.length > 0);

  // Board with adjacent black stones: hint flags error
  emptyBoard[0][0] = 1;
  emptyBoard[0][1] = 1;
  const hintErr = engine.getHint(emptyBoard, lvl1.solution);
  assert.equal(hintErr.type, 'error');
  assert.ok(hintErr.message.includes('adjacent') || hintErr.message.includes('touch'));
});
