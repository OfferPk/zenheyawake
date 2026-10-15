/**
 * ZenHeyawake - Pure Heyawake Logic Engine (ヘヤワケ)
 * Rules:
 * 1. The grid is divided into rectangular rooms.
 * 2. Numbered rooms indicate the exact count of black painted cells (stones) in that room.
 *    Rooms with no clue (null or -1) can contain any count.
 * 3. Black stones cannot share an orthogonal edge (no horizontal/vertical adjacency).
 * 4. All white cells must form a single connected orthogonal component.
 * 5. A straight horizontal or vertical line of white cells cannot cross more than two rooms
 *    (a continuous line of white cells may visit at most 2 distinct rooms).
 */

class HeyawakeEngine {
  constructor(width, height, rooms) {
    this.width = width;
    this.height = height;
    this.rooms = rooms.map((r, idx) => ({
      id: r.id !== undefined ? r.id : idx,
      r: r.r,
      c: r.c,
      w: r.w,
      h: r.h,
      clue: r.clue !== undefined ? r.clue : null,
      name: r.name || `Room ${idx + 1}`
    }));

    // Precalculate grid cell to room mapping
    this.cellToRoom = new Array(height * width);
    for (const room of this.rooms) {
      for (let dr = 0; dr < room.h; dr++) {
        for (let dc = 0; dc < room.w; dc++) {
          const r = room.r + dr;
          const c = room.c + dc;
          if (r >= 0 && r < height && c >= 0 && c < width) {
            this.cellToRoom[r * width + c] = room.id;
          }
        }
      }
    }
  }

  getRoomId(r, c) {
    if (r < 0 || r >= this.height || c < 0 || c >= this.width) return -1;
    return this.cellToRoom[r * this.width + c];
  }

  getRoom(roomId) {
    return this.rooms.find(r => r.id === roomId) || null;
  }

  getRoomCells(roomId) {
    const room = this.getRoom(roomId);
    if (!room) return [];
    const cells = [];
    for (let dr = 0; dr < room.h; dr++) {
      for (let dc = 0; dc < room.w; dc++) {
        cells.push({ r: room.r + dr, c: room.c + dc });
      }
    }
    return cells;
  }

  /**
   * Validate room clue counts.
   * board: 2D array [r][c], 1 = black, 2 = dot/white, 0 = unassigned
   */
  validateRoomCounts(board) {
    const roomStatus = {};
    let allValid = true;
    let allSatisfied = true;

    for (const room of this.rooms) {
      let blackCount = 0;
      let whiteCount = 0;
      let emptyCount = 0;
      const totalCells = room.w * room.h;

      for (let dr = 0; dr < room.h; dr++) {
        for (let dc = 0; dc < room.w; dc++) {
          const val = board[room.r + dr][room.c + dc];
          if (val === 1) blackCount++;
          else if (val === 2) whiteCount++;
          else emptyCount++;
        }
      }

      const hasClue = room.clue !== null && room.clue >= 0;
      const target = hasClue ? room.clue : null;

      let satisfied = true;
      let violated = false;

      if (hasClue) {
        if (blackCount > target) {
          violated = true;
          satisfied = false;
        } else if (blackCount === target) {
          satisfied = true;
        } else {
          // blackCount < target
          satisfied = false;
          // If remaining cells cannot even reach target
          if (blackCount + emptyCount < target) {
            violated = true;
          }
        }
      }

      if (violated) allValid = false;
      if (!satisfied) allSatisfied = false;

      roomStatus[room.id] = {
        roomId: room.id,
        target,
        blackCount,
        whiteCount,
        emptyCount,
        totalCells,
        satisfied,
        violated
      };
    }

    return { allValid, allSatisfied, roomStatus };
  }

  /**
   * Check rule 3: No two black stones share an orthogonal edge.
   */
  validateAdjacentBlack(board) {
    const violations = [];
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (board[r][c] === 1) {
          // Check right
          if (c + 1 < this.width && board[r][c + 1] === 1) {
            violations.push([{ r, c }, { r, c: c + 1 }]);
          }
          // Check down
          if (r + 1 < this.height && board[r + 1][c] === 1) {
            violations.push([{ r, c }, { r: r + 1, c }]);
          }
        }
      }
    }
    return {
      valid: violations.length === 0,
      violations
    };
  }

  /**
   * Check rule 4: All white cells form a single connected component.
   * Any cell that is not 1 (black) is treated as white.
   */
  validateWhiteConnectivity(board) {
    const visited = Array.from({ length: this.height }, () => new Array(this.width).fill(false));
    let totalWhite = 0;
    let startCell = null;

    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (board[r][c] !== 1) {
          totalWhite++;
          if (!startCell) startCell = { r, c };
        }
      }
    }

    if (totalWhite === 0) {
      return { valid: false, connectedCount: 0, totalWhite: 0, disconnectedCells: [] };
    }

    // BFS from startCell
    let reached = 0;
    const queue = [startCell];
    visited[startCell.r][startCell.c] = true;

    while (queue.length > 0) {
      const { r, c } = queue.shift();
      reached++;

      const neighbors = [
        { r: r - 1, c },
        { r: r + 1, c },
        { r, c: c - 1 },
        { r, c: c + 1 }
      ];

      for (const nb of neighbors) {
        if (nb.r >= 0 && nb.r < this.height && nb.c >= 0 && nb.c < this.width) {
          if (!visited[nb.r][nb.c] && board[nb.r][nb.c] !== 1) {
            visited[nb.r][nb.c] = true;
            queue.push(nb);
          }
        }
      }
    }

    const disconnectedCells = [];
    if (reached < totalWhite) {
      for (let r = 0; r < this.height; r++) {
        for (let c = 0; c < this.width; c++) {
          if (board[r][c] !== 1 && !visited[r][c]) {
            disconnectedCells.push({ r, c });
          }
        }
      }
    }

    return {
      valid: reached === totalWhite,
      connectedCount: reached,
      totalWhite,
      disconnectedCells
    };
  }

  /**
   * Check rule 5: Corridor constraint.
   * A straight line of white cells cannot cross through more than two rooms.
   * Any maximal contiguous white sequence along a row or col can visit at most 2 distinct rooms.
   */
  validateCorridors(board) {
    const violations = [];

    // Horizontal check
    for (let r = 0; r < this.height; r++) {
      let c = 0;
      while (c < this.width) {
        if (board[r][c] === 1) {
          c++;
          continue;
        }

        // Start of a contiguous white segment
        const segment = [];
        const roomsVisited = [];
        let prevRoom = null;

        while (c < this.width && board[r][c] !== 1) {
          const roomId = this.getRoomId(r, c);
          segment.push({ r, c, roomId });
          if (roomId !== prevRoom) {
            roomsVisited.push(roomId);
            prevRoom = roomId;
          }
          c++;
        }

        if (roomsVisited.length > 2) {
          violations.push({
            dir: 'H',
            r,
            startC: segment[0].c,
            endC: segment[segment.length - 1].c,
            cells: segment,
            roomsVisited
          });
        }
      }
    }

    // Vertical check
    for (let c = 0; c < this.width; c++) {
      let r = 0;
      while (r < this.height) {
        if (board[r][c] === 1) {
          r++;
          continue;
        }

        // Start of a contiguous white segment
        const segment = [];
        const roomsVisited = [];
        let prevRoom = null;

        while (r < this.height && board[r][c] !== 1) {
          const roomId = this.getRoomId(r, c);
          segment.push({ r, c, roomId });
          if (roomId !== prevRoom) {
            roomsVisited.push(roomId);
            prevRoom = roomId;
          }
          r++;
        }

        if (roomsVisited.length > 2) {
          violations.push({
            dir: 'V',
            c,
            startR: segment[0].r,
            endR: segment[segment.length - 1].r,
            cells: segment,
            roomsVisited
          });
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  /**
   * Full validation of the board.
   */
  validate(board) {
    const roomResult = this.validateRoomCounts(board);
    const adjacentResult = this.validateAdjacentBlack(board);
    const connectivityResult = this.validateWhiteConnectivity(board);
    const corridorResult = this.validateCorridors(board);

    const isSolved =
      roomResult.allSatisfied &&
      roomResult.allValid &&
      adjacentResult.valid &&
      connectivityResult.valid &&
      corridorResult.valid;

    return {
      isSolved,
      roomResult,
      adjacentResult,
      connectivityResult,
      corridorResult
    };
  }

  /**
   * Solves the puzzle using recursive backtracking with constraint propagation.
   * Returns up to maxSolutions solutions.
   */
  solve(maxSolutions = 2, maxSteps = 50000) {
    const H = this.height;
    const W = this.width;
    const solutions = [];
    let stepCount = 0;

    // board: 0 = unassigned, 1 = black, 2 = white
    const board = Array.from({ length: H }, () => new Array(W).fill(0));

    // Room tracking: current count of blacks and whites
    const roomState = this.rooms.map(r => ({
      clue: r.clue,
      totalCells: r.w * r.h,
      blacks: 0,
      whites: 0
    }));

    // Corridor checking helper during search:
    // When we set cell (r, c) = white, check if horizontal or vertical white corridor visits > 2 rooms.
    const canBeWhite = (r, c) => {
      // Temporary place white
      board[r][c] = 2;

      // Check horizontal segment containing (r, c)
      let c1 = c;
      while (c1 > 0 && board[r][c1 - 1] === 2) c1--;
      let c2 = c;
      while (c2 + 1 < W && board[r][c2 + 1] === 2) c2++;

      let hRooms = 0;
      let prevHRoom = -1;
      for (let curC = c1; curC <= c2; curC++) {
        const rm = this.getRoomId(r, curC);
        if (rm !== prevHRoom) {
          hRooms++;
          prevHRoom = rm;
        }
      }
      if (hRooms > 2) {
        board[r][c] = 0;
        return false;
      }

      // Check vertical segment containing (r, c)
      let r1 = r;
      while (r1 > 0 && board[r1 - 1][c] === 2) r1--;
      let r2 = r;
      while (r2 + 1 < H && board[r2 + 1][c] === 2) r2++;

      let vRooms = 0;
      let prevVRoom = -1;
      for (let curR = r1; curR <= r2; curR++) {
        const rm = this.getRoomId(curR, c);
        if (rm !== prevVRoom) {
          vRooms++;
          prevVRoom = rm;
        }
      }
      if (vRooms > 2) {
        board[r][c] = 0;
        return false;
      }

      board[r][c] = 0;
      return true;
    };

    const canBeBlack = (r, c) => {
      // Check orthogonal neighbors are not black
      if (r > 0 && board[r - 1][c] === 1) return false;
      if (r + 1 < H && board[r + 1][c] === 1) return false;
      if (c > 0 && board[r][c - 1] === 1) return false;
      if (c + 1 < W && board[r][c + 1] === 1) return false;

      // Check room clue
      const rmId = this.getRoomId(r, c);
      const st = roomState[rmId];
      if (st.clue !== null && st.clue >= 0) {
        if (st.blacks + 1 > st.clue) return false;
      }

      return true;
    };

    const backtrack = (idx) => {
      if (solutions.length >= maxSolutions) return;
      if (++stepCount > maxSteps) return;

      if (idx === H * W) {
        // Complete board: verify full white connectivity and corridors
        if (this.validateWhiteConnectivity(board).valid && this.validateCorridors(board).valid) {
          // Verify all room clues
          let allSatisfied = true;
          for (let i = 0; i < roomState.length; i++) {
            if (roomState[i].clue !== null && roomState[i].clue >= 0) {
              if (roomState[i].blacks !== roomState[i].clue) {
                allSatisfied = false;
                break;
              }
            }
          }
          if (allSatisfied) {
            solutions.push(board.map(row => [...row]));
          }
        }
        return;
      }

      const r = Math.floor(idx / W);
      const c = idx % W;
      const rmId = this.getRoomId(r, c);
      const st = roomState[rmId];

      // Prune if room clue cannot be satisfied
      if (st.clue !== null && st.clue >= 0) {
        const remainingInRoom = st.totalCells - (st.blacks + st.whites);
        if (st.blacks + remainingInRoom < st.clue) return; // Cannot reach target
        if (st.blacks > st.clue) return; // Exceeded target
      }

      // Try assigning: Black (1) or White (2)
      // Heuristic: If room clue is full, only try White. If remaining in room == needed blacks, only try Black.
      let tryBlack = canBeBlack(r, c);
      let tryWhite = canBeWhite(r, c);

      if (st.clue !== null && st.clue >= 0) {
        if (st.blacks === st.clue) {
          tryBlack = false;
        }
        const remainingInRoom = st.totalCells - (st.blacks + st.whites);
        if (st.blacks + remainingInRoom === st.clue) {
          tryWhite = false;
        }
      }

      // Try White first (statistically most cells are white)
      if (tryWhite) {
        board[r][c] = 2;
        st.whites++;
        backtrack(idx + 1);
        st.whites--;
        board[r][c] = 0;
      }

      if (tryBlack && solutions.length < maxSolutions) {
        board[r][c] = 1;
        st.blacks++;
        backtrack(idx + 1);
        st.blacks--;
        board[r][c] = 0;
      }
    };

    backtrack(0);
    return solutions;
  }

  /**
   * Generates a deductive hint for the current board state.
   */
  getHint(board, solution) {
    const validation = this.validate(board);

    // 1. Detect immediate critical violations
    if (!validation.adjacentResult.valid) {
      const pair = validation.adjacentResult.violations[0];
      return {
        type: 'error',
        message: `Black stones cannot touch orthogonally! Check cells (${pair[0].r + 1}, ${pair[0].c + 1}) and (${pair[1].r + 1}, ${pair[1].c + 1}).`,
        cells: [pair[0], pair[1]]
      };
    }

    if (validation.corridorResult.violations.length > 0) {
      const corr = validation.corridorResult.violations[0];
      const dirName = corr.dir === 'H' ? 'horizontal' : 'vertical';
      return {
        type: 'error',
        message: `A straight ${dirName} white corridor visits ${corr.roomsVisited.length} rooms (max allowed is 2). A black stone is needed to break this corridor!`,
        cells: corr.cells
      };
    }

    // 2. Room Clue Deductions
    for (const room of this.rooms) {
      if (room.clue !== null && room.clue >= 0) {
        const cells = this.getRoomCells(room.id);
        let blackCount = 0;
        let whiteCount = 0;
        const unassigned = [];

        for (const cell of cells) {
          const val = board[cell.r][cell.c];
          if (val === 1) blackCount++;
          else if (val === 2) whiteCount++;
          else unassigned.push(cell);
        }

        // Over-count
        if (blackCount > room.clue) {
          return {
            type: 'error',
            message: `${room.name} requires ${room.clue} black stones, but has ${blackCount}! Remove an excess stone.`,
            cells
          };
        }

        // Room is filled: all remaining must be white
        if (blackCount === room.clue && unassigned.length > 0) {
          return {
            type: 'deduction',
            message: `${room.name} already has all ${room.clue} black stones. All remaining cells in this room must be white!`,
            cells: unassigned,
            recommendedState: 2
          };
        }

        // Remaining unassigned cells exactly equal needed black stones
        const needed = room.clue - blackCount;
        if (needed > 0 && unassigned.length === needed) {
          return {
            type: 'deduction',
            message: `${room.name} needs ${needed} more black stone(s) and only has ${unassigned.length} empty cell(s) left. They must all be black!`,
            cells: unassigned,
            recommendedState: 1
          };
        }
      }
    }

    // 3. Orthogonal neighbors of black stones must be white
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (board[r][c] === 1) {
          const nbs = [
            { r: r - 1, c },
            { r: r + 1, c },
            { r, c: c - 1 },
            { r, c: c + 1 }
          ].filter(nb => nb.r >= 0 && nb.r < this.height && nb.c >= 0 && nb.c < this.width && board[nb.r][nb.c] === 0);

          if (nbs.length > 0) {
            return {
              type: 'deduction',
              message: `Cells adjacent to a black stone must be white (dot). Check cell (${nbs[0].r + 1}, ${nbs[0].c + 1}).`,
              cells: [nbs[0]],
              recommendedState: 2
            };
          }
        }
      }
    }

    // 4. Fallback to precomputed / solver solution if provided
    if (solution) {
      for (let r = 0; r < this.height; r++) {
        for (let c = 0; c < this.width; c++) {
          const cur = board[r][c];
          const sol = solution[r][c];
          if (cur === 0) {
            const targetState = sol === 1 ? 1 : 2;
            const stateName = sol === 1 ? 'black stone' : 'white cell (dot)';
            return {
              type: 'guide',
              message: `Consider cell (${r + 1}, ${c + 1}): logic dictates it should be a ${stateName}.`,
              cells: [{ r, c }],
              recommendedState: targetState
            };
          } else if (cur !== sol && (cur === 1 || (cur === 2 && sol === 1))) {
            return {
              type: 'correction',
              message: `Cell (${r + 1}, ${c + 1}) appears incorrect. Re-evaluate room borders and corridor lengths here.`,
              cells: [{ r, c }]
            };
          }
        }
      }
    }

    return {
      type: 'info',
      message: 'All current marks look harmonious! Keep weaving your deductions.',
      cells: []
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HeyawakeEngine;
}
if (typeof window !== 'undefined') {
  window.HeyawakeEngine = HeyawakeEngine;
}
