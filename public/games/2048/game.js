const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const tileContainer = document.getElementById('tileContainer');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const restartBtn = document.getElementById('restart-btn');
const modeNormalBtn = document.getElementById('mode-normal');
const modeEasyBtn = document.getElementById('mode-easy');

let grid = Array.from({ length: 4 }, () => Array(4).fill(0));
let score = 0;
let highScore = localStorage.getItem('2048_high_score') || 0;
let isPlaying = true;
let gameMode = 'normal'; // 'normal' atau 'easy'

highScoreEl.textContent = highScore;

function initGame() {
  grid = Array.from({ length: 4 }, () => Array(4).fill(0));
  score = 0;
  scoreEl.textContent = score;
  isPlaying = true;
  overlay.classList.add('hidden');

  addRandomTile();
  addRandomTile();
  renderBoard();
}

function addRandomTile() {
  let emptyCells = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) emptyCells.push({ r, c });
    }
  }

  if (emptyCells.length > 0) {
    let { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];

    if (gameMode === 'easy') {
      // Mode Easy: Hanya memunculkan angka 2
      grid[r][c] = 2;
    } else {
      // Mode Normal: Random angka antara 2, 4, 8, dan 16 dengan bobot peluang
      const rand = Math.random();
      if (rand < 0.60) {
        grid[r][c] = 2;   // 60% peluang muncul angka 2
      } else if (rand < 0.85) {
        grid[r][c] = 4;   // 25% peluang muncul angka 4
      } else if (rand < 0.95) {
        grid[r][c] = 8;   // 10% peluang muncul angka 8
      } else {
        grid[r][c] = 16;  // 5% peluang muncul angka 16
      }
    }
  }
}

function renderBoard() {
  tileContainer.innerHTML = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let val = grid[r][c];
      if (val !== 0) {
        let tile = document.createElement('div');
        tile.className = `tile tile-${val}`;
        tile.textContent = val;

        let left = c * (76.5 + 10);
        let top = r * (76.5 + 10);
        tile.style.left = `${left}px`;
        tile.style.top = `${top}px`;

        tileContainer.appendChild(tile);
      }
    }
  }
}

function slideRow(row) {
  let arr = row.filter(val => val !== 0);
  let newRow = [];
  let i = 0;

  while (i < arr.length) {
    if (i + 1 < arr.length && arr[i] === arr[i + 1]) {
      let mergedVal = arr[i] * 2;
      newRow.push(mergedVal);
      score += mergedVal;
      i += 2;
    } else {
      newRow.push(arr[i]);
      i++;
    }
  }

  while (newRow.length < 4) {
    newRow.push(0);
  }
  return newRow;
}

function rotateGrid(matrix, times) {
  let res = matrix;
  for (let t = 0; t < times; t++) {
    let n = res.length;
    let rotated = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        rotated[c][n - 1 - r] = res[r][c];
      }
    }
    res = rotated;
  }
  return res;
}

function move(direction) {
  if (!isPlaying) return;

  let rotatedGrid = grid;
  if (direction === 'UP') rotatedGrid = rotateGrid(grid, 3);
  else if (direction === 'RIGHT') rotatedGrid = rotateGrid(grid, 2);
  else if (direction === 'DOWN') rotatedGrid = rotateGrid(grid, 1);

  let hasChanged = false;
  let newGrid = rotatedGrid.map(row => {
    let slided = slideRow(row);
    if (JSON.stringify(slided) !== JSON.stringify(row)) hasChanged = true;
    return slided;
  });

  if (direction === 'UP') newGrid = rotateGrid(newGrid, 1);
  else if (direction === 'RIGHT') newGrid = rotateGrid(newGrid, 2);
  else if (direction === 'DOWN') newGrid = rotateGrid(newGrid, 3);

  if (hasChanged) {
    grid = newGrid;
    addRandomTile();
    renderBoard();

    scoreEl.textContent = score;
    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = highScore;
      localStorage.setItem('2048_high_score', highScore);
    }

    if (checkGameOver()) {
      isPlaying = false;
      overlayTitle.textContent = 'Game Over!';
      overlayMsg.textContent = `Skor akhir Anda: ${score}`;
      overlay.classList.remove('hidden');
    }
  }
}

function checkGameOver() {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) return false;
      if (c < 3 && grid[r][c] === grid[r][c + 1]) return false;
      if (r < 3 && grid[r][c] === grid[r + 1][c]) return false;
    }
  }
  return true;
}

function setGameMode(mode) {
  gameMode = mode;
  if (mode === 'normal') {
    modeNormalBtn.classList.add('active');
    modeEasyBtn.classList.remove('active');
  } else {
    modeEasyBtn.classList.add('active');
    modeNormalBtn.classList.remove('active');
  }
  initGame();
}

document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowLeft':
    case 'a':
      e.preventDefault();
      move('LEFT');
      break;
    case 'ArrowUp':
    case 'w':
      e.preventDefault();
      move('UP');
      break;
    case 'ArrowRight':
    case 'd':
      e.preventDefault();
      move('RIGHT');
      break;
    case 'ArrowDown':
    case 's':
      e.preventDefault();
      move('DOWN');
      break;
  }
});

document.getElementById('btn-left').addEventListener('click', () => move('LEFT'));
document.getElementById('btn-up').addEventListener('click', () => move('UP'));
document.getElementById('btn-right').addEventListener('click', () => move('RIGHT'));
document.getElementById('btn-down').addEventListener('click', () => move('DOWN'));

restartBtn.addEventListener('click', initGame);
modeNormalBtn.addEventListener('click', () => setGameMode('normal'));
modeEasyBtn.addEventListener('click', () => setGameMode('easy'));

initGame();