const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const startBtn = document.getElementById('start-btn');

const BLOCK_SIZE = 20;
const COLS = 12;
const ROWS = 20;

let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let score = 0;
let level = 1;
let highScore = localStorage.getItem('tetris_high_score') || 0;
let isPlaying = false;
let dropInterval = 1000;
let dropCounter = 0;
let lastTime = 0;

highScoreEl.textContent = highScore;

// Warna Bentuk Tetromino
const COLORS = [
  null,
  '#38bdf8', // I - Cyan
  '#fbbf24', // O - Yellow
  '#c084fc', // T - Purple
  '#34d399', // S - Green
  '#f87171', // Z - Red
  '#60a5fa', // J - Blue
  '#fb923c'  // L - Orange
];

const SHAPES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                   // T
  [[0,4,4],[4,4,0],[0,0,0]],                   // S
  [[5,5,0],[0,5,5],[0,0,0]],                   // Z
  [[6,0,0],[6,6,6],[0,0,0]],                   // J
  [[0,0,7],[7,7,7],[0,0,0]]                    // L
];

let player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  shapeIndex: 0
};

let nextPiece = {
  matrix: null,
  shapeIndex: 0
};

function createPiece(type) {
  return SHAPES[type];
}

function getRandomShapeIndex() {
  return Math.floor(Math.random() * 7) + 1;
}

function spawnPiece() {
  if (nextPiece.matrix === null) {
    player.shapeIndex = getRandomShapeIndex();
    player.matrix = createPiece(player.shapeIndex);
  } else {
    player.shapeIndex = nextPiece.shapeIndex;
    player.matrix = nextPiece.matrix;
  }

  nextPiece.shapeIndex = getRandomShapeIndex();
  nextPiece.matrix = createPiece(nextPiece.shapeIndex);

  player.pos.y = 0;
  player.pos.x = Math.floor((COLS - player.matrix[0].length) / 2);

  if (checkCollision(player.matrix, player.pos)) {
    endGame();
  }
}

function checkCollision(matrix, pos) {
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] !== 0) {
        let boardX = pos.x + c;
        let boardY = pos.y + r;

        if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
          return true;
        }
        if (boardY >= 0 && board[boardY][boardX] !== 0) {
          return true;
        }
      }
    }
  }
  return false;
}

function mergePiece() {
  player.matrix.forEach((row, r) => {
    row.forEach((value, c) => {
      if (value !== 0) {
        if (player.pos.y + r >= 0) {
          board[player.pos.y + r][player.pos.x + c] = player.shapeIndex;
        }
      }
    });
  });
}

function rotateMatrix(matrix) {
  const N = matrix.length;
  let rotated = Array.from({ length: N }, () => Array(N).fill(0));
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      rotated[c][N - 1 - r] = matrix[r][c];
    }
  }
  return rotated;
}

function playerRotate() {
  const oldX = player.pos.x;
  let offset = 1;
  player.matrix = rotateMatrix(player.matrix);
  while (checkCollision(player.matrix, player.pos)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      player.matrix = rotateMatrix(rotateMatrix(rotateMatrix(player.matrix))); // Putar balik
      player.pos.x = oldX;
      return;
    }
  }
}

function clearLines() {
  let rowCount = 0;
  outer: for (let r = ROWS - 1; r >= 0; r--) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === 0) {
        continue outer;
      }
    }
    const row = board.splice(r, 1)[0].fill(0);
    board.unshift(row);
    r++;
    rowCount++;
  }

  if (rowCount > 0) {
    score += rowCount * 100 * level;
    scoreEl.textContent = score;

    level = Math.floor(score / 500) + 1;
    levelEl.textContent = level;
    dropInterval = Math.max(100, 1000 - (level - 1) * 100);

    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = highScore;
      localStorage.setItem('tetris_high_score', highScore);
    }
  }
}

function playerDrop() {
  player.pos.y++;
  if (checkCollision(player.matrix, player.pos)) {
    player.pos.y--;
    mergePiece();
    clearLines();
    spawnPiece();
  }
  dropCounter = 0;
}

function playerHardDrop() {
  while (!checkCollision(player.matrix, player.pos)) {
    player.pos.y++;
  }
  player.pos.y--;
  mergePiece();
  clearLines();
  spawnPiece();
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (checkCollision(player.matrix, player.pos)) {
    player.pos.x -= dir;
  }
}

function drawBlock(context, x, y, colorIndex, size = BLOCK_SIZE) {
  context.fillStyle = COLORS[colorIndex];
  context.fillRect(x * size, y * size, size - 1, size - 1);
}

function draw() {
  ctx.fillStyle = '#070d1d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Gambar papan permainan
  board.forEach((row, r) => {
    row.forEach((value, c) => {
      if (value !== 0) {
        drawBlock(ctx, c, r, value);
      }
    });
  });

  // Gambar balok aktif
  if (player.matrix) {
    player.matrix.forEach((row, r) => {
      row.forEach((value, c) => {
        if (value !== 0) {
          drawBlock(ctx, player.pos.x + c, player.pos.y + r, player.shapeIndex);
        }
      });
    });
  }

  // Gambar preview next piece
  nextCtx.fillStyle = '#070d1d';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (nextPiece.matrix) {
    const size = 18;
    const m = nextPiece.matrix;
    const offsetX = (nextCanvas.width - m[0].length * size) / 2 / size;
    const offsetY = (nextCanvas.height - m.length * size) / 2 / size;
    m.forEach((row, r) => {
      row.forEach((value, c) => {
        if (value !== 0) {
          drawBlock(nextCtx, offsetX + c, offsetY + r, nextPiece.shapeIndex, size);
        }
      });
    });
  }
}

function update(time = 0) {
  if (!isPlaying) return;

  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;

  if (dropCounter > dropInterval) {
    playerDrop();
  }

  draw();
  requestAnimationFrame(update);
}

function startGame() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  score = 0;
  level = 1;
  scoreEl.textContent = score;
  levelEl.textContent = level;
  dropInterval = 1000;

  nextPiece.matrix = null;
  spawnPiece();

  isPlaying = true;
  overlay.classList.add('hidden');
  lastTime = performance.now();
  requestAnimationFrame(update);
}

function endGame() {
  isPlaying = false;
  overlayTitle.textContent = 'Game Over!';
  overlayMsg.textContent = `Skor akhir Anda: ${score}`;
  startBtn.textContent = 'Main Lagi';
  overlay.classList.remove('hidden');
}

// Keyboard Controls
document.addEventListener('keydown', (e) => {
  if (!isPlaying) {
    if (e.code === 'Space' || e.code === 'Enter') startGame();
    return;
  }

  if (e.key === 'ArrowLeft') {
    playerMove(-1);
  } else if (e.key === 'ArrowRight') {
    playerMove(1);
  } else if (e.key === 'ArrowDown') {
    playerDrop();
  } else if (e.key === 'ArrowUp' || e.key === 'x' || e.key === 'X') {
    playerRotate();
  } else if (e.code === 'Space') {
    playerHardDrop();
  }
});

// Mobile Controls
document.getElementById('btn-left').addEventListener('click', () => isPlaying && playerMove(-1));
document.getElementById('btn-right').addEventListener('click', () => isPlaying && playerMove(1));
document.getElementById('btn-down').addEventListener('click', () => isPlaying && playerDrop());
document.getElementById('btn-rotate').addEventListener('click', () => isPlaying && playerRotate());
document.getElementById('btn-drop').addEventListener('click', () => isPlaying && playerHardDrop());

startBtn.addEventListener('click', startGame);

// Initial draw
draw();